import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  botSeedRun: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
  botSeedItem: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
}));

const prisma = vi.hoisted(() => ({
  botPersona: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const selectDailyPersonas = vi.hoisted(() => vi.fn());
const formatDayKeyForKST = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/entities/bot-persona/model/select-daily-personas", () => ({ selectDailyPersonas }));
vi.mock("@/shared/lib/day-key", () => ({ formatDayKeyForKST }));

import { processBotSeedJob } from "@/workers/bot-seed-handler";

describe("processBotSeedJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    formatDayKeyForKST.mockReturnValue("2026-02-08");
    prisma.botPersona.findMany.mockResolvedValue([
      { personaKey: "p1", styleGroup: "a", isActive: true },
      { personaKey: "p2", styleGroup: "b", isActive: true },
    ]);
    tx.botSeedRun.upsert.mockResolvedValue({ id: "run-1" });
    tx.botSeedRun.update.mockResolvedValue({ id: "run-1" });
    tx.botSeedItem.deleteMany.mockResolvedValue({ count: 2 });
    tx.botSeedItem.createMany.mockResolvedValue({ count: 2 });
    prisma.$transaction.mockImplementation(async (runner: (txArg: typeof tx) => Promise<unknown>) =>
      runner(tx),
    );
  });

  it("stores selected seed items and keeps run status as PENDING", async () => {
    selectDailyPersonas.mockReturnValue({
      selected: [
        { personaKey: "p1", styleGroup: "a", isActive: true },
        { personaKey: "p2", styleGroup: "b", isActive: true },
      ],
      fallback: [],
    });

    const result = await processBotSeedJob({ dayKey: "2026-02-09", triggerType: "SCHEDULE" });

    expect(prisma.botPersona.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      }),
    );
    expect(selectDailyPersonas).toHaveBeenCalledWith(
      expect.objectContaining({
        dayKey: "2026-02-09",
      }),
    );
    expect(tx.botSeedRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dayKey: "2026-02-09" },
        update: expect.objectContaining({
          status: "RUNNING",
          selectedCount: 2,
        }),
        create: expect.objectContaining({
          dayKey: "2026-02-09",
          triggerType: "SCHEDULE",
        }),
      }),
    );
    expect(tx.botSeedItem.deleteMany).toHaveBeenCalledWith({ where: { seedRunId: "run-1" } });
    expect(tx.botSeedItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({ personaKey: "p1", selectedOrder: 1, status: "SELECTED" }),
          expect.objectContaining({ personaKey: "p2", selectedOrder: 2, status: "SELECTED" }),
        ],
      }),
    );
    expect(tx.botSeedRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({ status: "PENDING", finishedAt: null }),
      }),
    );
    expect(result).toEqual({
      dayKey: "2026-02-09",
      selectedCount: 2,
      status: "PENDING",
    });
  });

  it("marks run as FAILED when no selectable personas exist", async () => {
    selectDailyPersonas.mockReturnValue({
      selected: [],
      fallback: [],
    });

    const result = await processBotSeedJob({ triggerType: "ADMIN" });

    expect(formatDayKeyForKST).toHaveBeenCalled();
    expect(tx.botSeedItem.createMany).not.toHaveBeenCalled();
    expect(tx.botSeedRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          finishedAt: expect.any(Date),
        }),
      }),
    );
    expect(result).toEqual({
      dayKey: "2026-02-08",
      selectedCount: 0,
      status: "FAILED",
    });
  });
});
