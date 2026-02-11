import { loadEnvConfig } from "@next/env";
import { requeueDishScores } from "@/entities/dish/api/requeue-dish-scores";
import { prisma } from "@/lib/prisma";
import { stopPgBoss } from "@/lib/queue/pg-boss";

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
  pnpm dev:dish-score:requeue --dishId <dishId> [--dayKey YYYY-MM-DD]
  pnpm dev:dish-score:requeue --dayKey YYYY-MM-DD --limit 100

Notes:
  - This script calls internal requeue logic directly (no HTTP/cookie needed).
  - If --dishId is provided, only that dish/dayKey target is requeued.
`.trim(),
  );
}

function toPositiveInt(raw: string | null, fallback: number) {
  if (!raw) {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    printUsage();
    return;
  }

  const dishId = parseArgValue("--dishId")?.trim() || null;
  const dayKey = parseArgValue("--dayKey")?.trim() || undefined;
  const limit = toPositiveInt(parseArgValue("--limit"), 100);
  if (limit === null) {
    throw new Error("limit must be a positive integer.");
  }

  if (!dishId && !dayKey) {
    throw new Error("bulk requeue requires --dayKey or use --dishId for single target.");
  }

  const result = await requeueDishScores({
    dayKey,
    dishId: dishId ?? undefined,
    limit: dishId ? undefined : limit,
  });

  if (result.type === "error") {
    console.error("[dish-score-requeue] failed", result);
    process.exitCode = 1;
    return;
  }

  console.log("[dish-score-requeue] ok", result);
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
