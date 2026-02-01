import { ChefHat, Sparkles, Star } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

type AdRewardSuccessProps = {
  onPrimary: () => void;
  onSecondary?: () => void;
};

export default function AdRewardSuccess({ onPrimary, onSecondary }: AdRewardSuccessProps) {
  return (
    <Card className="relative overflow-hidden border border-primary/20 bg-[#241a12]">
      <CardContent className="flex flex-col items-center gap-6 px-6 py-8 text-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 h-20 w-20 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative">
            <ChefHat className="h-16 w-16 text-primary drop-shadow" />
            <Sparkles className="absolute -right-3 -top-2 h-5 w-5 text-yellow-200" />
            <Star className="absolute -left-4 bottom-0 h-4 w-4 text-primary" />
            <div className="absolute -bottom-2 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-[#1b150f] shadow-[0_0_12px_rgba(244,157,37,0.6)]">
              +1
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white">Slot Granted!</h3>
          <p className="text-sm text-white/60">
            오늘 사용할 수 있는 <span className="text-primary">보너스 슬롯 1개</span>가
            충전되었습니다.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button intent="cta" className="h-12 w-full text-base" onClick={onPrimary}>
            지금 요리 시작하기
          </Button>
          {onSecondary ? (
            <Button intent="ghost" size="sm" onClick={onSecondary}>
              나중에 보기
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
