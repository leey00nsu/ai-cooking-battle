import { loadEnvConfig } from "@next/env";
import { getOrCreateDayTheme } from "@/lib/day-theme/get-or-create-day-theme";
import {
  DAY_THEME_PRECREATE_JOB_NAME,
  ensureDayThemePrecreateSchedule,
} from "@/lib/queue/day-theme-precreate-job";
import { startPgBoss, stopPgBoss } from "@/lib/queue/pg-boss";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

loadEnvConfig(process.cwd());

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

function printUsage() {
  console.log(
    `
Usage:
  pnpm dev:day-theme:create-today
  pnpm dev:day-theme:enqueue-precreate [--dayKey YYYY-MM-DD] [--wait] [--timeoutMs 10000]

Notes:
  - enqueue-precreate requires the worker to be running to complete.
  - Run worker: pnpm worker:create-pipeline (or pnpm start:all)
`.trim(),
  );
}

async function waitForJobCompletion(jobId: string, timeoutMs: number) {
  const boss = await startPgBoss();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const jobs = await boss.findJobs(DAY_THEME_PRECREATE_JOB_NAME, { id: jobId });
    const latest = jobs[0];
    if (!latest) {
      await new Promise((r) => setTimeout(r, 120));
      continue;
    }
    if (latest.state === "completed") {
      return;
    }
    if (latest.state === "failed") {
      throw new Error(`[day-theme] job failed: ${jobId}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  throw new Error(
    `[day-theme] timeout waiting for job completion: ${jobId} (worker may not be running)`,
  );
}

async function main() {
  const command = process.argv[2]?.trim() ?? "";
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  if (command === "create-today") {
    const dayKey = parseArgValue("--dayKey") ?? formatDayKeyForKST();
    const theme = await getOrCreateDayTheme(dayKey, { userId: null });
    console.log("[day-theme] ok", {
      dayKey: theme.dayKey,
      themeText: theme.themeText,
      themeTextEn: theme.themeTextEn,
      themeImageUrl: theme.themeImageUrl ?? null,
    });
    return;
  }

  if (command === "enqueue-precreate") {
    const dayKey = parseArgValue("--dayKey") ?? formatDayKeyForKST();
    const wait = hasFlag("--wait") || hasFlag("--waitForCompletion");
    const timeoutMs = Number.parseInt(parseArgValue("--timeoutMs") ?? "10000", 10);

    const boss = await startPgBoss();
    await ensureDayThemePrecreateSchedule(boss);

    const jobId = await boss.send(DAY_THEME_PRECREATE_JOB_NAME, { dayKey });
    if (!jobId) {
      throw new Error("[day-theme] failed to enqueue precreate job");
    }
    console.log("[day-theme] enqueued", { jobId, dayKey });

    if (wait) {
      await waitForJobCompletion(jobId, Number.isFinite(timeoutMs) ? timeoutMs : 10_000);
      console.log("[day-theme] completed", { jobId });
    }

    return;
  }

  console.error(`[day-theme] unknown command: ${command}`);
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
  });
