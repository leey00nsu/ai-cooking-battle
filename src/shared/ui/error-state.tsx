import type { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function ErrorState({
  title = "문제가 발생했습니다",
  description = "잠시 후 다시 시도해주세요.",
  action,
}: ErrorStateProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-rose-400/40 bg-rose-500/10 p-6 text-center text-rose-100">
      <strong className="text-base font-semibold text-white">{title}</strong>
      <p className="text-sm text-rose-100/80">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
