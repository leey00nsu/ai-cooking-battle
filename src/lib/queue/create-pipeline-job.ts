export const CREATE_PIPELINE_JOB_NAME = "create-pipeline" as const;

export type CreatePipelineJobPayload = {
  requestId: string;
};

export const CREATE_PIPELINE_QUEUE_OPTIONS = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  retryDelayMax: 300,
} as const;

export async function enqueueCreatePipelineJob(payload: CreatePipelineJobPayload) {
  const requestId = payload.requestId?.toString().trim() ?? "";
  if (!requestId) {
    throw new Error("[create-pipeline-job] Missing requestId.");
  }

  const { startPgBoss } = await import("./pg-boss");
  const boss = await startPgBoss();
  await boss.createQueue(CREATE_PIPELINE_JOB_NAME, CREATE_PIPELINE_QUEUE_OPTIONS);

  return await boss.send(
    CREATE_PIPELINE_JOB_NAME,
    { requestId },
    { singletonKey: requestId, singletonSeconds: 24 * 60 * 60 },
  );
}
