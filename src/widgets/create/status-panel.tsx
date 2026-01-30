export type StepStatus = "idle" | "active" | "done" | "error";

export type StepItem = {
  title: string;
  description: string;
  status: StepStatus;
};

type StatusPanelProps = {
  errorMessage?: string;
  steps: StepItem[];
};

const statusStyles: Record<StepStatus, string> = {
  idle: "border-white/10 text-white/50",
  active: "border-primary/40 text-white",
  done: "border-emerald-400/50 text-emerald-200",
  error: "border-red-500/40 text-red-300",
};

export default function StatusPanel({ errorMessage, steps }: StatusPanelProps) {
  return (
    <div className="flex min-h-[520px] flex-col rounded-3xl border border-white/10 bg-card p-6">
      <h3 className="text-xl font-bold">The Pass</h3>
      {errorMessage ? (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}
      <ol className="mt-6 space-y-4">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={`flex items-start gap-4 rounded-2xl border bg-background/40 p-4 ${
              statusStyles[step.status]
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-xs font-semibold">
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-xs text-white/60">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
