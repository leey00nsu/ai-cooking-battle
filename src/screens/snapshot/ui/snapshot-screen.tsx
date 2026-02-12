import Link from "next/link";
import type { SnapshotTop } from "@/entities/snapshot/model/types";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { RestrictedState } from "@/shared/ui/restricted-state";
import { Surface } from "@/shared/ui/surface";

type SnapshotScreenProps = {
  dayKey: string;
  snapshotTop: SnapshotTop | null;
  status: "ready" | "empty" | "error" | "restricted";
};

function SnapshotHeader({ dayKey }: { dayKey: string }) {
  return (
    <Surface className="space-y-2 p-6 md:p-8" radius="3xl" tone="card">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Hall of Fame</p>
      <h1 className="text-3xl font-black text-white md:text-4xl">Daily Theme Snapshot</h1>
      <p className="text-sm text-white/70">Archive Date: {dayKey}</p>
    </Surface>
  );
}

export default function SnapshotScreen({ dayKey, snapshotTop, status }: SnapshotScreenProps) {
  const itemCount = snapshotTop?.items.length ?? 0;

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <SnapshotHeader dayKey={dayKey} />

        {status === "restricted" ? (
          <RestrictedState
            title="스냅샷 접근 제한"
            description="현재 계정 상태에서는 Hall of Fame을 볼 수 없습니다."
          />
        ) : null}

        {status === "error" ? (
          <ErrorState
            title="스냅샷을 불러오지 못했습니다"
            description="잠시 후 다시 시도해주세요."
            action={
              <Link
                className="text-sm font-semibold text-white underline underline-offset-4"
                href="/"
              >
                홈으로 이동
              </Link>
            }
          />
        ) : null}

        {status === "empty" ? (
          <EmptyState
            title="해당 날짜의 스냅샷이 없습니다"
            description="다른 날짜를 선택하거나 잠시 후 다시 확인해주세요."
            action={
              <Link
                className="text-sm font-semibold text-white underline underline-offset-4"
                href="/"
              >
                홈으로 이동
              </Link>
            }
          />
        ) : null}

        {status === "ready" && snapshotTop ? (
          <section className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-bold text-white md:text-2xl">Top {itemCount}</h2>
              <span className="text-sm text-white/60">dayKey: {snapshotTop.dayKey}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {snapshotTop.items.map((entry) => (
                <Surface
                  key={`${snapshotTop.dayKey}-${entry.rank}`}
                  className="overflow-hidden p-0"
                  radius="2xl"
                  tone="cardMuted"
                  interactive="border"
                >
                  <div className="relative h-48 w-full bg-card">
                    <img
                      alt={`rank-${entry.rank}-${entry.dishName}`}
                      className="h-full w-full object-cover"
                      src={entry.imageUrl}
                    />
                    <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                      #{entry.rank}
                    </div>
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="text-sm font-semibold text-primary">{entry.score.toFixed(1)}</p>
                    <p className="line-clamp-1 text-base font-bold text-white">{entry.dishName}</p>
                    <p className="line-clamp-1 text-xs text-white/60">{entry.authorName}</p>
                    <Link
                      className="inline-flex pt-2 text-sm font-semibold text-white underline underline-offset-4"
                      href={`/dishes/${entry.dishId}`}
                    >
                      상세 보기
                    </Link>
                  </div>
                </Surface>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
