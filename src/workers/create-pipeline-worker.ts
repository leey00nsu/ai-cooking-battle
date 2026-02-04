import {
  CREATE_PIPELINE_JOB_NAME,
  CREATE_PIPELINE_QUEUE_OPTIONS,
  type CreatePipelineJobPayload,
} from "@/lib/queue/create-pipeline-job";
import { startPgBoss, stopPgBoss } from "@/lib/queue/pg-boss";
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

  const shutdown = async () => {
    await stopPgBoss({ graceful: true, timeout: 30_000 });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`[create-pipeline-worker] started. queue=${CREATE_PIPELINE_JOB_NAME}`, {
    bossDbSource: process.env.BOSS_DATABASE_URL ? "BOSS_DATABASE_URL" : "DATABASE_URL",
    dbInfo,
  });
}

main().catch(async (error) => {
  console.error(error);
  await stopPgBoss({ close: true });
  process.exit(1);
});
