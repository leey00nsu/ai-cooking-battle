type StatusPanelProps = {
  status: "GUEST" | "AUTH" | "ELIGIBLE" | "LIMITED";
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

export default function StatusPanel({ status }: StatusPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
        Status
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
        <span className="text-sm text-neutral-300">{status}</span>
      </div>
      <p className="mt-3 text-sm text-neutral-400">{STATUS_DESCRIPTION[status]}</p>
    </section>
  );
}
