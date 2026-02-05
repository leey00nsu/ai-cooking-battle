import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

describe("GET /api/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns GUEST when unauthenticated", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/me"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "GUEST" });
  });

  it("returns AUTH when authenticated", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user" } });

    const response = await GET(new Request("http://localhost/api/me"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "AUTH" });
  });
});
