import { headers } from "next/headers";
import type { DishDetailResponse } from "@/entities/dish/model/types";
import DishDetailScreen from "@/screens/dish-detail/ui/dish-detail-screen";

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
      return { data: (await response.json()) as T, error: true, status: response.status };
    }
    return { data: (await response.json()) as T, error: false, status: response.status };
  } catch {
    return { data: null, error: true, status: null };
  }
}

type DishDetailPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function DishDetailPage({ params }: DishDetailPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const dishId = resolvedParams.id?.toString().trim() ?? "";
  const encodedId = encodeURIComponent(dishId);

  const detailResult = await getJson<DishDetailResponse>(`/api/dishes/${encodedId}`);
  const payload = detailResult.data;

  if (!payload || detailResult.error) {
    if (payload?.ok === false) {
      if (payload.code === "DISH_RESTRICTED") {
        return <DishDetailScreen status="restricted" />;
      }
      if (payload.code === "DISH_NOT_FOUND" || payload.code === "INVALID_DISH_ID") {
        return <DishDetailScreen status="notFound" />;
      }
    }
    return <DishDetailScreen status="error" />;
  }

  if (!payload.ok) {
    return <DishDetailScreen status="error" />;
  }

  return (
    <DishDetailScreen
      status={payload.score.status}
      detail={{
        dish: payload.dish,
        author: payload.author,
        theme: payload.theme,
        score: payload.score,
      }}
    />
  );
}
