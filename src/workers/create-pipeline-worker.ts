import { prisma } from "@/lib/prisma";
import {
  CREATE_PIPELINE_JOB_NAME,
  type CreatePipelineJobPayload,
} from "@/lib/queue/create-pipeline-job";
import { startPgBoss, stopPgBoss } from "@/lib/queue/pg-boss";

async function main() {
  const boss = await startPgBoss();
  await boss.createQueue(CREATE_PIPELINE_JOB_NAME);

  await boss.work<CreatePipelineJobPayload>(
    CREATE_PIPELINE_JOB_NAME,
    { batchSize: 1 },
    async (jobs) => {
      for (const job of jobs) {
        const requestId = job.data?.requestId?.toString().trim() ?? "";
        if (!requestId) {
          throw new Error("[create-pipeline-worker] Missing requestId in job payload.");
        }

        await prisma.createRequest.update({
          where: { id: requestId },
          data: { status: "DONE" },
        });
      }
    },
  );

  const shutdown = async () => {
    await stopPgBoss({ graceful: true, timeout: 30_000 });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`[create-pipeline-worker] started. queue=${CREATE_PIPELINE_JOB_NAME}`);
}

main().catch(async (error) => {
  console.error(error);
  await stopPgBoss({ close: true });
  process.exit(1);
});
