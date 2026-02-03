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
});
