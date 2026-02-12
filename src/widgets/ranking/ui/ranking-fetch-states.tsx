import Link from "next/link";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { RestrictedState } from "@/shared/ui/restricted-state";

export function RankingRestrictedState() {
  return (
    <RestrictedState
      title="오늘의 랭킹 접근 제한"
      description="현재 계정 상태에서는 오늘의 랭킹을 볼 수 없습니다."
      action={
        <Link className="text-sm font-semibold text-white underline underline-offset-4" href="/">
          홈으로 이동
        </Link>
      }
    />
  );
}

export function RankingErrorState() {
  return (
    <ErrorState
      title="오늘의 랭킹을 불러오지 못했습니다"
      description="잠시 후 다시 시도해주세요."
      action={
        <Link className="text-sm font-semibold text-white underline underline-offset-4" href="/">
          홈으로 이동
        </Link>
      }
    />
  );
}

export function RankingEmptyState() {
  return (
    <EmptyState
      title="해당 날짜의 랭킹이 없습니다"
      description="다른 날짜를 선택하거나 잠시 후 다시 확인해주세요."
      action={
        <Link className="text-sm font-semibold text-white underline underline-offset-4" href="/">
          홈으로 이동
        </Link>
      }
    />
  );
}
