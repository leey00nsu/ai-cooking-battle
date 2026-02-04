import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/providers/provider-error";

const validatePromptWithOpenAiWithRaw = vi.fn();
const getSessionMock = vi.fn();
const cancelSlotReservation = vi.fn();
const reclaimSlotReservation = vi.fn();
const checkRateLimit = vi.fn();
const prisma = {
  slotReservation: {
    findFirst: vi.fn(),
  },
  openAiCallLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/providers/openai-prompt-validator", () => ({
  validatePromptWithOpenAiWithRaw,
}));

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  checkRateLimit,
}));

vi.mock("@/lib/slot-recovery", () => ({
  cancelSlotReservation,
  reclaimSlotReservation,
  hasReservationExpired: (reservation: { expiresAt: Date }) =>
    reservation.expiresAt.getTime() < Date.now(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("POST /api/create/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockReturnValue({ allowed: true, remaining: 0 });
    prisma.slotReservation.findFirst.mockResolvedValue({
      id: "res",
      userId: "user",
      dayKey: "2026-02-03",
      status: "RESERVED",
      slotType: "FREE",
      expiresAt: new Date(Date.now() + 60_000),
      idempotencyKey: "k",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.openAiCallLog.create.mockResolvedValue({ id: "v" });
    cancelSlotReservation.mockResolvedValue({ id: "res", status: "CANCELLED" });
  });

  it("returns 400 when prompt is missing", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/create/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "   " }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      code: "VALIDATION_REQUIRED",
      message: "Prompt is required.",
    });
  });

  it("returns 400 when reservationId is missing", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user" } });

    const request = new Request("http://localhost/api/create/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test", reservationId: "   " }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      code: "MISSING_RESERVATION_ID",
      message: "reservationId is required.",
    });
  });

  it("returns 404 when reservation does not exist", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user" } });
    prisma.slotReservation.findFirst.mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/create/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test", reservationId: "res" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      code: "RESERVATION_NOT_FOUND",
      message: "Reservation not found.",
    });
  });

  it("returns allow result", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-allow" } });
    validatePromptWithOpenAiWithRaw.mockResolvedValueOnce({
      result: { ok: true, decision: "ALLOW", normalizedPrompt: "ok", translatedPromptEn: "ok" },
      raw: {
        model: "gpt-test",
        openAiResponseId: "resp",
        outputText: '{"decision":"ALLOW","normalizedPrompt":"ok","translatedPromptEn":"ok"}',
        outputJson: { decision: "ALLOW", normalizedPrompt: "ok", translatedPromptEn: "ok" },
      },
    });
    prisma.openAiCallLog.create.mockResolvedValueOnce({ id: "v" });

    const request = new Request("http://localhost/api/create/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test", reservationId: "res" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      normalizedPrompt: "ok",
      translatedPromptEn: "ok",
      validationId: "v",
    });
    expect(prisma.openAiCallLog.create).toHaveBeenCalled();
    expect(cancelSlotReservation).not.toHaveBeenCalled();
  });

  it("returns blocked result with category and fixGuide", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-block" } });
    validatePromptWithOpenAiWithRaw.mockResolvedValueOnce({
      result: {
        ok: false,
        decision: "BLOCK",
        category: "POLICY",
        fixGuide: "가이드를 따르세요.",
        normalizedPrompt: "normalized",
        translatedPromptEn: "normalized",
      },
      raw: {
        model: "gpt-test",
        openAiResponseId: "resp",
        outputText: '{"decision":"BLOCK"}',
        outputJson: { decision: "BLOCK" },
      },
    });
    prisma.openAiCallLog.create.mockResolvedValueOnce({ id: "v" });

    const request = new Request("http://localhost/api/create/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test", reservationId: "res" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: false,
      code: "PROMPT_BLOCKED",
      message: "가이드를 따르세요.",
      category: "POLICY",
      fixGuide: "가이드를 따르세요.",
      normalizedPrompt: "normalized",
      translatedPromptEn: "normalized",
      validationId: "v",
    });
    expect(prisma.openAiCallLog.create).toHaveBeenCalled();
    expect(cancelSlotReservation).toHaveBeenCalled();
  });

  it("returns 503 when openai provider is unavailable", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-unavailable" } });
    validatePromptWithOpenAiWithRaw.mockRejectedValueOnce(
      new ProviderError({
        provider: "openai",
        code: "TIMEOUT",
        message: "timeout",
      }),
    );

    const request = new Request("http://localhost/api/create/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test", reservationId: "res" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("VALIDATION_UNAVAILABLE");
    expect(prisma.openAiCallLog.create).toHaveBeenCalled();
    expect(cancelSlotReservation).toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValue({ user: { id: "user-rate-limited" } });
    validatePromptWithOpenAiWithRaw.mockResolvedValue({
      result: { ok: true, decision: "ALLOW", normalizedPrompt: "ok", translatedPromptEn: "ok" },
      raw: {
        model: "gpt-test",
        openAiResponseId: "resp",
        outputText: '{"decision":"ALLOW"}',
        outputJson: { decision: "ALLOW" },
      },
    });

    checkRateLimit
      .mockReturnValueOnce({ allowed: true, remaining: 4 })
      .mockReturnValueOnce({ allowed: true, remaining: 3 })
      .mockReturnValueOnce({ allowed: true, remaining: 2 })
      .mockReturnValueOnce({ allowed: true, remaining: 1 })
      .mockReturnValueOnce({ allowed: true, remaining: 0 })
      .mockReturnValueOnce({ allowed: false, retryAfterSeconds: 60 });

    for (let i = 0; i < 5; i += 1) {
      const request = new Request("http://localhost/api/create/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test", reservationId: "res" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(200);
    }

    const limited = await POST(
      new Request("http://localhost/api/create/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test", reservationId: "res" }),
      }),
    );
    expect(limited.status).toBe(429);
    const payload = await limited.json();
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("RATE_LIMITED");
  });
});
