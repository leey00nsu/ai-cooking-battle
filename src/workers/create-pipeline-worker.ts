import { getOrCreateDayTheme } from "@/lib/day-theme/get-or-create-day-theme";
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
        console.log("[day-theme-precreate] job received", { dayKey, jobId: job.id });
        await getOrCreateDayTheme(dayKey, { userId: null });
        console.log("[day-theme-precreate] job processed", { dayKey, jobId: job.id });
      }
    },
  );

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
  });
}

main().catch(async (error) => {
  console.error(error);
  await stopPgBoss({ close: true });
  process.exit(1);
});
