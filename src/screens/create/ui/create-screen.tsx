"use client";

import { useForm } from "react-hook-form";
import { useCreateFlow } from "@/screens/create/model/use-create-flow";
import PreviewPanel from "@/screens/create/ui/preview-panel";
import StatusPanel, { type StepItem } from "@/screens/create/ui/status-panel";

type CreateFormValues = {
  prompt: string;
};

const fallbackSteps: StepItem[] = [
  {
    title: "Prompt Validation",
    description: "Waiting for prompt",
    status: "idle",
  },
  {
    title: "Slot Reservation",
    description: "Queued",
    status: "idle",
  },
  {
    title: "AI Cooking",
    description: "Estimated: 12s",
    status: "idle",
  },
  {
    title: "Safety Check",
    description: "Final polish",
    status: "idle",
  },
];

export default function CreateScreen() {
  const { state, steps, start } = useCreateFlow();
  const { register, handleSubmit, watch } = useForm<CreateFormValues>({
    defaultValues: {
      prompt: "",
    },
  });
  const promptValue = watch("prompt") ?? "";
  const promptLength = promptValue.length;

  const handleFormSubmit = (data: CreateFormValues) => {
    void start(data.prompt);
  };

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="flex flex-col gap-6 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">Chef&apos;s Station</h2>
              <span className="rounded-full border border-white/10 bg-card/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Prompt Guide
              </span>
            </div>

            <form className="flex flex-col gap-6" onSubmit={handleSubmit(handleFormSubmit)}>
              <div className="rounded-3xl border border-white/10 bg-card p-6">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                  <span>Dish Prompt</span>
                  <span>{promptLength} / 500</span>
                </div>
                <div className="mt-4">
                  <textarea
                    {...register("prompt", { maxLength: 500 })}
                    rows={8}
                    maxLength={500}
                    placeholder="Describe a legendary dish..."
                    className="min-h-[220px] w-full resize-none rounded-2xl border border-dashed border-white/10 bg-background/40 p-4 text-base text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-white/60">
                  <span>History</span>
                  <span>Inspire Me</span>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-[var(--shadow-glow-md)]"
              >
                Verify &amp; Generate
              </button>
            </form>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#2a241e] to-[#1e1915] p-6">
              <div className="relative z-10">
                <h3 className="text-lg font-bold">Out of credits?</h3>
                <p className="mt-2 text-sm text-white/60">
                  Watch a short ad to refuel your kitchen with +1 Generation Slot.
                </p>
              </div>
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
            </div>
          </section>

          <aside className="flex flex-col gap-6 lg:col-span-5">
            <StatusPanel
              errorMessage={state.errorMessage ?? undefined}
              steps={steps.length ? steps : fallbackSteps}
            />
            <PreviewPanel imageUrl={state.imageUrl} />
          </aside>
        </div>
      </main>
    </div>
  );
}
