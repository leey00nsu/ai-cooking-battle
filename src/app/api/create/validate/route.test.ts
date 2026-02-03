import { describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/providers/provider-error";

const validatePromptWithOpenAiWithRaw = vi.fn();
const getSessionMock = vi.fn();
const prisma = {
  openAiCallLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/providers/openai-prompt-validator", () => ({
  validatePromptWithOpenAiWithRaw,
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

  it("returns allow result", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-allow" } });
    validatePromptWithOpenAiWithRaw.mockResolvedValueOnce({
      result: { ok: true, decision: "ALLOW", normalizedPrompt: "ok" },
      raw: {
        model: "gpt-test",
        openAiResponseId: "resp",
        outputText: '{"decision":"ALLOW","normalizedPrompt":"ok"}',
        outputJson: { decision: "ALLOW", normalizedPrompt: "ok" },
      },
    });

    const request = new Request("http://localhost/api/create/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      normalizedPrompt: "ok",
    });
    expect(prisma.openAiCallLog.create).toHaveBeenCalled();
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
      },
      raw: {
        model: "gpt-test",
        openAiResponseId: "resp",
        outputText: '{"decision":"BLOCK"}',
        outputJson: { decision: "BLOCK" },
      },
    });

    const request = new Request("http://localhost/api/create/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test" }),
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
    });
    expect(prisma.openAiCallLog.create).toHaveBeenCalled();
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
      body: JSON.stringify({ prompt: "test" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("VALIDATION_UNAVAILABLE");
    expect(prisma.openAiCallLog.create).toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValue({ user: { id: "user-rate-limited" } });
    validatePromptWithOpenAiWithRaw.mockResolvedValue({
      result: { ok: true, decision: "ALLOW", normalizedPrompt: "ok" },
      raw: {
        model: "gpt-test",
        openAiResponseId: "resp",
        outputText: '{"decision":"ALLOW"}',
        outputJson: { decision: "ALLOW" },
      },
    });

    for (let i = 0; i < 5; i += 1) {
      const request = new Request("http://localhost/api/create/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(200);
    }

    const limited = await POST(
      new Request("http://localhost/api/create/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test" }),
      }),
    );
    expect(limited.status).toBe(429);
    const payload = await limited.json();
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("RATE_LIMITED");
  });
});
