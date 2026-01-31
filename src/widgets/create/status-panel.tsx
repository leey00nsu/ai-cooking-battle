import { AlertCircle, Check, LoaderCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/shared/ui/shadcn/stepper";

type StepStatus = "idle" | "active" | "done" | "error";

export type StepItem = {
  title: string;
  description: string;
  status: StepStatus;
};

type StatusPanelProps = {
  errorMessage?: string;
  steps: StepItem[];
};

function resolveActiveStep(steps: StepItem[]) {
  const activeIndex = steps.findIndex((step) => step.status === "active");
  const errorIndex = steps.findIndex((step) => step.status === "error");
  if (activeIndex >= 0) {
    return activeIndex + 1;
  }
  if (errorIndex >= 0) {
    return errorIndex + 1;
  }
  return steps.length > 0 ? steps.length : 1;
}

export default function StatusPanel({ errorMessage, steps }: StatusPanelProps) {
  const activeStep = resolveActiveStep(steps);

  return (
    <Card tone="solid" className="min-h-[520px]">
      <CardHeader>
        <CardTitle className="text-xl">The Pass</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Stepper
          value={activeStep}
          orientation="vertical"
          indicators={{
            completed: <Check className="size-4" />,
            loading: <LoaderCircleIcon className="size-4 animate-spin" />,
          }}
        >
          <StepperNav>
            {steps.map((step, index) => (
              <StepperItem
                key={`${step.title}-${index}`}
                step={index + 1}
                completed={step.status === "done"}
                loading={step.status === "active"}
                className="relative items-start not-last:flex-1"
              >
                <StepperTrigger className="items-start pb-12 last:pb-0 gap-2.5">
                  <StepperIndicator
                    className={
                      step.status === "error"
                        ? "border border-red-500 bg-red-500 text-white data-[state=active]:bg-red-500 data-[state=active]:text-white"
                        : "data-[state=completed]:bg-green-500 data-[state=completed]:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-gray-500"
                    }
                  >
                    {step.status === "error" ? <AlertCircle className="size-4" /> : index + 1}
                  </StepperIndicator>
                  <div className="mt-0.5 text-left">
                    <StepperTitle className={step.status === "error" ? "text-red-300" : undefined}>
                      {step.title}
                    </StepperTitle>
                    <StepperDescription
                      className={step.status === "error" ? "text-red-400" : undefined}
                    >
                      {step.status === "error" && errorMessage ? errorMessage : step.description}
                    </StepperDescription>
                  </div>
                </StepperTrigger>
                {index < steps.length - 1 ? (
                  <StepperSeparator className="absolute inset-y-0 top-7 left-3 -order-1 m-0 -translate-x-1/2 group-data-[orientation=vertical]/stepper-nav:h-[calc(100%-2rem)] group-data-[state=completed]/step:bg-green-500" />
                ) : null}
              </StepperItem>
            ))}
          </StepperNav>
        </Stepper>
      </CardContent>
    </Card>
  );
}
