import Link from "next/link";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { RestrictedState } from "@/shared/ui/restricted-state";

export function SnapshotRestrictedState() {
  return (
    <RestrictedState
      title="스냅샷 접근 제한"
      description="현재 계정 상태에서는 Hall of Fame을 볼 수 없습니다."
      action={
        <Link className="text-sm font-semibold text-white underline underline-offset-4" href="/">
          홈으로 이동
        </Link>
      }
    />
  );
}

export function SnapshotErrorState() {
  return (
    <ErrorState
      title="스냅샷을 불러오지 못했습니다"
      description="잠시 후 다시 시도해주세요."
      action={
        <Link className="text-sm font-semibold text-white underline underline-offset-4" href="/">
          홈으로 이동
        </Link>
      }
    />
  );
}

export function SnapshotEmptyState() {
  return (
    <EmptyState
      title="해당 날짜의 스냅샷이 없습니다"
      description="다른 날짜를 선택하거나 잠시 후 다시 확인해주세요."
      action={
        <Link className="text-sm font-semibold text-white underline underline-offset-4" href="/">
          홈으로 이동
        </Link>
      }
    />
  );
}
