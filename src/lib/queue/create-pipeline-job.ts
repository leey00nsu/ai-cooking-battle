export const CREATE_PIPELINE_JOB_NAME = "create-pipeline" as const;

export type CreatePipelineJobPayload = {
  requestId: string;
};

export async function enqueueCreatePipelineJob(payload: CreatePipelineJobPayload) {
  const requestId = payload.requestId?.toString().trim() ?? "";
  if (!requestId) {
    throw new Error("[create-pipeline-job] Missing requestId.");
  }

  const { startPgBoss } = await import("./pg-boss");
  const boss = await startPgBoss();
  await boss.createQueue(CREATE_PIPELINE_JOB_NAME);

  return await boss.send(
    CREATE_PIPELINE_JOB_NAME,
    { requestId },
    { singletonKey: requestId, singletonSeconds: 24 * 60 * 60 },
  );
}
