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

async function getJson<T>(path: string) {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as T;
}

export default async function Home() {
  const themePromise = getJson<ThemeResponse>("/api/theme/today");
  const slotPromise = getJson<SlotResponse>("/api/slots/summary");
  const mePromise = getJson<MeResponse>("/api/me");
  const feedPromise = getJson<FeedResponse>("/api/feed?limit=8");

  const [theme, slotSummary, me, matchFeed] = await Promise.all([
    themePromise,
    slotPromise,
    mePromise,
    feedPromise,
  ]);

  const dayKey = theme?.dayKey;
  const snapshotTop = dayKey
    ? await getJson<SnapshotResponse>(`/api/snapshot/${dayKey}`)
    : null;

  return (
    <HomeScreen
      theme={theme}
      slotSummary={slotSummary}
      snapshotTop={snapshotTop}
      matchFeed={matchFeed}
      userStatus={me?.status ?? "GUEST"}
    />
  );
}
