import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn(async () => ({ user: { id: "user" } }));
const enqueueCreatePipelineJob = vi.fn(async () => "job");

const prisma = {
  createRequest: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  openAiCallLog: {
    findUnique: vi.fn(),
  },
  slotReservation: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

const hasReservationExpired = vi.fn(() => false);
const reclaimSlotReservation = vi.fn();
const markReservationFailed = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/queue/create-pipeline-job", () => ({
  enqueueCreatePipelineJob,
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

vi.mock("@/lib/slot-recovery", () => ({
  hasReservationExpired,
  reclaimSlotReservation,
  markReservationFailed,
}));

describe("POST /api/create/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when missing fields", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/create/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: "r", idempotencyKey: "k" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "" } });
    const request = new Request("http://localhost/api/create/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: "r", idempotencyKey: "k", validationId: "v" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.code).toBe("UNAUTHORIZED");
  });

  it("returns existing requestId when idempotent", async () => {
    const { POST } = await import("./route");
    prisma.openAiCallLog.findUnique.mockResolvedValueOnce({
      id: "v",
      userId: "user",
      kind: "PROMPT_VALIDATE",
      decision: "ALLOW",
      inputPrompt: "p",
      reason: null,
    });
    prisma.createRequest.findUnique.mockResolvedValueOnce({
      id: "req",
      userId: "user",
      idempotencyKey: "k",
      reservationId: "r",
      prompt: "p",
      status: "GENERATING",
    });

    const request = new Request("http://localhost/api/create/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: "r", idempotencyKey: "k", validationId: "v" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, requestId: "req", status: "PROCESSING" });
    expect(enqueueCreatePipelineJob).toHaveBeenCalledWith({ requestId: "req" });
  });

  it("returns 409 on idempotency conflict", async () => {
    const { POST } = await import("./route");
    prisma.openAiCallLog.findUnique.mockResolvedValueOnce({
      id: "v",
      userId: "user",
      kind: "PROMPT_VALIDATE",
      decision: "ALLOW",
      inputPrompt: "p",
      reason: null,
    });
    prisma.createRequest.findUnique.mockResolvedValueOnce({
      id: "req",
      reservationId: "other",
    });

    const request = new Request("http://localhost/api/create/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: "r", idempotencyKey: "k", validationId: "v" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
  });

  it("creates request and enqueues job", async () => {
    const { POST } = await import("./route");
    prisma.openAiCallLog.findUnique.mockResolvedValueOnce({
      id: "v",
      userId: "user",
      kind: "PROMPT_VALIDATE",
      decision: "ALLOW",
      inputPrompt: "p",
      reason: null,
    });
    prisma.createRequest.findUnique.mockResolvedValueOnce(null);
    prisma.slotReservation.findFirst.mockResolvedValueOnce({
      id: "r",
      userId: "user",
      status: "RESERVED",
      expiresAt: new Date(Date.now() + 60_000),
      dayKey: "2026-02-03",
      slotType: "FREE",
    });
    prisma.slotReservation.update.mockResolvedValueOnce({
      id: "r",
      status: "CONFIRMED",
    });
    prisma.createRequest.create.mockResolvedValueOnce({
      id: "req",
    });

    const request = new Request("http://localhost/api/create/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: "r", idempotencyKey: "k", validationId: "v" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, requestId: "req", status: "PROCESSING" });
    expect(enqueueCreatePipelineJob).toHaveBeenCalledWith({ requestId: "req" });
  });

  it("returns 410 and reclaims reservation when expired", async () => {
    const { POST } = await import("./route");
    prisma.openAiCallLog.findUnique.mockResolvedValueOnce({
      id: "v",
      userId: "user",
      kind: "PROMPT_VALIDATE",
      decision: "ALLOW",
      inputPrompt: "p",
      reason: null,
    });
    prisma.createRequest.findUnique.mockResolvedValueOnce(null);
    prisma.slotReservation.findFirst.mockResolvedValueOnce({
      id: "r",
      userId: "user",
      status: "RESERVED",
      expiresAt: new Date(Date.now() - 1_000),
      dayKey: "2026-02-03",
      slotType: "FREE",
    });
    hasReservationExpired.mockReturnValueOnce(true);

    const request = new Request("http://localhost/api/create/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: "r", idempotencyKey: "k", validationId: "v" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(410);
    const payload = await response.json();
    expect(payload.code).toBe("RESERVATION_EXPIRED");
    expect(reclaimSlotReservation).toHaveBeenCalled();
    expect(prisma.createRequest.create).not.toHaveBeenCalled();
    expect(enqueueCreatePipelineJob).not.toHaveBeenCalled();
  });

  it("returns 409 when reservation already FAILED", async () => {
    const { POST } = await import("./route");
    prisma.openAiCallLog.findUnique.mockResolvedValueOnce({
      id: "v",
      userId: "user",
      kind: "PROMPT_VALIDATE",
      decision: "ALLOW",
      inputPrompt: "p",
      reason: null,
    });
    prisma.createRequest.findUnique.mockResolvedValueOnce(null);
    prisma.slotReservation.findFirst.mockResolvedValueOnce({
      id: "r",
      userId: "user",
      status: "FAILED",
      expiresAt: new Date(Date.now() + 60_000),
      dayKey: "2026-02-03",
      slotType: "FREE",
    });

    const request = new Request("http://localhost/api/create/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: "r", idempotencyKey: "k", validationId: "v" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.code).toBe("RESERVATION_FAILED");
    expect(prisma.createRequest.create).not.toHaveBeenCalled();
    expect(enqueueCreatePipelineJob).not.toHaveBeenCalled();
  });

  it("returns 503 and marks reservation failed when enqueue fails", async () => {
    const { POST } = await import("./route");
    prisma.openAiCallLog.findUnique.mockResolvedValueOnce({
      id: "v",
      userId: "user",
      kind: "PROMPT_VALIDATE",
      decision: "ALLOW",
      inputPrompt: "p",
      reason: null,
    });
    prisma.createRequest.findUnique.mockResolvedValueOnce(null);
    prisma.slotReservation.findFirst.mockResolvedValueOnce({
      id: "r",
      userId: "user",
      status: "RESERVED",
      expiresAt: new Date(Date.now() + 60_000),
      dayKey: "2026-02-03",
      slotType: "FREE",
    });
    prisma.createRequest.create.mockResolvedValueOnce({ id: "req" });
    enqueueCreatePipelineJob.mockRejectedValueOnce(new Error("down"));

    const request = new Request("http://localhost/api/create/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: "r", idempotencyKey: "k", validationId: "v" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload.code).toBe("QUEUE_UNAVAILABLE");
    expect(markReservationFailed).toHaveBeenCalled();
  });

  it("returns 404 when validationId is not found", async () => {
    const { POST } = await import("./route");
    prisma.openAiCallLog.findUnique.mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/create/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: "r", idempotencyKey: "k", validationId: "v" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload.code).toBe("VALIDATION_NOT_FOUND");
  });

  it("returns 409 when validation is BLOCK", async () => {
    const { POST } = await import("./route");
    prisma.openAiCallLog.findUnique.mockResolvedValueOnce({
      id: "v",
      userId: "user",
      kind: "PROMPT_VALIDATE",
      decision: "BLOCK",
      inputPrompt: "p",
      reason: "blocked",
    });

    const request = new Request("http://localhost/api/create/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: "r", idempotencyKey: "k", validationId: "v" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.code).toBe("PROMPT_BLOCKED");
  });
});
