import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  dish: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("listDishFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries dishes with hidden filter and desc cursor order", async () => {
    const createdAt = new Date("2026-02-09T10:00:00.000Z");
    prisma.dish.findMany.mockResolvedValueOnce([
      {
        id: "dish-1",
        prompt: "dish 1",
        imageUrl: "https://cdn.example/dish-1.webp",
        createdAt,
        user: { name: "Chef A" },
        botMeta: null,
      },
    ]);

    const { listDishFeed } = await import("./list-dish-feed");
    const result = await listDishFeed({});

    expect(prisma.dish.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isHidden: false,
        }),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 13,
      }),
    );
    expect(result).toEqual({
      items: [
        {
          id: "dish-1",
          prompt: "dish 1",
          imageUrl: "https://cdn.example/dish-1.webp",
          createdAt: "2026-02-09T10:00:00.000Z",
          authorType: "user",
          authorLabel: "Chef A",
        },
      ],
      nextCursor: null,
    });
  });

  it("returns nextCursor when more rows exist than limit", async () => {
    prisma.dish.findMany.mockResolvedValueOnce([
      {
        id: "dish-3",
        prompt: "dish 3",
        imageUrl: "https://cdn.example/dish-3.webp",
        createdAt: new Date("2026-02-09T10:03:00.000Z"),
        user: { name: "Chef C" },
        botMeta: null,
      },
      {
        id: "dish-2",
        prompt: "dish 2 (트리플 실루엣)",
        imageUrl: "https://cdn.example/dish-2.webp",
        createdAt: new Date("2026-02-09T10:02:00.000Z"),
        user: { name: "Chef B" },
        botMeta: {
          id: "meta-2",
          persona: { displayName: "트리플 실루엣" },
        },
      },
      {
        id: "dish-1",
        prompt: "dish 1",
        imageUrl: "https://cdn.example/dish-1.webp",
        createdAt: new Date("2026-02-09T10:01:00.000Z"),
        user: { name: "Chef A" },
        botMeta: null,
      },
    ]);

    const { listDishFeed } = await import("./list-dish-feed");
    const result = await listDishFeed({ limit: 2 });

    expect(prisma.dish.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
      }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[1]).toMatchObject({
      id: "dish-2",
      prompt: "dish 2",
      authorType: "bot",
      authorLabel: "트리플 실루엣",
    });
    expect(result.nextCursor).toEqual(expect.any(String));
  });

  it("applies cursor condition when cursor is valid", async () => {
    prisma.dish.findMany.mockResolvedValueOnce([]);
    const cursor = Buffer.from(
      JSON.stringify({
        sort: "latest",
        createdAt: "2026-02-09T10:00:00.000Z",
        id: "dish-100",
      }),
      "utf8",
    ).toString("base64url");

    const { listDishFeed } = await import("./list-dish-feed");
    await listDishFeed({ limit: 2, cursor });

    expect(prisma.dish.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { createdAt: { lt: new Date("2026-02-09T10:00:00.000Z") } },
            { createdAt: new Date("2026-02-09T10:00:00.000Z"), id: { lt: "dish-100" } },
          ],
        }),
      }),
    );
  });

  it("applies mine and excludeBots filters together", async () => {
    prisma.dish.findMany.mockResolvedValueOnce([]);

    const { listDishFeed } = await import("./list-dish-feed");
    await listDishFeed({
      limit: 2,
      mine: true,
      excludeBots: true,
      userId: "user-123",
    });

    expect(prisma.dish.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isHidden: false,
          userId: "user-123",
          botMeta: { is: null },
        }),
      }),
    );
  });

  it("returns empty list when mine=true but userId is missing", async () => {
    const { listDishFeed } = await import("./list-dish-feed");
    const result = await listDishFeed({
      mine: true,
      userId: "",
    });

    expect(result).toEqual({
      items: [],
      nextCursor: null,
    });
    expect(prisma.dish.findMany).not.toHaveBeenCalled();
  });

  it("applies search and title sort when provided", async () => {
    prisma.dish.findMany.mockResolvedValueOnce([]);

    const { listDishFeed } = await import("./list-dish-feed");
    await listDishFeed({
      search: "ramen",
      sort: "title_asc",
      limit: 10,
    });

    expect(prisma.dish.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          prompt: { contains: "ramen", mode: "insensitive" },
        }),
        orderBy: [{ prompt: "asc" }, { id: "asc" }],
        take: 11,
      }),
    );
  });

  it("ignores cursor when sort in cursor does not match request sort", async () => {
    prisma.dish.findMany.mockResolvedValueOnce([]);
    const cursor = Buffer.from(
      JSON.stringify({
        sort: "latest",
        createdAt: "2026-02-09T10:00:00.000Z",
        id: "dish-100",
      }),
      "utf8",
    ).toString("base64url");

    const { listDishFeed } = await import("./list-dish-feed");
    await listDishFeed({ sort: "title_desc", cursor });

    expect(prisma.dish.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          OR: expect.anything(),
        }),
      }),
    );
  });
});
