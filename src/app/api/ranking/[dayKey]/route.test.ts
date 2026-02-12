import { beforeEach, describe, expect, it, vi } from "vitest";

const getRankingTopMock = vi.fn();

vi.mock("@/shared/api/home-data-source", () => ({
  getHomeDataSource: () => ({
    getRankingTop: getRankingTopMock,
  }),
}));

describe("GET /api/ranking/[dayKey]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRankingTopMock.mockResolvedValue({
      dayKey: "2026-02-11",
      items: [],
    });
  });

  it("uses default count=10 when query is missing", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/ranking/2026-02-11"), {
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });

    expect(response.status).toBe(200);
    expect(getRankingTopMock).toHaveBeenCalledWith({
      dayKey: "2026-02-11",
      count: 10,
    });
  });

  it("uses requested count from query", async () => {
    const { GET } = await import("./route");

    await GET(new Request("http://localhost/api/ranking/2026-02-11?count=7"), {
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });

    expect(getRankingTopMock).toHaveBeenCalledWith({
      dayKey: "2026-02-11",
      count: 7,
    });
  });

  it("normalizes invalid negative/string count to default", async () => {
    const { GET } = await import("./route");

    await GET(new Request("http://localhost/api/ranking/2026-02-11?count=-3"), {
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });
    await GET(new Request("http://localhost/api/ranking/2026-02-11?count=abc"), {
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });

    expect(getRankingTopMock).toHaveBeenNthCalledWith(1, {
      dayKey: "2026-02-11",
      count: 10,
    });
    expect(getRankingTopMock).toHaveBeenNthCalledWith(2, {
      dayKey: "2026-02-11",
      count: 10,
    });
  });

  it("clamps too-large count to max=50", async () => {
    const { GET } = await import("./route");

    await GET(new Request("http://localhost/api/ranking/2026-02-11?count=999"), {
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });

    expect(getRankingTopMock).toHaveBeenCalledWith({
      dayKey: "2026-02-11",
      count: 50,
    });
  });
});
