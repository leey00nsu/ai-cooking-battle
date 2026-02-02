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
  it("clears stored recovery key on mount", async () => {
    storage["createFlow:idempotency"] = JSON.stringify({
      idempotencyKey: "recover-key",
      startedAt: "2026-02-01T00:00:00Z",
    });

    const { result } = renderHook(() => useCreateFlow());

    await waitFor(() => {
      expect(result.current.state.step).toBe("idle");
    });

    expect(result.current.state.imageUrl).toBeNull();
    expect(storage["createFlow:idempotency"]).toBeUndefined();
    expect(fetchJson).not.toHaveBeenCalled();
  });
});
