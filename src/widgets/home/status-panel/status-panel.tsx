import type { ReactNode } from "react";
import { Zap } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Pill } from "@/shared/ui/pill";

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

const STATUS_TONES: Record<
  StatusPanelProps["status"],
  "neutral" | "success" | "primary" | "danger"
> = {
  GUEST: "neutral",
  AUTH: "success",
  ELIGIBLE: "primary",
  LIMITED: "danger",
};

const STATUS_DESCRIPTION: Record<StatusPanelProps["status"], string> = {
  GUEST: "로그인하면 생성과 출전에 참여할 수 있어요.",
  AUTH: "오늘의 주제로 요리를 만들어 보세요.",
  ELIGIBLE: "대표작과 출전이 완료되었습니다.",
  LIMITED: "안전/정책 사유로 제한 상태입니다.",
};

export default function StatusPanel({ status, cta }: StatusPanelProps) {
  return (
    <Card
      className="relative flex flex-1 flex-col justify-center overflow-hidden p-8"
      tone="solid"
    >
      <Zap
        aria-hidden
        className="pointer-events-none absolute right-6 top-6 h-24 w-24 text-white/5 sm:h-32 sm:w-32"
        strokeWidth={1.5}
      />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Pill size="label" tone="neutral">
            STATUS: {status}
          </Pill>
          <Pill size="label" tone="success">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            ONLINE
          </Pill>
          <Pill tone={STATUS_TONES[status]}>
            {STATUS_LABELS[status]}
          </Pill>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-white">Ready to Battle?</h2>
          <p className="text-base leading-relaxed text-white/70">{STATUS_DESCRIPTION[status]}</p>
        </div>
        {cta ? <div className="pt-2">{cta}</div> : null}
      </div>
    </Card>
  );
}
