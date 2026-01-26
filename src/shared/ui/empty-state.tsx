import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-200 bg-white p-6 text-center text-neutral-600">
      <strong className="text-base font-semibold text-neutral-900">{title}</strong>
      {description ? <p className="text-sm text-neutral-500">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
