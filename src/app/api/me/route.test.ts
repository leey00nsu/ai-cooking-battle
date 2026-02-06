import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

const computeUserStatusMock = vi.fn();

vi.mock("@/lib/user-status/compute-user-status", () => ({
  computeUserStatus: (userId: string) => computeUserStatusMock(userId),
}));

describe("GET /api/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    computeUserStatusMock.mockResolvedValue("AUTH");
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
    computeUserStatusMock.mockResolvedValueOnce("AUTH");

    const response = await GET(new Request("http://localhost/api/me"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "AUTH" });
  });

  it("returns ELIGIBLE when computeUserStatus says so", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user" } });
    computeUserStatusMock.mockResolvedValueOnce("ELIGIBLE");

    const response = await GET(new Request("http://localhost/api/me"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ELIGIBLE" });
  });
});
