import type { RankingArchiveResponse } from "@/entities/ranking/model/types";
import RankingScreen from "@/screens/ranking/ui/ranking-screen";
import { getJson } from "@/shared/api/server-fetch";

type MeResponse = {
  status: "GUEST" | "AUTH" | "ELIGIBLE" | "LIMITED";
};

const RANKING_ARCHIVE_LIMIT = 12;
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type RankingPageProps = {
  params: Promise<{ dayKey: string }> | { dayKey: string };
};

export default async function RankingPage({ params }: RankingPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const dayKey = resolvedParams.dayKey?.toString().trim() ?? "";
  if (!DAY_KEY_PATTERN.test(dayKey)) {
    return <RankingScreen dayKey={dayKey} status="error" initialData={null} />;
  }

  const meResult = await getJson<MeResponse>("/api/me");
  const userStatus = meResult.data?.status ?? "GUEST";
  const isRestricted = userStatus === "LIMITED";
  if (isRestricted) {
    return <RankingScreen dayKey={dayKey} status="restricted" initialData={null} />;
  }

  const rankingResult = await getJson<RankingArchiveResponse>(
    `/api/ranking/${encodeURIComponent(dayKey)}?view=archive&limit=${RANKING_ARCHIVE_LIMIT}`,
  );
  if (rankingResult.error) {
    return <RankingScreen dayKey={dayKey} status="error" initialData={null} />;
  }

  if (!rankingResult.data || rankingResult.data.items.length === 0) {
    return <RankingScreen dayKey={dayKey} status="empty" initialData={rankingResult.data} />;
  }

  return <RankingScreen dayKey={dayKey} status="ready" initialData={rankingResult.data} />;
}
