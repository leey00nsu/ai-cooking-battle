import { loadEnvConfig } from "@next/env";
import type { BotSeedRunStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueBotSeedJob } from "@/lib/queue/bot-seed-job";
import { stopPgBoss } from "@/lib/queue/pg-boss";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

loadEnvConfig(process.cwd());

const FINAL_STATUSES: BotSeedRunStatus[] = ["SUCCEEDED", "FAILED_PARTIAL", "FAILED"];

function parseArgValue(flag: string) {
  const argv = process.argv;
  const idx = argv.indexOf(flag);
  if (idx === -1) {
    return null;
  }
  const value = argv[idx + 1];
  if (!value || value.startsWith("-")) {
    return null;
  }
  return value;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function resolveDayKey() {
  const dayKey = parseArgValue("--dayKey") ?? formatDayKeyForKST();
  return dayKey.trim();
}

function printUsage() {
  console.log(
    `
Usage:
  pnpm dev:bot-seed:enqueue [--dayKey YYYY-MM-DD] [--wait] [--timeoutMs 30000] [--force]
  pnpm dev:bot-seed:status [--dayKey YYYY-MM-DD]

Notes:
  - enqueue requires worker process to consume the job.
  - run worker: pnpm worker:create-pipeline (or pnpm start:all)
  - --force disables singleton lock for same dayKey.
`.trim(),
  );
}

async function readSeedStatus(dayKey: string) {
  return await prisma.botSeedRun.findUnique({
    where: { dayKey },
    select: {
      id: true,
      dayKey: true,
      triggerType: true,
      status: true,
      selectedCount: true,
      successCount: true,
      startedAt: true,
      finishedAt: true,
      updatedAt: true,
      seedItems: {
        orderBy: [{ selectedOrder: "asc" }, { attempt: "asc" }],
        select: {
          selectedOrder: true,
          attempt: true,
          personaKey: true,
          status: true,
          dishId: true,
          errorCode: true,
        },
      },
    },
  });
}

async function waitForSeedRun(dayKey: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const run = await readSeedStatus(dayKey);
    if (!run) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }
    if (FINAL_STATUSES.includes(run.status)) {
      return run;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(
    `[bot-seed] timeout waiting for completion: dayKey=${dayKey} (worker may not be running)`,
  );
}

function printSeedStatus(run: Awaited<ReturnType<typeof readSeedStatus>>) {
  if (!run) {
    console.log("[bot-seed] run not found");
    return;
  }

  console.log("[bot-seed] run", {
    id: run.id,
    dayKey: run.dayKey,
    triggerType: run.triggerType,
    status: run.status,
    selectedCount: run.selectedCount,
    successCount: run.successCount,
    startedAt: run.startedAt?.toISOString() ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
    updatedAt: run.updatedAt.toISOString(),
  });

  console.table(
    run.seedItems.map((item) => ({
      order: item.selectedOrder,
      attempt: item.attempt,
      personaKey: item.personaKey,
      status: item.status,
      dishId: item.dishId ?? "-",
      errorCode: item.errorCode ?? "-",
    })),
  );
}

async function handleEnqueue() {
  const dayKey = resolveDayKey();
  const wait = hasFlag("--wait");
  const force = hasFlag("--force");
  const timeoutMs = Number.parseInt(parseArgValue("--timeoutMs") ?? "30000", 10);

  const jobId = await enqueueBotSeedJob(
    { dayKey, triggerType: "ADMIN" },
    force ? { singleton: false } : undefined,
  );

  console.log("[bot-seed] enqueued", { dayKey, jobId: jobId ?? null, force });

  if (!wait) {
    return;
  }

  const run = await waitForSeedRun(dayKey, Number.isFinite(timeoutMs) ? timeoutMs : 30_000);
  printSeedStatus(run);
}

async function handleStatus() {
  const dayKey = resolveDayKey();
  const run = await readSeedStatus(dayKey);
  printSeedStatus(run);
}

async function main() {
  const command = process.argv[2]?.trim() ?? "";

  if (
    !command ||
    command === "help" ||
    command === "--help" ||
    command === "-h" ||
    hasFlag("--help") ||
    hasFlag("-h")
  ) {
    printUsage();
    return;
  }

  if (command === "enqueue") {
    await handleEnqueue();
    return;
  }

  if (command === "status") {
    await handleStatus();
    return;
  }

  console.error(`[bot-seed] unknown command: ${command}`);
  printUsage();
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopPgBoss({ graceful: true, timeout: 30_000 }).catch(() => {});
    await prisma.$disconnect().catch(() => {});
  });
