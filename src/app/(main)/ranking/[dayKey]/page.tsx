import { headers } from "next/headers";
import type { RankingTop } from "@/entities/ranking/model/types";
import RankingScreen from "@/screens/ranking/ui/ranking-screen";

type MeResponse = {
  status: "GUEST" | "AUTH" | "ELIGIBLE" | "LIMITED";
};

type FetchResult<T> = {
  data: T | null;
  error: boolean;
  status: number | null;
};

const RANKING_PAGE_COUNT = 10;
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

type RankingPageProps = {
  params: Promise<{ dayKey: string }> | { dayKey: string };
};

export default async function RankingPage({ params }: RankingPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const dayKey = resolvedParams.dayKey?.toString().trim() ?? "";
  if (!DAY_KEY_PATTERN.test(dayKey)) {
    return <RankingScreen dayKey={dayKey} status="error" rankingTop={null} />;
  }

  const meResult = await getJson<MeResponse>("/api/me");
  const userStatus = meResult.data?.status ?? "GUEST";
  const isRestricted = userStatus === "LIMITED";
  if (isRestricted) {
    return <RankingScreen dayKey={dayKey} status="restricted" rankingTop={null} />;
  }

  const rankingResult = await getJson<RankingTop>(
    `/api/ranking/${encodeURIComponent(dayKey)}?count=${RANKING_PAGE_COUNT}`,
  );
  if (rankingResult.error) {
    return <RankingScreen dayKey={dayKey} status="error" rankingTop={null} />;
  }

  if (!rankingResult.data || rankingResult.data.items.length === 0) {
    return <RankingScreen dayKey={dayKey} status="empty" rankingTop={rankingResult.data} />;
  }

  return <RankingScreen dayKey={dayKey} status="ready" rankingTop={rankingResult.data} />;
}
