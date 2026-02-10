import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Surface } from "@/shared/ui/surface";

function DishDetailErrorState() {
  return (
    <Surface className="p-6 md:p-8" radius="3xl" tone="card">
      <ErrorState
        title="요리 상세 정보를 불러오지 못했습니다."
        description="잠시 후 다시 시도해 주세요."
        action={
          <Button asChild className="h-10 px-5" variant="outline">
            <Link href="/feed">피드로 이동</Link>
          </Button>
        }
      />
    </Surface>
  );
}

function DishDetailNotFoundState() {
  return (
    <Surface className="p-6 md:p-8" radius="3xl" tone="cardMuted">
      <EmptyState
        title="요리를 찾을 수 없습니다."
        description="삭제되었거나 잘못된 접근일 수 있습니다."
        action={
          <Button asChild className="h-10 px-5" variant="outline">
            <Link href="/feed">피드로 이동</Link>
          </Button>
        }
      />
    </Surface>
  );
}

function DishDetailRestrictedState() {
  return (
    <Surface className="p-6 md:p-8" radius="3xl" tone="overlayDanger">
      <EmptyState
        title="제한된 요리입니다."
        description="운영 정책에 따라 현재 노출할 수 없습니다."
        action={
          <Button asChild className="h-10 px-5" variant="outline">
            <Link href="/feed">피드로 이동</Link>
          </Button>
        }
      />
    </Surface>
  );
}

export { DishDetailErrorState, DishDetailNotFoundState, DishDetailRestrictedState };
