import { headers } from "next/headers";
import type { MatchFeed } from "@/entities/match/model/types";
import type { RankingTop } from "@/entities/ranking/model/types";
import type { SlotSummary } from "@/entities/slot/model/types";
import type { Theme } from "@/entities/theme/model/types";
import HomeScreen from "@/screens/home/ui/home-screen";

type ThemeResponse = Theme;
type SlotResponse = SlotSummary;
type PublicSlotResponse = Pick<
  SlotSummary,
  "freeLimit" | "freeUsedCount" | "adLimit" | "adUsedCount"
>;
type RankingResponse = RankingTop;
type FeedResponse = MatchFeed;
type MeResponse = {
  status: "GUEST" | "AUTH" | "ELIGIBLE" | "LIMITED";
};

const HOME_MATCH_FEED_LIMIT = 8;
const HOME_MATCH_FEED_API_PATH = `/api/home/matches?limit=${HOME_MATCH_FEED_LIMIT}`;
const HOME_RANKING_LIMIT = 4;

type FetchResult<T> = {
  data: T | null;
  error: boolean;
  status: number | null;
};

async function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (!host) {
    return "http://localhost:3000";
  }
  return `${proto}://${host}`;
}

async function getJson<T>(path: string): Promise<FetchResult<T>> {
  const baseUrl = await getBaseUrl();
  const headerList = await headers();
  const cookie = headerList.get("cookie");
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: cookie ? { cookie } : undefined,
    });
    if (!response.ok) {
      return { data: null, error: true, status: response.status };
    }
    return { data: (await response.json()) as T, error: false, status: response.status };
  } catch {
    return { data: null, error: true, status: null };
  }
}

export default async function Home() {
  const mePromise = getJson<MeResponse>("/api/me");
  const themePromise = getJson<ThemeResponse>("/api/theme/today");
  const feedPromise = getJson<FeedResponse>(HOME_MATCH_FEED_API_PATH);

  const [meResult, themeResult, feedResult] = await Promise.all([
    mePromise,
    themePromise,
    feedPromise,
  ]);

  const dayKey = themeResult.data?.dayKey;
  const rankingResult = dayKey
    ? await getJson<RankingResponse>(`/api/ranking/${dayKey}?count=${HOME_RANKING_LIMIT}`)
    : { data: null, error: false, status: null };

  const userStatus = meResult.data?.status ?? "GUEST";
  const isRestricted = userStatus === "LIMITED";
  let slotSummary: SlotSummary | null = null;
  let isSlotError = false;
  if (userStatus === "GUEST") {
    const publicSlotResult = await getJson<PublicSlotResponse>("/api/slots/public-summary");
    isSlotError = publicSlotResult.error;
    slotSummary = publicSlotResult.data
      ? {
          ...publicSlotResult.data,
          freeDailyLimit: 0,
          activeFreeReservationCount: 0,
          canUseFreeSlotToday: false,
        }
      : null;
  } else {
    const privateSlotResult = await getJson<SlotResponse>("/api/slots/summary");
    isSlotError = privateSlotResult.error;
    slotSummary = privateSlotResult.data;
  }

  return (
    <HomeScreen
      theme={themeResult.data}
      slotSummary={slotSummary}
      rankingTop={rankingResult.data}
      matchFeed={feedResult.data}
      userStatus={userStatus}
      isRestricted={isRestricted}
      isThemeError={themeResult.error}
      isSlotError={isSlotError}
      isRankingError={rankingResult.error}
      isMatchError={feedResult.error}
    />
  );
}
