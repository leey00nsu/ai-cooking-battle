import { describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/providers/provider-error";

const validatePromptWithOpenAi = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@/lib/providers/openai-prompt-validator", () => ({
  validatePromptWithOpenAi,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

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
    validatePromptWithOpenAi.mockResolvedValueOnce({
      ok: true,
      decision: "ALLOW",
      normalizedPrompt: "ok",
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
  });

  it("returns blocked result with category and fixGuide", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-block" } });
    validatePromptWithOpenAi.mockResolvedValueOnce({
      ok: false,
      decision: "BLOCK",
      category: "POLICY",
      fixGuide: "가이드를 따르세요.",
      normalizedPrompt: "normalized",
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
  });

  it("returns 503 when openai provider is unavailable", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-unavailable" } });
    validatePromptWithOpenAi.mockRejectedValueOnce(
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
  });

  it("returns 429 when rate limited", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValue({ user: { id: "user-rate-limited" } });
    validatePromptWithOpenAi.mockResolvedValue({
      ok: true,
      decision: "ALLOW",
      normalizedPrompt: "ok",
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
