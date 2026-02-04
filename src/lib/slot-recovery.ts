import { type DailySlotCounter, Prisma, type SlotReservation } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const decrementFieldBySlotType = (slotType: SlotReservation["slotType"]) =>
  slotType === "FREE" ? { freeUsedCount: { decrement: 1 } } : { adUsedCount: { decrement: 1 } };

async function safeDecrementDailySlotCounter(
  tx: Prisma.TransactionClient,
  args: { dayKey: string; slotType: SlotReservation["slotType"] },
) {
  const { dayKey, slotType } = args;
  const data = decrementFieldBySlotType(slotType);

  const updated = await tx.dailySlotCounter.updateMany({
    where: { dayKey },
    data,
  });

  if (updated.count > 0) {
    return;
  }

  try {
    await tx.dailySlotCounter.create({
      data: {
        dayKey,
        freeUsedCount: 0,
        adUsedCount: 0,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return;
    }
    throw error;
  }
}

export async function cancelSlotReservation(reservation: SlotReservation) {
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
      data: { status: "CANCELLED" },
    });

    await safeDecrementDailySlotCounter(tx, { dayKey: latest.dayKey, slotType: latest.slotType });

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

    await safeDecrementDailySlotCounter(tx, {
      dayKey: latest.dayKey,
      slotType: latest.slotType,
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

    await safeDecrementDailySlotCounter(tx, {
      dayKey: latest.dayKey,
      slotType: latest.slotType,
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
