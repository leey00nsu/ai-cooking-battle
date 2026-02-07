import { ChefHat, Play, Timer } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

type AdRewardRequestProps = {
  title: string;
  description: string;
  statusLabel: string;
  message?: string | null;
  primaryLabel: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  isPrimaryDisabled?: boolean;
  remainingLabel?: string;
};

export default function AdRewardRequest({
  title,
  description,
  statusLabel,
  message,
  primaryLabel,
  onPrimary,
  onSecondary,
  isPrimaryDisabled,
  remainingLabel,
}: AdRewardRequestProps) {
  return (
    <Card className="relative overflow-hidden" tone="accent">
      <CardContent className="flex flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-black/20">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
              <ChefHat className="relative z-10 h-8 w-8 text-primary" />
              <div className="absolute -top-1 -right-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-[#1b150f]">
                +1
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                Rewarded Ad
              </p>
              <p className="text-lg font-bold">{title}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-white/70">
          <p>{description}</p>
          <p className="text-xs font-semibold text-white/60">{statusLabel}</p>
          {message ? <p className="text-xs text-white/50">{message}</p> : null}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="cta"
            className="h-12 w-full text-base"
            onClick={onPrimary}
            disabled={isPrimaryDisabled}
          >
            <span className="flex items-center justify-center gap-2">
              <Play className="h-5 w-5" />
              {primaryLabel}
            </span>
          </Button>
          {remainingLabel ? (
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs text-white/60">
              <Timer className="h-4 w-4 text-primary/80" />
              {remainingLabel}
            </div>
          ) : null}
          {onSecondary ? (
            <Button variant="ghost" size="sm" onClick={onSecondary} className="w-fit">
              나중에 보기
            </Button>
          ) : null}
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      </CardContent>
    </Card>
  );
}
