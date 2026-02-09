import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BOT_SEED_JOB_NAME,
  BOT_SEED_QUEUE_OPTIONS,
  enqueueBotSeedJob,
  ensureBotSeedQueue,
} from "@/lib/queue/bot-seed-job";

const startPgBoss = vi.hoisted(() => vi.fn());

vi.mock("@/lib/queue/pg-boss", () => ({ startPgBoss }));

describe("bot-seed-job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates bot-seed queue with shared queue options", async () => {
    const boss = {
      createQueue: vi.fn(),
    } as unknown as {
      createQueue: (name: string, options: unknown) => Promise<void>;
    };

    await ensureBotSeedQueue(boss as never);

    expect(boss.createQueue).toHaveBeenCalledWith(BOT_SEED_JOB_NAME, BOT_SEED_QUEUE_OPTIONS);
  });

  it("enqueues dayKey singleton job with default SCHEDULE trigger", async () => {
    const boss = {
      createQueue: vi.fn(),
      send: vi.fn(),
    };
    startPgBoss.mockResolvedValueOnce(boss);

    await enqueueBotSeedJob({ dayKey: "2026-02-08" });

    expect(boss.createQueue).toHaveBeenCalledWith(BOT_SEED_JOB_NAME, BOT_SEED_QUEUE_OPTIONS);
    expect(boss.send).toHaveBeenCalledWith(
      BOT_SEED_JOB_NAME,
      { dayKey: "2026-02-08", triggerType: "SCHEDULE" },
      { singletonKey: "2026-02-08", singletonSeconds: 24 * 60 * 60 },
    );
  });

  it("passes ADMIN trigger when requested", async () => {
    const boss = {
      createQueue: vi.fn(),
      send: vi.fn(),
    };
    startPgBoss.mockResolvedValueOnce(boss);

    await enqueueBotSeedJob({ dayKey: "2026-02-08", triggerType: "ADMIN" });

    expect(boss.send).toHaveBeenCalledWith(
      BOT_SEED_JOB_NAME,
      { dayKey: "2026-02-08", triggerType: "ADMIN" },
      { singletonKey: "2026-02-08", singletonSeconds: 24 * 60 * 60 },
    );
  });

  it("can enqueue without singleton lock", async () => {
    const boss = {
      createQueue: vi.fn(),
      send: vi.fn(),
    };
    startPgBoss.mockResolvedValueOnce(boss);

    await enqueueBotSeedJob({ dayKey: "2026-02-08", triggerType: "ADMIN" }, { singleton: false });

    expect(boss.send).toHaveBeenCalledWith(
      BOT_SEED_JOB_NAME,
      { dayKey: "2026-02-08", triggerType: "ADMIN" },
      undefined,
    );
  });
});
