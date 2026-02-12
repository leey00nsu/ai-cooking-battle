import { headers } from "next/headers";
import type { SnapshotTop } from "@/entities/snapshot/model/types";
import SnapshotScreen from "@/screens/snapshot/ui/snapshot-screen";

type MeResponse = {
  status: "GUEST" | "AUTH" | "ELIGIBLE" | "LIMITED";
};

type FetchResult<T> = {
  data: T | null;
  error: boolean;
  status: number | null;
};

const SNAPSHOT_PAGE_COUNT = 10;
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

type SnapshotPageProps = {
  params: Promise<{ dayKey: string }> | { dayKey: string };
};

export default async function SnapshotPage({ params }: SnapshotPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const dayKey = resolvedParams.dayKey?.toString().trim() ?? "";
  if (!DAY_KEY_PATTERN.test(dayKey)) {
    return <SnapshotScreen dayKey={dayKey} status="error" snapshotTop={null} />;
  }

  const meResult = await getJson<MeResponse>("/api/me");
  const userStatus = meResult.data?.status ?? "GUEST";
  const isRestricted = userStatus === "LIMITED";
  if (isRestricted) {
    return <SnapshotScreen dayKey={dayKey} status="restricted" snapshotTop={null} />;
  }

  const snapshotResult = await getJson<SnapshotTop>(
    `/api/snapshot/${encodeURIComponent(dayKey)}?count=${SNAPSHOT_PAGE_COUNT}`,
  );
  if (snapshotResult.error) {
    return <SnapshotScreen dayKey={dayKey} status="error" snapshotTop={null} />;
  }

  if (!snapshotResult.data || snapshotResult.data.items.length === 0) {
    return <SnapshotScreen dayKey={dayKey} status="empty" snapshotTop={snapshotResult.data} />;
  }

  return <SnapshotScreen dayKey={dayKey} status="ready" snapshotTop={snapshotResult.data} />;
}
