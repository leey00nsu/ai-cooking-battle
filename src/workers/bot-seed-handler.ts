import { type BotSeedRunStatus, type BotSeedTriggerType, Prisma } from "@prisma/client";
import { BOT_PERSONA_PICK_COUNT } from "@/entities/bot-persona/model/constants";
import { selectDailyPersonas } from "@/entities/bot-persona/model/select-daily-personas";
import { getOrCreateDayTheme } from "@/lib/day-theme/get-or-create-day-theme";
import { prisma } from "@/lib/prisma";
import { generateBotDishPromptWithOpenAi } from "@/lib/providers/openai-bot-dish-prompt-generator";
import { ProviderError } from "@/lib/providers/provider-error";
import { enqueueDishScoreJob } from "@/lib/queue/dish-score-job";
import { formatDayKeyForKST } from "@/shared/lib/day-key";
import { runDishGeneration } from "@/workers/services/run-dish-generation";

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

type PersonaGenerationResult =
  | { outcome: "SUCCESS"; nextAttempt: number }
  | { outcome: "ALREADY_SUCCEEDED"; nextAttempt: number }
  | { outcome: "CAP_REACHED"; nextAttempt: number; remainingSlots: number }
  | { outcome: "FAILED"; nextAttempt: number };

function normalizeDayKey(dayKey?: string) {
  const trimmed = dayKey?.trim();
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

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function computeSeedRunStatus(selectedCount: number, successCount: number): BotSeedRunStatus {
  return selectedCount === 0
    ? "FAILED"
    : successCount === selectedCount
      ? "SUCCEEDED"
      : successCount > 0
        ? "FAILED_PARTIAL"
        : "FAILED";
}

function buildFallbackGenerationPromptEn(args: {
  themeTextEn: string;
  personaStylePrompt: string;
}) {
  return `${args.themeTextEn}, ${args.personaStylePrompt}`.replace(/\s+/g, " ").trim();
}

async function resolveBotGenerationPrompts(args: {
  themeText: string;
  themeTextEn: string;
  persona: Pick<PersonaProfile, "displayName" | "stylePrompt" | "personaKey">;
}) {
  const fallback = {
    dishName: args.themeText.trim(),
    dishNameEn: args.themeTextEn.trim(),
    dishPromptEn: buildFallbackGenerationPromptEn({
      themeTextEn: args.themeTextEn,
      personaStylePrompt: args.persona.stylePrompt,
    }),
  };

  try {
    const generated = await generateBotDishPromptWithOpenAi({
      themeText: args.themeText,
      themeTextEn: args.themeTextEn,
      personaDisplayName: args.persona.displayName,
      personaStylePrompt: args.persona.stylePrompt,
    });
    if (generated.ok && generated.dishName && generated.dishNameEn && generated.dishPromptEn) {
      return {
        dishName: generated.dishName,
        dishNameEn: generated.dishNameEn,
        dishPromptEn: generated.dishPromptEn,
      };
    }
    return fallback;
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
    pickCount: BOT_PERSONA_PICK_COUNT,
  });

  const selectedProfiles = selected
    .map((entry) => personaByKey.get(entry.personaKey))
    .filter((entry): entry is PersonaProfile => Boolean(entry));
  const fallbackProfiles = fallback
    .map((entry) => personaByKey.get(entry.personaKey))
    .filter((entry): entry is PersonaProfile => Boolean(entry));

  await ensureBotSystemUser();

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

  let fallbackCursor = 0;
  let processingError: unknown = null;

  const countRemainingSlots = async () => {
    const succeededCountForRun = await prisma.botSeedItem.count({
      where: {
        seedRunId: seedRun.id,
        status: "SUCCEEDED",
        dishId: { not: null },
      },
    });
    return Math.max(0, BOT_PERSONA_PICK_COUNT - succeededCountForRun);
  };

  const runPersonaGeneration = async (args: {
    persona: PersonaProfile;
    selectedOrder: number;
    attemptStart: number;
  }): Promise<PersonaGenerationResult> => {
    let attempt = args.attemptStart;

    for (let retry = 0; retry < 2; retry += 1) {
      const remainingSlots = await countRemainingSlots();
      if (remainingSlots <= 0) {
        console.info("[bot-seed] stop generation because no remaining slots", {
          dayKey,
          selectedOrder: args.selectedOrder,
          personaKey: args.persona.personaKey,
          remainingSlots,
        });
        return { outcome: "CAP_REACHED", nextAttempt: attempt, remainingSlots };
      }

      const existingSucceeded = await prisma.botSeedItem.findFirst({
        where: {
          seedRunId: seedRun.id,
          selectedOrder: args.selectedOrder,
          status: "SUCCEEDED",
          dishId: { not: null },
        },
        select: { dishId: true },
      });
      if (existingSucceeded?.dishId) {
        console.info("[bot-seed] skip generation because selectedOrder already succeeded", {
          dayKey,
          selectedOrder: args.selectedOrder,
          personaKey: args.persona.personaKey,
          dishId: existingSucceeded.dishId,
          remainingSlots,
        });
        return { outcome: "ALREADY_SUCCEEDED", nextAttempt: attempt };
      }

      const botPrompts = await resolveBotGenerationPrompts({
        themeText: theme.themeText,
        themeTextEn: theme.themeTextEn,
        persona: args.persona,
      });

      try {
        const generationResult = await runDishGeneration({
          userId: BOT_SYSTEM_USER_ID,
          prompt: botPrompts.dishName,
          promptEn: botPrompts.dishPromptEn,
        });

        if (generationResult.status === "BLOCK") {
          try {
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
          } catch (writeError) {
            console.warn("[bot-seed] failed to persist BLOCK seed item.", {
              personaKey: args.persona.personaKey,
              error: normalizeErrorMessage(writeError),
            });
          }
          attempt += 1;
          continue;
        }

        const txResult = await prisma.$transaction(async (tx) => {
          // Lock one run row so concurrent workers for the same dayKey serialize success writes.
          await tx.$queryRaw`SELECT id FROM bot_seed_run WHERE id = ${seedRun.id} FOR UPDATE`;

          const alreadySucceeded = await tx.botSeedItem.findFirst({
            where: {
              seedRunId: seedRun.id,
              selectedOrder: args.selectedOrder,
              status: "SUCCEEDED",
              dishId: { not: null },
            },
            select: { dishId: true },
          });
          if (alreadySucceeded?.dishId) {
            return { state: "ALREADY_SUCCEEDED" as const, dishId: alreadySucceeded.dishId };
          }

          const succeededCountForRun = await tx.botSeedItem.count({
            where: {
              seedRunId: seedRun.id,
              status: "SUCCEEDED",
              dishId: { not: null },
            },
          });
          if (succeededCountForRun >= BOT_PERSONA_PICK_COUNT) {
            return { state: "CAP_REACHED" as const, dishId: null };
          }

          const dish = await tx.dish.create({
            data: {
              userId: BOT_SYSTEM_USER_ID,
              dishName: botPrompts.dishName,
              dishNameEn: botPrompts.dishNameEn,
              prompt: botPrompts.dishName,
              promptEn: botPrompts.dishPromptEn,
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

          return { state: "CREATED" as const, dishId: dish.id };
        });

        if (txResult.state === "CAP_REACHED") {
          console.info("[bot-seed] stop generation because cap reached", {
            dayKey,
            selectedOrder: args.selectedOrder,
            personaKey: args.persona.personaKey,
            cap: BOT_PERSONA_PICK_COUNT,
            remainingSlots: 0,
          });
          return { outcome: "CAP_REACHED", nextAttempt: attempt, remainingSlots: 0 };
        }

        if (txResult.state === "ALREADY_SUCCEEDED") {
          const remainingSlots = await countRemainingSlots();
          console.info(
            "[bot-seed] skip generation in transaction because selectedOrder already succeeded",
            {
              dayKey,
              selectedOrder: args.selectedOrder,
              personaKey: args.persona.personaKey,
              remainingSlots,
            },
          );
          return { outcome: "ALREADY_SUCCEEDED", nextAttempt: attempt };
        }

        const dishId = txResult.dishId;
        if (!dishId) {
          return { outcome: "FAILED", nextAttempt: attempt };
        }

        try {
          await enqueueDishScoreJob({ dishId, dayKey });
        } catch (enqueueError) {
          console.warn("[bot-seed] failed to enqueue dish-score", {
            dayKey,
            dishId,
            personaKey: args.persona.personaKey,
            error: normalizeErrorMessage(enqueueError),
          });
        }

        return { outcome: "SUCCESS", nextAttempt: attempt + 1 };
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          const afterConflictSucceeded = await prisma.botSeedItem.findFirst({
            where: {
              seedRunId: seedRun.id,
              selectedOrder: args.selectedOrder,
              status: "SUCCEEDED",
              dishId: { not: null },
            },
            select: { dishId: true },
          });
          if (afterConflictSucceeded?.dishId) {
            const remainingSlots = await countRemainingSlots();
            console.info(
              "[bot-seed] skip generation after unique conflict because selectedOrder succeeded",
              {
                dayKey,
                selectedOrder: args.selectedOrder,
                personaKey: args.persona.personaKey,
                remainingSlots,
              },
            );
            return { outcome: "ALREADY_SUCCEEDED", nextAttempt: attempt + 1 };
          }
          attempt += 1;
          continue;
        }

        try {
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
        } catch (writeError) {
          console.warn("[bot-seed] failed to persist error seed item.", {
            personaKey: args.persona.personaKey,
            error: normalizeErrorMessage(writeError),
          });
        }
        attempt += 1;
      }
    }

    return { outcome: "FAILED", nextAttempt: attempt };
  };

  let capReached = false;
  try {
    for (let slotIndex = 0; slotIndex < selectedCount; slotIndex += 1) {
      const selectedOrder = slotIndex + 1;
      const selectedPersona = selectedProfiles[slotIndex];

      let attemptStart = 1;
      const primaryResult = await runPersonaGeneration({
        persona: selectedPersona,
        selectedOrder,
        attemptStart,
      });

      if (primaryResult.outcome === "SUCCESS" || primaryResult.outcome === "ALREADY_SUCCEEDED") {
        continue;
      }
      if (primaryResult.outcome === "CAP_REACHED") {
        capReached = true;
        break;
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

      if (fallbackResult.outcome === "CAP_REACHED") {
        capReached = true;
        break;
      }
    }
  } catch (error) {
    processingError = error;
  }

  if (capReached) {
    console.info("[bot-seed] loop finished early because cap was reached", {
      dayKey,
      cap: BOT_PERSONA_PICK_COUNT,
    });
  }

  const persistedSuccessCount = await prisma.botSeedItem.count({
    where: {
      seedRunId: seedRun.id,
      status: "SUCCEEDED",
      dishId: { not: null },
    },
  });
  const finalSuccessCount = persistedSuccessCount;

  // 활성 페르소나가 0개면 당일 시드 구성이 불가능하므로 실패로 기록한다.
  const status = computeSeedRunStatus(selectedCount, finalSuccessCount);

  await prisma.botSeedRun.update({
    where: { id: seedRun.id },
    data: {
      status,
      successCount: finalSuccessCount,
      finishedAt: new Date(),
    },
  });

  if (processingError) {
    throw processingError;
  }

  return {
    dayKey,
    selectedCount,
    status,
  };
}
