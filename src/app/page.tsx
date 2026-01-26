import type { MatchFeed } from "@/entities/match/model/types";
import type { SnapshotTop } from "@/entities/snapshot/model/types";
import type { SlotSummary } from "@/entities/slot/model/types";
import type { Theme } from "@/entities/theme/model/types";
import HomeScreen from "@/screens/home/ui/home-screen";
import { headers } from "next/headers";

type ThemeResponse = Theme;
type SlotResponse = SlotSummary;
type SnapshotResponse = SnapshotTop;
type FeedResponse = MatchFeed;
type MeResponse = {
  status: "GUEST" | "AUTH" | "ELIGIBLE" | "LIMITED";
};
type FetchResult<T> = {
  data: T | null;
  error: boolean;
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
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return { data: null, error: true };
    }
    return { data: (await response.json()) as T, error: false };
  } catch {
    return { data: null, error: true };
  }
}

export default async function Home() {
  const themePromise = getJson<ThemeResponse>("/api/theme/today");
  const slotPromise = getJson<SlotResponse>("/api/slots/summary");
  const mePromise = getJson<MeResponse>("/api/me");
  const feedPromise = getJson<FeedResponse>("/api/feed?limit=8");

  const [themeResult, slotResult, meResult, feedResult] = await Promise.all([
    themePromise,
    slotPromise,
    mePromise,
    feedPromise,
  ]);

  const dayKey = themeResult.data?.dayKey;
  const snapshotResult = dayKey
    ? await getJson<SnapshotResponse>(`/api/snapshot/${dayKey}`)
    : { data: null, error: false };

  const userStatus = meResult.data?.status ?? "GUEST";
  const isRestricted = userStatus === "LIMITED";

  return (
    <HomeScreen
      theme={themeResult.data}
      slotSummary={slotResult.data}
      snapshotTop={snapshotResult.data}
      matchFeed={feedResult.data}
      userStatus={userStatus}
      isRestricted={isRestricted}
      isThemeError={themeResult.error}
      isSlotError={slotResult.error}
      isSnapshotError={snapshotResult.error}
      isMatchError={feedResult.error}
    />
  );
}
