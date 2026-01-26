"use client";

import type { ReactNode } from "react";

type RestrictedStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function RestrictedState({
  title = "제한된 콘텐츠",
  description = "정책 또는 안전 사유로 제한되었습니다.",
  action,
}: RestrictedStateProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-amber-400/40 bg-amber-500/10 p-6 text-center text-amber-100">
      <strong className="text-base font-semibold text-white">{title}</strong>
      <p className="text-sm text-amber-100/80">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
