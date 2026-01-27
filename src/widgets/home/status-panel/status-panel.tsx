import type { ReactNode } from "react";
import { Zap } from "lucide-react";

type StatusPanelProps = {
  status: "GUEST" | "AUTH" | "ELIGIBLE" | "LIMITED";
  cta?: ReactNode;
};

const STATUS_LABELS: Record<StatusPanelProps["status"], string> = {
  GUEST: "게스트",
  AUTH: "로그인",
  ELIGIBLE: "출전 가능",
  LIMITED: "제한됨",
};

const STATUS_STYLES: Record<StatusPanelProps["status"], string> = {
  GUEST: "bg-white/10 text-white",
  AUTH: "bg-emerald-500/20 text-emerald-200",
  ELIGIBLE: "bg-amber-400/20 text-amber-200",
  LIMITED: "bg-rose-500/20 text-rose-200",
};

const STATUS_DESCRIPTION: Record<StatusPanelProps["status"], string> = {
  GUEST: "로그인하면 생성과 출전에 참여할 수 있어요.",
  AUTH: "오늘의 주제로 요리를 만들어 보세요.",
  ELIGIBLE: "대표작과 출전이 완료되었습니다.",
  LIMITED: "안전/정책 사유로 제한 상태입니다.",
};

export default function StatusPanel({ status, cta }: StatusPanelProps) {
  return (
    <section className="relative flex flex-1 flex-col justify-center overflow-hidden rounded-[2rem] border border-white/5 bg-neutral-900 p-8">
      <Zap
        aria-hidden
        className="pointer-events-none absolute right-6 top-6 h-24 w-24 text-white/5 sm:h-32 sm:w-32"
        strokeWidth={1.5}
      />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-white">
            STATUS: {status}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold tracking-wide text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            ONLINE
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-white">Ready to Battle?</h2>
          <p className="text-base leading-relaxed text-white/70">{STATUS_DESCRIPTION[status]}</p>
        </div>
        {cta ? <div className="pt-2">{cta}</div> : null}
      </div>
    </section>
  );
}
