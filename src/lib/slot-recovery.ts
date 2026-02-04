import type { DailySlotCounter, SlotReservation } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const decrementFieldBySlotType = (slotType: SlotReservation["slotType"]) =>
  slotType === "FREE" ? { freeUsedCount: { decrement: 1 } } : { adUsedCount: { decrement: 1 } };

export async function cancelSlotReservation(reservation: SlotReservation) {
  if (reservation.status !== "RESERVED") {
    return reservation;
  }

  const updatedReservation = await prisma.$transaction(async (tx) => {
    const latest = await tx.slotReservation.findUnique({
      where: { id: reservation.id },
      select: { id: true, status: true, slotType: true, dayKey: true, adRewardId: true },
    });

    if (!latest || latest.status !== "RESERVED") {
      return latest ?? reservation;
    }

    const updated = await tx.slotReservation.update({
      where: { id: reservation.id },
      data: { status: "CANCELLED" },
    });

    await tx.dailySlotCounter.update({
      where: { dayKey: latest.dayKey },
      data: decrementFieldBySlotType(latest.slotType),
    });

    if (latest.slotType === "AD" && latest.adRewardId) {
      await tx.adReward.update({
        where: { id: latest.adRewardId },
        data: { status: "GRANTED", usedAt: null },
      });
    }

    return updated;
  });

  return updatedReservation;
}

export async function reclaimSlotReservation(reservation: SlotReservation) {
  if (reservation.status !== "RESERVED") {
    return reservation;
  }

  const updatedReservation = await prisma.$transaction(async (tx) => {
    const latest = await tx.slotReservation.findUnique({
      where: { id: reservation.id },
    });

    if (!latest || latest.status !== "RESERVED") {
      return latest ?? reservation;
    }

    const updated = await tx.slotReservation.update({
      where: { id: reservation.id },
      data: { status: "EXPIRED" },
    });

    await tx.dailySlotCounter.update({
      where: { dayKey: reservation.dayKey },
      data: decrementFieldBySlotType(reservation.slotType),
    });

    return updated;
  });

  return updatedReservation;
}

export async function markReservationFailed(reservation: SlotReservation) {
  if (reservation.status !== "RESERVED" && reservation.status !== "CONFIRMED") {
    return reservation;
  }

  const updatedReservation = await prisma.$transaction(async (tx) => {
    const latest = await tx.slotReservation.findUnique({
      where: { id: reservation.id },
    });

    if (!latest || (latest.status !== "RESERVED" && latest.status !== "CONFIRMED")) {
      return latest ?? reservation;
    }

    const updated = await tx.slotReservation.update({
      where: { id: reservation.id },
      data: { status: "FAILED" },
    });

    await tx.dailySlotCounter.update({
      where: { dayKey: reservation.dayKey },
      data: decrementFieldBySlotType(reservation.slotType),
    });

    return updated;
  });

  return updatedReservation;
}

export function hasReservationExpired(reservation: Pick<SlotReservation, "expiresAt">) {
  return reservation.expiresAt.getTime() < Date.now();
}

export function clampCounter(counter: DailySlotCounter) {
  return {
    ...counter,
    freeUsedCount: Math.max(counter.freeUsedCount, 0),
    adUsedCount: Math.max(counter.adUsedCount, 0),
  };
}
