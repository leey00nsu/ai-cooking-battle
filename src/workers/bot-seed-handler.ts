import type { BotSeedRunStatus, BotSeedTriggerType } from "@prisma/client";
import { selectDailyPersonas } from "@/entities/bot-persona/model/select-daily-personas";
import { getOrCreateDayTheme } from "@/lib/day-theme/get-or-create-day-theme";
import { prisma } from "@/lib/prisma";
import { generateBotDishPromptWithOpenAi } from "@/lib/providers/openai-bot-dish-prompt-generator";
import { ProviderError } from "@/lib/providers/provider-error";
import { formatDayKeyForKST } from "@/shared/lib/day-key";
import { runDishGeneration } from "@/workers/services/run-dish-generation";

const TARGET_BOT_PERSONA_COUNT = 5;
const BOT_SYSTEM_USER_ID = "bot-system-user";
const BOT_SYSTEM_USER_NAME = "AI Chef Bot";

type ProcessBotSeedJobArgs = {
  dayKey?: string;
  triggerType?: BotSeedTriggerType;
};

type ProcessBotSeedJobResult = {
  dayKey: string;
  selectedCount: number;
  status: BotSeedRunStatus;
};

type PersonaProfile = {
  personaKey: string;
  displayName: string;
  stylePrompt: string;
  styleGroup: string;
  isActive: boolean;
};

function normalizeDayKey(dayKey?: string) {
  const trimmed = dayKey?.toString().trim();
  return trimmed || formatDayKeyForKST();
}

function normalizeTriggerType(triggerType?: BotSeedTriggerType) {
  return triggerType === "ADMIN" ? "ADMIN" : "SCHEDULE";
}

function normalizeErrorCode(error: unknown) {
  if (error instanceof ProviderError) {
    return `${error.provider}:${error.code}`;
  }
  return "UNKNOWN_ERROR";
}

function normalizeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function buildBotPrompt(args: { themeText: string; persona: Pick<PersonaProfile, "displayName"> }) {
  return {
    // 운영/이력에서 당일 주제와 페르소나를 식별하기 위한 저장용 프롬프트
    prompt: `${args.themeText} (${args.persona.displayName})`,
  };
}

function buildFallbackGenerationPromptEn(args: {
  themeTextEn: string;
  personaStylePrompt: string;
}) {
  return `${args.themeTextEn}, ${args.personaStylePrompt}`.replace(/\s+/g, " ").trim();
}

async function resolveBotGenerationPromptEn(args: {
  themeText: string;
  themeTextEn: string;
  persona: Pick<PersonaProfile, "displayName" | "stylePrompt" | "personaKey">;
}) {
  const fallback = buildFallbackGenerationPromptEn({
    themeTextEn: args.themeTextEn,
    personaStylePrompt: args.persona.stylePrompt,
  });

  try {
    const generated = await generateBotDishPromptWithOpenAi({
      themeText: args.themeText,
      themeTextEn: args.themeTextEn,
      personaDisplayName: args.persona.displayName,
      personaStylePrompt: args.persona.stylePrompt,
    });
    return generated.dishPromptEn;
  } catch (error) {
    console.warn("[bot-seed] failed to generate bot dish prompt with openai. fallback applied.", {
      personaKey: args.persona.personaKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

async function ensureBotSystemUser() {
  await prisma.user.upsert({
    where: { id: BOT_SYSTEM_USER_ID },
    update: { name: BOT_SYSTEM_USER_NAME },
    create: {
      id: BOT_SYSTEM_USER_ID,
      name: BOT_SYSTEM_USER_NAME,
      email: null,
      image: null,
      emailVerified: false,
    },
  });
}

export async function processBotSeedJob(
  args: ProcessBotSeedJobArgs = {},
): Promise<ProcessBotSeedJobResult> {
  const dayKey = normalizeDayKey(args.dayKey);
  const triggerType = normalizeTriggerType(args.triggerType);

  const theme = await getOrCreateDayTheme(dayKey, { userId: null });
  const personas = await prisma.botPersona.findMany({
    where: { isActive: true },
    orderBy: { personaKey: "asc" },
    select: {
      personaKey: true,
      displayName: true,
      stylePrompt: true,
      styleGroup: true,
      isActive: true,
    },
  });

  const personaByKey = new Map(personas.map((persona) => [persona.personaKey, persona]));
  const { selected, fallback } = selectDailyPersonas({
    personas,
    pickCount: TARGET_BOT_PERSONA_COUNT,
  });

  const selectedProfiles = selected
    .map((entry) => personaByKey.get(entry.personaKey))
    .filter((entry): entry is PersonaProfile => Boolean(entry));
  const fallbackProfiles = fallback
    .map((entry) => personaByKey.get(entry.personaKey))
    .filter((entry): entry is PersonaProfile => Boolean(entry));

  const selectedCount = selectedProfiles.length;
  const now = new Date();

  const seedRun = await prisma.$transaction(async (tx) => {
    const run = await tx.botSeedRun.upsert({
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

    const previousItems = await tx.botSeedItem.findMany({
      where: {
        seedRunId: run.id,
        dishId: { not: null },
      },
      select: { dishId: true },
    });
    const previousDishIds = Array.from(
      new Set(previousItems.map((item) => item.dishId).filter((id): id is string => Boolean(id))),
    );

    await tx.botSeedItem.deleteMany({
      where: { seedRunId: run.id },
    });
    if (previousDishIds.length > 0) {
      await tx.dishBotMeta.deleteMany({
        where: {
          seedRunId: run.id,
          dishId: { in: previousDishIds },
        },
      });
      await tx.dishDayScore.deleteMany({
        where: {
          dayKey,
          dishId: { in: previousDishIds },
        },
      });
      await tx.dish.updateMany({
        where: {
          id: { in: previousDishIds },
          userId: BOT_SYSTEM_USER_ID,
        },
        data: { isHidden: true },
      });
    }

    return run;
  });

  await ensureBotSystemUser();

  let successCount = 0;
  let fallbackCursor = 0;

  const runPersonaGeneration = async (args: {
    persona: PersonaProfile;
    selectedOrder: number;
    attemptStart: number;
  }) => {
    let attempt = args.attemptStart;

    for (let retry = 0; retry < 2; retry += 1) {
      const storagePrompt = buildBotPrompt({
        themeText: theme.themeText,
        persona: args.persona,
      });
      const promptEn = await resolveBotGenerationPromptEn({
        themeText: theme.themeText,
        themeTextEn: theme.themeTextEn,
        persona: args.persona,
      });

      try {
        const generationResult = await runDishGeneration({
          userId: BOT_SYSTEM_USER_ID,
          prompt: storagePrompt.prompt,
          promptEn,
        });

        if (generationResult.status === "BLOCK") {
          await prisma.botSeedItem.create({
            data: {
              seedRunId: seedRun.id,
              personaKey: args.persona.personaKey,
              selectedOrder: args.selectedOrder,
              attempt,
              status: "FAILED",
              errorCode: generationResult.category || "SAFETY_BLOCKED",
              errorMessage: generationResult.reason || "Blocked by safety policy",
            },
          });
          attempt += 1;
          continue;
        }

        await prisma.$transaction(async (tx) => {
          const dish = await tx.dish.create({
            data: {
              userId: BOT_SYSTEM_USER_ID,
              prompt: storagePrompt.prompt,
              promptEn,
              imageUrl: generationResult.imageUrl,
              isHidden: false,
            },
          });

          await tx.dishDayScore.create({
            data: {
              dishId: dish.id,
              dayKey,
              totalScore: 0,
            },
          });

          await tx.dishBotMeta.create({
            data: {
              dishId: dish.id,
              dayKey,
              personaKey: args.persona.personaKey,
              seedRunId: seedRun.id,
            },
          });

          await tx.botSeedItem.create({
            data: {
              seedRunId: seedRun.id,
              personaKey: args.persona.personaKey,
              selectedOrder: args.selectedOrder,
              attempt,
              status: "SUCCEEDED",
              dishId: dish.id,
            },
          });
        });

        return { success: true as const, nextAttempt: attempt + 1 };
      } catch (error) {
        await prisma.botSeedItem.create({
          data: {
            seedRunId: seedRun.id,
            personaKey: args.persona.personaKey,
            selectedOrder: args.selectedOrder,
            attempt,
            status: "FAILED",
            errorCode: normalizeErrorCode(error),
            errorMessage: normalizeErrorMessage(error),
          },
        });
        attempt += 1;
      }
    }

    return { success: false as const, nextAttempt: attempt };
  };

  for (let slotIndex = 0; slotIndex < selectedCount; slotIndex += 1) {
    const selectedOrder = slotIndex + 1;
    const selectedPersona = selectedProfiles[slotIndex];

    let attemptStart = 1;
    const primaryResult = await runPersonaGeneration({
      persona: selectedPersona,
      selectedOrder,
      attemptStart,
    });

    if (primaryResult.success) {
      successCount += 1;
      continue;
    }

    attemptStart = primaryResult.nextAttempt;
    const fallbackPersona = fallbackProfiles[fallbackCursor];
    if (!fallbackPersona) {
      continue;
    }
    fallbackCursor += 1;

    const fallbackResult = await runPersonaGeneration({
      persona: fallbackPersona,
      selectedOrder,
      attemptStart,
    });

    if (fallbackResult.success) {
      successCount += 1;
    }
  }

  const status: BotSeedRunStatus =
    successCount === selectedCount && selectedCount > 0
      ? "SUCCEEDED"
      : successCount > 0
        ? "FAILED_PARTIAL"
        : "FAILED";

  await prisma.botSeedRun.update({
    where: { id: seedRun.id },
    data: {
      status,
      successCount,
      finishedAt: new Date(),
    },
  });

  return {
    dayKey,
    selectedCount,
    status,
  };
}
