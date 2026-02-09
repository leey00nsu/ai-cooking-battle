import type { DishFeedCursor, DishFeedResponse } from "@/entities/feed/model/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

function toSafeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit) || (limit ?? 0) <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit as number), MAX_LIMIT);
}

function decodeCursor(cursor: string | null | undefined): DishFeedCursor | null {
  if (!cursor) {
    return null;
  }
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { createdAt?: string; id?: string };
    if (!parsed.createdAt || !parsed.id) {
      return null;
    }
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }
    return { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function encodeCursor(cursor: DishFeedCursor): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    }),
    "utf8",
  ).toString("base64url");
}

export async function listDishFeed(args: {
  limit?: number;
  cursor?: string | null;
}): Promise<DishFeedResponse> {
  const limit = toSafeLimit(args.limit);
  const cursor = decodeCursor(args.cursor);

  const items = await prisma.dish.findMany({
    where: {
      isHidden: false,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      prompt: true,
      imageUrl: true,
      createdAt: true,
      user: {
        select: {
          name: true,
        },
      },
      botMeta: {
        select: {
          id: true,
        },
      },
    },
  });

  const hasMore = items.length > limit;
  const visible = hasMore ? items.slice(0, limit) : items;
  const last = visible.at(-1);

  return {
    items: visible.map((item) => ({
      id: item.id,
      prompt: item.prompt,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt.toISOString(),
      authorType: item.botMeta ? "bot" : "user",
      authorLabel: item.botMeta ? "AI Chef" : item.user.name,
    })),
    nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
  };
}
