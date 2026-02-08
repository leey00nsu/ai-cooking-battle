import {
  generateDayThemeImageUrl,
  shouldReplaceDayThemeImageUrl,
} from "@/lib/day-theme/day-theme-image";
import { getOrCreateDayTheme } from "@/lib/day-theme/get-or-create-day-theme";
import { prisma } from "@/lib/prisma";
import {
  BOT_SEED_JOB_NAME,
  type BotSeedJobPayload,
  enqueueBotSeedJob,
  ensureBotSeedQueue,
} from "@/lib/queue/bot-seed-job";
import {
  CREATE_PIPELINE_JOB_NAME,
  CREATE_PIPELINE_QUEUE_OPTIONS,
  type CreatePipelineJobPayload,
} from "@/lib/queue/create-pipeline-job";
import {
  DAY_THEME_PRECREATE_JOB_NAME,
  type DayThemePrecreateJobPayload,
  ensureDayThemePrecreateSchedule,
} from "@/lib/queue/day-theme-precreate-job";
import { startPgBoss, stopPgBoss } from "@/lib/queue/pg-boss";
import { formatDayKeyForKST } from "@/shared/lib/day-key";
import { processBotSeedJob } from "@/workers/bot-seed-handler";
import { processCreatePipelineRequest } from "@/workers/create-pipeline-handler";

function safeDbInfo(url: string) {
  try {
    const parsed = new URL(url);
    const dbName = parsed.pathname.replace(/^\//, "").split("/")[0] ?? "";
    return {
      host: parsed.hostname,
      port: parsed.port || "",
      dbName,
    };
  } catch {
    return { host: "", port: "", dbName: "" };
  }
}

async function main() {
  const bossDbUrl = process.env.BOSS_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  const dbInfo = bossDbUrl ? safeDbInfo(bossDbUrl) : null;

  const boss = await startPgBoss();
  await boss.createQueue(CREATE_PIPELINE_JOB_NAME, CREATE_PIPELINE_QUEUE_OPTIONS);
  await ensureDayThemePrecreateSchedule(boss);
  await ensureBotSeedQueue(boss);

  await boss.work<CreatePipelineJobPayload>(
    CREATE_PIPELINE_JOB_NAME,
    { batchSize: 1 },
    async (jobs) => {
      for (const job of jobs) {
        const requestId = job.data?.requestId?.toString().trim() ?? "";
        if (!requestId) {
          throw new Error("[create-pipeline-worker] Missing requestId in job payload.");
        }

        console.log("[create-pipeline-worker] job received", { requestId, jobId: job.id });
        await processCreatePipelineRequest(requestId);
        console.log("[create-pipeline-worker] job processed", { requestId, jobId: job.id });
      }
    },
  );

  await boss.work<DayThemePrecreateJobPayload>(
    DAY_THEME_PRECREATE_JOB_NAME,
    { batchSize: 1 },
    async (jobs) => {
      for (const job of jobs) {
        const dayKey = job.data?.dayKey?.toString().trim() || formatDayKeyForKST();
        const force = job.data?.force === true;
        console.log("[day-theme-precreate] job received", { dayKey, force, jobId: job.id });

        if (force) {
          await prisma.dayTheme
            .delete({
              where: { dayKey },
            })
            .catch((error: unknown) => {
              if (!error || typeof error !== "object") {
                throw error;
              }
              const code = "code" in error ? (error as { code?: string }).code : null;
              if (code !== "P2025") {
                throw error;
              }
            });
        }

        const theme = await getOrCreateDayTheme(dayKey, { userId: null });

        if (!force && !shouldReplaceDayThemeImageUrl(theme.themeImageUrl)) {
          console.log("[day-theme-precreate] image already exists", {
            dayKey,
            imageHost: new URL(theme.themeImageUrl ?? "").host,
          });
        } else {
          try {
            const url = await generateDayThemeImageUrl({ themeTextEn: theme.themeTextEn });
            await prisma.dayTheme.update({
              where: { dayKey },
              data: { themeImageUrl: url },
            });
            console.log("[day-theme-precreate] image generated", {
              dayKey,
              imageHost: new URL(url).host,
            });
          } catch (error) {
            console.warn("[day-theme-precreate] failed to generate image", {
              dayKey,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        try {
          await enqueueBotSeedJob(
            { dayKey, triggerType: force ? "ADMIN" : "SCHEDULE" },
            force ? { singleton: false } : undefined,
          );
          console.log("[day-theme-precreate] bot-seed enqueued", { dayKey, force });
        } catch (error) {
          console.warn("[day-theme-precreate] failed to enqueue bot-seed", {
            dayKey,
            force,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        console.log("[day-theme-precreate] job processed", { dayKey, force, jobId: job.id });
      }
    },
  );

  await boss.work<BotSeedJobPayload>(BOT_SEED_JOB_NAME, { batchSize: 1 }, async (jobs) => {
    for (const job of jobs) {
      const dayKey = job.data?.dayKey?.toString().trim() || formatDayKeyForKST();
      const triggerType = job.data?.triggerType === "ADMIN" ? "ADMIN" : "SCHEDULE";

      console.log("[bot-seed] job received", { dayKey, triggerType, jobId: job.id });
      const result = await processBotSeedJob({ dayKey, triggerType });
      console.log("[bot-seed] job processed", { ...result, jobId: job.id });
    }
  });

  const shutdown = async () => {
    await stopPgBoss({ graceful: true, timeout: 30_000 });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`[create-pipeline-worker] started. queue=${CREATE_PIPELINE_JOB_NAME}`, {
    bossDbSource: process.env.BOSS_DATABASE_URL ? "BOSS_DATABASE_URL" : "DATABASE_URL",
    dbInfo,
    schedules: [{ queue: DAY_THEME_PRECREATE_JOB_NAME, tz: "Asia/Seoul", cron: "0 0 * * *" }],
    queues: [BOT_SEED_JOB_NAME],
  });
}

main().catch(async (error) => {
  console.error(error);
  await stopPgBoss({ close: true });
  process.exit(1);
});
