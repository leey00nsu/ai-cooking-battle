import { CREATE_PIPELINE_JOB_NAME } from "@/lib/queue/create-pipeline-job";
import { startPgBoss, stopPgBoss } from "@/lib/queue/pg-boss";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCompletion(jobId: string) {
  const boss = await startPgBoss();
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const jobs = await boss.findJobs(CREATE_PIPELINE_JOB_NAME, { id: jobId });
    const latest = jobs[0];
    if (!latest) {
      await sleep(100);
      continue;
    }

    if (latest.state === "completed") {
      return;
    }
    if (latest.state === "failed") {
      throw new Error(`[smoke] job failed: ${jobId}`);
    }

    await sleep(150);
  }

  throw new Error(`[smoke] timeout waiting for job completion: ${jobId}`);
}

async function main() {
  const boss = await startPgBoss();
  await boss.createQueue(CREATE_PIPELINE_JOB_NAME);

  await boss.work(CREATE_PIPELINE_JOB_NAME, { batchSize: 1 }, async () => {
    return;
  });

  const jobId = await boss.send(CREATE_PIPELINE_JOB_NAME, { requestId: "smoke" });
  if (!jobId) {
    throw new Error("[smoke] failed to send job");
  }

  await waitForCompletion(jobId);
  await stopPgBoss({ graceful: true, timeout: 30_000 });
  console.log(`[smoke] ok: ${jobId}`);
}

main().catch(async (error) => {
  console.error(error);
  await stopPgBoss({ close: true });
  process.exit(1);
});
