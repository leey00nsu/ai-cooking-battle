import type { DishDetail } from "@/entities/dish/model/types";
import { EmptyState } from "@/shared/ui/empty-state";
import { SectionHeading } from "@/shared/ui/section-heading";
import { Surface } from "@/shared/ui/surface";

type DishAnalysisPanelProps = {
  detail: DishDetail;
};

function toSafeScore(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value);
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DishAnalysisPanel({ detail }: DishAnalysisPanelProps) {
  if (detail.score.status === "pending") {
    return (
      <Surface className="h-full p-6 md:p-8" radius="3xl" tone="card">
        <SectionHeading title="AI Analysis" description="점수와 분석 근거를 생성하고 있습니다." />
        <div className="mt-6">
          <EmptyState title="AI 분석을 생성 중입니다." description="잠시 후 다시 확인해주세요." />
        </div>
      </Surface>
    );
  }

  const total = toSafeScore(detail.score.total);
  const themeFit = toSafeScore(detail.score.themeFit);
  const execution = toSafeScore(detail.score.execution);

  return (
    <Surface className="h-full p-6 md:p-8" radius="3xl" tone="card">
      <SectionHeading
        title="AI Analysis"
        description="오늘의 주제와 요리 실행 완성도를 종합해 평가했습니다."
      />

      <div className="mt-6 space-y-6">
        <Surface className="p-5" radius="2xl" tone="soft">
          <p className="text-xs uppercase tracking-[0.12em] text-white/60">Total Score</p>
          <p className="mt-2 text-5xl font-bold leading-none text-white">{total}</p>
          <div className="mt-5 space-y-4">
            <ScoreBar label="Theme Fit" value={themeFit} />
            <ScoreBar label="Execution" value={execution} />
          </div>
        </Surface>

        <Surface className="p-5" radius="2xl" tone="soft">
          <h3 className="text-base font-semibold text-white">AI Chef's Verdict</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            {detail.score.oneLiner ?? "요리 분석 코멘트를 준비 중입니다."}
          </p>
          {detail.score.reasons && detail.score.reasons.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              {detail.score.reasons.map((reason, index) => (
                <li key={`${reason}-${index + 1}`} className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Surface>

        <Surface className="p-5" radius="2xl" tone="accentSoft">
          <p className="text-xs uppercase tracking-[0.12em] text-primary">Improvement Tip</p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">
            {detail.score.tip ?? "다음 생성에서 재료 질감 대비를 더 살려보세요."}
          </p>
        </Surface>
      </div>
    </Surface>
  );
}

export { DishAnalysisPanel };
