import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  dayTheme: {
    findUnique: vi.fn(),
  },
};

const enqueueDayThemePrecreateJob = vi.fn(async () => "job");

vi.mock("@/lib/prisma", () => ({ prisma }));

vi.mock("@/lib/queue/day-theme-precreate-job", () => ({
  enqueueDayThemePrecreateJob,
}));

describe("GET /api/theme/today", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing day theme immediately when already created", async () => {
    prisma.dayTheme.findUnique.mockResolvedValueOnce({
      dayKey: "2026-02-09",
      themeText: "한겨울 캠핑 화롯가에 어울리는 숯불구이 요리",
      themeTextEn: "Charcoal-grilled dishes suitable for a winter campfire",
      axisAType: "장소",
      axisA: "한겨울 캠핑 화롯가",
      axisBType: "조리법",
      axisB: "숯불구이",
      axisFlavor: "훈연향",
      themeImageUrl: "https://example.com/theme.jpg",
    });

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      dayKey: "2026-02-09",
      themeText: "한겨울 캠핑 화롯가에 어울리는 숯불구이 요리",
      themeTextEn: "Charcoal-grilled dishes suitable for a winter campfire",
      axisAType: "장소",
      axisA: "한겨울 캠핑 화롯가",
      axisBType: "조리법",
      axisB: "숯불구이",
      axisFlavor: "훈연향",
      themeImageUrl: "https://example.com/theme.jpg",
      isPending: false,
    });
    expect(enqueueDayThemePrecreateJob).not.toHaveBeenCalled();
  });

  it("returns pending payload and enqueues precreate when day theme is missing", async () => {
    prisma.dayTheme.findUnique.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload).toMatchObject({
      dayKey: expect.any(String),
      themeText: "",
      themeTextEn: "",
      axisAType: "",
      axisA: "",
      axisBType: "",
      axisB: "",
      axisFlavor: "",
      themeImageUrl: null,
      isPending: true,
    });
    expect(enqueueDayThemePrecreateJob).toHaveBeenCalledWith({ dayKey: payload.dayKey });
  });

  it("enqueues precreate when image is missing even if day theme exists", async () => {
    prisma.dayTheme.findUnique.mockResolvedValueOnce({
      dayKey: "2026-02-09",
      themeText: "한겨울 캠핑 화롯가에 어울리는 숯불구이 요리",
      themeTextEn: "Charcoal-grilled dishes suitable for a winter campfire",
      axisAType: "장소",
      axisA: "한겨울 캠핑 화롯가",
      axisBType: "조리법",
      axisB: "숯불구이",
      axisFlavor: "훈연향",
      themeImageUrl: null,
    });

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      dayKey: "2026-02-09",
      isPending: false,
    });
    expect(enqueueDayThemePrecreateJob).toHaveBeenCalledWith({ dayKey: "2026-02-09" });
  });
});
