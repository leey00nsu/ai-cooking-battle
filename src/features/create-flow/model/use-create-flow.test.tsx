import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateFlow } from "@/features/create-flow/model/use-create-flow";

const fetchJson = vi.fn();

vi.mock("@/shared/lib/fetch-json", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
}));

vi.mock("@/shared/lib/sleep", () => ({ sleep: () => Promise.resolve() }));

beforeEach(() => {
  fetchJson.mockReset();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => {
      throw new Error("localStorage should not be used by useCreateFlow.");
    }),
    setItem: vi.fn(() => {
      throw new Error("localStorage should not be used by useCreateFlow.");
    }),
    removeItem: vi.fn(() => {
      throw new Error("localStorage should not be used by useCreateFlow.");
    }),
  });
});

describe("useCreateFlow", () => {
  it("does not use localStorage on mount", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateFlow(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.step).toBe("idle");
    });

    expect(result.current.state.imageUrl).toBeNull();
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it("can recover by requestId", async () => {
    fetchJson.mockResolvedValueOnce({
      ok: true,
      status: "DONE",
      dishId: "dish",
      imageUrl: "https://cdn.example/image.webp",
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateFlow(), { wrapper });
    await result.current.recoverByRequestId("req");

    await waitFor(() => {
      expect(result.current.state.step).toBe("done");
    });
    expect(result.current.state.imageUrl).toBe("https://cdn.example/image.webp");
    expect(result.current.state.requestId).toBe("req");
  });

  it("uses original prompt for generate (not normalizedPrompt)", async () => {
    fetchJson
      .mockResolvedValueOnce({
        ok: true,
        slotType: "free",
        reservationId: "res",
        expiresInSeconds: 300,
      })
      .mockResolvedValueOnce({
        ok: true,
        decision: "ALLOW",
        normalizedPrompt: "가공된 프롬프트",
        validationId: "v",
        translatedPromptEn: "translated",
        warnings: null,
      })
      .mockResolvedValueOnce({
        ok: true,
        requestId: "req",
        status: "PROCESSING",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: "DONE",
        dishId: "dish",
        imageUrl: "https://cdn.example/image.webp",
      });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateFlow(), { wrapper });
    await result.current.start("원본 프롬프트");

    await waitFor(() => {
      expect(result.current.state.step).toBe("done");
    });

    const generateCall = fetchJson.mock.calls.find((call) => {
      return typeof call[0] === "string" && String(call[0]).includes("/api/create/generate");
    });
    expect(generateCall).toBeTruthy();
    const options = (generateCall?.[1] ?? {}) as { body?: string };
    const payload = JSON.parse(options.body ?? "{}") as { prompt?: string; validationId?: string };
    expect(payload.prompt).toBeUndefined();
    expect(payload.validationId).toBe("v");

    const validateCall = fetchJson.mock.calls.find((call) => {
      return typeof call[0] === "string" && String(call[0]).includes("/api/create/validate");
    });
    expect(validateCall).toBeTruthy();
    const validateOptions = (validateCall?.[1] ?? {}) as { body?: string };
    const validatePayload = JSON.parse(validateOptions.body ?? "{}") as {
      prompt?: string;
      reservationId?: string;
    };
    expect(validatePayload.prompt).toBe("원본 프롬프트");
    expect(validatePayload.reservationId).toBe("res");
  });

  it("keeps preview imageUrl on safety failure", async () => {
    fetchJson
      .mockResolvedValueOnce({
        ok: true,
        slotType: "free",
        reservationId: "res",
        expiresInSeconds: 300,
      })
      .mockResolvedValueOnce({
        ok: true,
        decision: "ALLOW",
        normalizedPrompt: "원본 프롬프트",
        translatedPromptEn: "translated",
        validationId: "v",
        warnings: null,
      })
      .mockResolvedValueOnce({
        ok: true,
        requestId: "req",
        status: "PROCESSING",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: "SAFETY",
        dishId: null,
        imageUrl: "https://cdn.example/image.webp",
      })
      .mockResolvedValueOnce({
        ok: false,
        code: "GENERATE_FAILED",
        message: "차단되었습니다.",
        retryable: false,
      });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateFlow(), { wrapper });
    await result.current.start("원본 프롬프트");

    await waitFor(() => {
      expect(result.current.state.step).toBe("error");
    });
    expect(result.current.state.errorStep).toBe("safety");
    expect(result.current.state.requestId).toBe("req");
    expect(result.current.state.imageUrl).toBe("https://cdn.example/image.webp");
  });
});
