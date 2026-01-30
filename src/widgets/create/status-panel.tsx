import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type StepStatus = "idle" | "active" | "done" | "error";

type StepItem = {
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
    <Card tone="solid" className="min-h-[520px]">
      <CardHeader>
        <CardTitle className="text-xl">The Pass</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {errorMessage ? (
          <Card tone="accent" className="border border-red-500/30 bg-red-500/10 text-red-100">
            <CardContent className="py-4 text-sm">{errorMessage}</CardContent>
          </Card>
        ) : null}
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className={`flex items-start gap-4 rounded-2xl border bg-background/40 p-4 ${
                statusStyles[step.status]
              }`}
            >
              <Badge variant="icon" className="h-8 w-8 rounded-full p-0">
                <span className="text-xs font-semibold">{index + 1}</span>
              </Badge>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-white/60">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
