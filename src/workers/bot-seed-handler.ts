import type { BotSeedRunStatus, BotSeedTriggerType } from "@prisma/client";
import { selectDailyPersonas } from "@/entities/bot-persona/model/select-daily-personas";
import { prisma } from "@/lib/prisma";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

type ProcessBotSeedJobArgs = {
  dayKey?: string;
  triggerType?: BotSeedTriggerType;
};

type ProcessBotSeedJobResult = {
  dayKey: string;
  selectedCount: number;
  status: BotSeedRunStatus;
};

function normalizeDayKey(dayKey?: string) {
  const trimmed = dayKey?.toString().trim();
  return trimmed || formatDayKeyForKST();
}

function normalizeTriggerType(triggerType?: BotSeedTriggerType) {
  return triggerType === "ADMIN" ? "ADMIN" : "SCHEDULE";
}

export async function processBotSeedJob(
  args: ProcessBotSeedJobArgs = {},
): Promise<ProcessBotSeedJobResult> {
  const dayKey = normalizeDayKey(args.dayKey);
  const triggerType = normalizeTriggerType(args.triggerType);

  const personas = await prisma.botPersona.findMany({
    where: { isActive: true },
    orderBy: { personaKey: "asc" },
    select: {
      personaKey: true,
      styleGroup: true,
      isActive: true,
    },
  });

  const { selected } = selectDailyPersonas({
    dayKey,
    personas,
  });

  const selectedCount = selected.length;
  const selectedStatus: BotSeedRunStatus = selectedCount > 0 ? "PENDING" : "FAILED";

  await prisma.$transaction(async (tx) => {
    const now = new Date();

    const seedRun = await tx.botSeedRun.upsert({
      where: { dayKey },
      update: {
        triggerType,
        status: "RUNNING",
        selectedCount,
        successCount: 0,
        startedAt: now,
        finishedAt: null,
      },
      create: {
        dayKey,
        triggerType,
        status: "RUNNING",
        selectedCount,
        successCount: 0,
        startedAt: now,
      },
      select: { id: true },
    });

    await tx.botSeedItem.deleteMany({
      where: { seedRunId: seedRun.id },
    });

    if (selectedCount > 0) {
      await tx.botSeedItem.createMany({
        data: selected.map((persona, index) => ({
          seedRunId: seedRun.id,
          personaKey: persona.personaKey,
          selectedOrder: index + 1,
          attempt: 1,
          status: "SELECTED",
        })),
      });
    }

    await tx.botSeedRun.update({
      where: { id: seedRun.id },
      data: {
        status: selectedStatus,
        finishedAt: selectedStatus === "FAILED" ? now : null,
      },
    });
  });

  return {
    dayKey,
    selectedCount,
    status: selectedStatus,
  };
}
