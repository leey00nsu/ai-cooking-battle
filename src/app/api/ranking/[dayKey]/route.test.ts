import { beforeEach, describe, expect, it, vi } from "vitest";

const getRankingTopMock = vi.fn();
const listRankingArchiveMock = vi.fn();

vi.mock("@/shared/api/home-data-source", () => ({
  getHomeDataSource: () => ({
    getRankingTop: getRankingTopMock,
  }),
}));

vi.mock("@/entities/ranking/api/list-ranking-archive", () => ({
  listRankingArchive: listRankingArchiveMock,
}));

describe("GET /api/ranking/[dayKey]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRankingTopMock.mockResolvedValue({
      dayKey: "2026-02-11",
      items: [],
    });
    listRankingArchiveMock.mockResolvedValue({
      dayKey: "2026-02-11",
      themeText: "",
      participantCount: 0,
      averageScore: 0,
      keywordGroups: [],
      items: [],
      nextOffset: null,
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
      includeBots: false,
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
      includeBots: false,
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
      includeBots: false,
    });
    expect(getRankingTopMock).toHaveBeenNthCalledWith(2, {
      dayKey: "2026-02-11",
      count: 10,
      includeBots: false,
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
      includeBots: false,
    });
  });

  it("returns archive payload when view=archive", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request(
        "http://localhost/api/ranking/2026-02-11?view=archive&limit=15&offset=30&search=ramen",
      ),
      {
        params: Promise.resolve({ dayKey: "2026-02-11" }),
      },
    );

    expect(response.status).toBe(200);
    expect(listRankingArchiveMock).toHaveBeenCalledWith({
      dayKey: "2026-02-11",
      limit: 15,
      offset: 30,
      search: "ramen",
      includeBots: false,
    });
    expect(getRankingTopMock).not.toHaveBeenCalled();
  });

  it("normalizes invalid archive params", async () => {
    const { GET } = await import("./route");

    await GET(new Request("http://localhost/api/ranking/2026-02-11?view=archive&limit=-2"), {
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });

    expect(listRankingArchiveMock).toHaveBeenCalledWith({
      dayKey: "2026-02-11",
      limit: 12,
      offset: 0,
      search: null,
      includeBots: false,
    });
  });

  it("passes includeBots=true to top and archive handlers", async () => {
    const { GET } = await import("./route");

    await GET(new Request("http://localhost/api/ranking/2026-02-11?count=5&includeBots=true"), {
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });

    await GET(
      new Request(
        "http://localhost/api/ranking/2026-02-11?view=archive&includeBots=1&limit=10&offset=0",
      ),
      {
        params: Promise.resolve({ dayKey: "2026-02-11" }),
      },
    );

    expect(getRankingTopMock).toHaveBeenCalledWith({
      dayKey: "2026-02-11",
      count: 5,
      includeBots: true,
    });
    expect(listRankingArchiveMock).toHaveBeenCalledWith({
      dayKey: "2026-02-11",
      limit: 10,
      offset: 0,
      search: null,
      includeBots: true,
    });
  });

  it("returns 400 when dayKey format is invalid", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/ranking/invalid-day-key"), {
      params: Promise.resolve({ dayKey: "20260211" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "INVALID_DAY_KEY" });
    expect(getRankingTopMock).not.toHaveBeenCalled();
    expect(listRankingArchiveMock).not.toHaveBeenCalled();
  });
});
