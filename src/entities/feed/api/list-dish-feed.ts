import type { DishFeedResponse, DishFeedSort } from "@/entities/feed/model/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;
const DEFAULT_SORT: DishFeedSort = "latest";
const BOT_AUTHOR_LABEL_FALLBACK = "AI Chef Bot";

type CursorPayload = {
  sort: DishFeedSort;
  id: string;
  createdAt?: string;
  title?: string;
};

type DecodedCursor = {
  id: string;
  createdAt?: Date;
  title?: string;
};

function toSafeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit) || (limit ?? 0) <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit as number), MAX_LIMIT);
}

function toSafeSort(sort: string | null | undefined): DishFeedSort {
  if (!sort) {
    return DEFAULT_SORT;
  }
  if (sort === "latest" || sort === "oldest" || sort === "title_asc" || sort === "title_desc") {
    return sort;
  }
  return DEFAULT_SORT;
}

function toSafeSearch(search: string | null | undefined): string | null {
  const trimmed = search?.trim();
  return trimmed ? trimmed : null;
}

function normalizeBotPrompt(prompt: string, personaDisplayName?: string | null) {
  const personaName = personaDisplayName?.trim();
  if (!personaName) {
    return prompt;
  }
  const suffix = ` (${personaName})`;
  if (!prompt.endsWith(suffix)) {
    return prompt;
  }
  return prompt.slice(0, -suffix.length).trimEnd();
}

function decodeCursor(
  cursor: string | null | undefined,
  expectedSort: DishFeedSort,
): DecodedCursor | null {
  if (!cursor) {
    return null;
  }
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as CursorPayload;
    if (!parsed.id || parsed.sort !== expectedSort) {
      return null;
    }
    if (expectedSort === "latest" || expectedSort === "oldest") {
      if (!parsed.createdAt) {
        return null;
      }
      const createdAt = new Date(parsed.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        return null;
      }
      return { id: parsed.id, createdAt };
    }
    if (!parsed.title) {
      return null;
    }
    return { id: parsed.id, title: parsed.title };
  } catch {
    return null;
  }
}

function encodeCursor(args: {
  sort: DishFeedSort;
  id: string;
  createdAt?: Date;
  title?: string;
}): string {
  return Buffer.from(
    JSON.stringify({
      sort: args.sort,
      id: args.id,
      createdAt: args.createdAt?.toISOString(),
      title: args.title,
    } satisfies CursorPayload),
    "utf8",
  ).toString("base64url");
}

function buildOrderBy(sort: DishFeedSort) {
  if (sort === "oldest") {
    return [{ createdAt: "asc" as const }, { id: "asc" as const }];
  }
  if (sort === "title_asc") {
    return [{ dishName: "asc" as const }, { id: "asc" as const }];
  }
  if (sort === "title_desc") {
    return [{ dishName: "desc" as const }, { id: "desc" as const }];
  }
  return [{ createdAt: "desc" as const }, { id: "desc" as const }];
}

function buildCursorWhere(sort: DishFeedSort, cursor: DecodedCursor | null) {
  if (!cursor) {
    return {};
  }
  if (sort === "latest" && cursor.createdAt) {
    return {
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ],
    };
  }
  if (sort === "oldest" && cursor.createdAt) {
    return {
      OR: [
        { createdAt: { gt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { gt: cursor.id } },
      ],
    };
  }
  if (sort === "title_asc" && cursor.title) {
    return {
      OR: [{ dishName: { gt: cursor.title } }, { dishName: cursor.title, id: { gt: cursor.id } }],
    };
  }
  if (sort === "title_desc" && cursor.title) {
    return {
      OR: [{ dishName: { lt: cursor.title } }, { dishName: cursor.title, id: { lt: cursor.id } }],
    };
  }
  return {};
}

export async function listDishFeed(args: {
  limit?: number;
  cursor?: string | null;
  mine?: boolean;
  excludeBots?: boolean;
  userId?: string | null;
  search?: string | null;
  sort?: string | null;
}): Promise<DishFeedResponse> {
  const limit = toSafeLimit(args.limit);
  const sort = toSafeSort(args.sort);
  const search = toSafeSearch(args.search);
  const mine = args.mine === true;
  const excludeBots = args.excludeBots === true;
  const userId = args.userId?.trim() ?? "";

  // Defensive guard: mine=true request must include authenticated user id.
  if (mine && !userId) {
    return { items: [], nextCursor: null };
  }

  const cursor = decodeCursor(args.cursor, sort);
  const where = {
    isHidden: false,
    ...(mine ? { userId } : {}),
    ...(excludeBots ? { botMeta: { is: null } } : {}),
    ...(search ? { dishName: { contains: search, mode: "insensitive" as const } } : {}),
    ...buildCursorWhere(sort, cursor),
  };

  const items = await prisma.dish.findMany({
    where,
    orderBy: buildOrderBy(sort),
    take: limit + 1,
    select: {
      id: true,
      dishName: true,
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
          persona: {
            select: {
              displayName: true,
            },
          },
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
      prompt: item.botMeta
        ? normalizeBotPrompt(item.dishName, item.botMeta.persona.displayName)
        : item.dishName,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt.toISOString(),
      authorType: item.botMeta ? "bot" : "user",
      authorLabel:
        item.botMeta?.persona.displayName ||
        (item.botMeta ? BOT_AUTHOR_LABEL_FALLBACK : item.user.name),
    })),
    nextCursor:
      hasMore && last
        ? encodeCursor({
            sort,
            id: last.id,
            createdAt: sort === "latest" || sort === "oldest" ? last.createdAt : undefined,
            title: sort === "title_asc" || sort === "title_desc" ? last.dishName : undefined,
          })
        : null,
  };
}
