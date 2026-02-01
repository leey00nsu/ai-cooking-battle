import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateFlow } from "@/features/create-flow/model/use-create-flow";

const fetchJson = vi.fn();

vi.mock("@/shared/lib/fetch-json", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
}));

vi.mock("@/shared/lib/sleep", () => ({ sleep: () => Promise.resolve() }));

const storage: Record<string, string> = {};

beforeEach(() => {
  fetchJson.mockReset();
  for (const key of Object.keys(storage)) {
    delete storage[key];
  }
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
  });
});

describe("useCreateFlow", () => {
  it("recovers when stored idempotencyKey exists", async () => {
    storage["createFlow:idempotency"] = JSON.stringify({
      idempotencyKey: "recover-key",
      startedAt: "2026-02-01T00:00:00Z",
    });

    fetchJson.mockResolvedValueOnce({
      ok: true,
      status: "DONE",
      imageUrl: "https://example.com/result.png",
    });

    const { result } = renderHook(() => useCreateFlow());

    await waitFor(() => {
      expect(result.current.state.step).toBe("done");
    });

    expect(result.current.state.imageUrl).toBe("https://example.com/result.png");
    expect(storage["createFlow:idempotency"]).toBeUndefined();
  });
});
