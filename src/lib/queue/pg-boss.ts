import { PgBoss, type StopOptions } from "pg-boss";

type PgBossGlobal = typeof globalThis & {
  __pgBoss?: PgBoss | undefined;
};

function getDatabaseUrl() {
  const url = process.env.BOSS_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("[pg-boss] Missing DATABASE_URL (or BOSS_DATABASE_URL).");
  }
  return url;
}

export function getPgBoss(): PgBoss {
  const globalForBoss = globalThis as PgBossGlobal;
  if (!globalForBoss.__pgBoss) {
    globalForBoss.__pgBoss = new PgBoss(getDatabaseUrl());
  }
  return globalForBoss.__pgBoss;
}

export async function startPgBoss(): Promise<PgBoss> {
  const boss = getPgBoss();
  await boss.start();
  return boss;
}

export async function stopPgBoss(options?: StopOptions) {
  const globalForBoss = globalThis as PgBossGlobal;
  const boss = globalForBoss.__pgBoss;
  if (!boss) {
    return;
  }
  await boss.stop(options);
  globalForBoss.__pgBoss = undefined;
}
