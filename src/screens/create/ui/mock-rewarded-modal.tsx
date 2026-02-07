"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/shadcn/dialog";

const MOCK_VIDEO_SRC = "/ads/mock-reward.mp4";
const MOCK_DURATION_SECONDS = 6;

type MockRewardedModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onGrant: () => void;
};

export default function MockRewardedModal({ isOpen, onClose, onGrant }: MockRewardedModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(MOCK_DURATION_SECONDS);
  const [hasEnded, setHasEnded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSecondsLeft(MOCK_DURATION_SECONDS);
    setHasEnded(false);
    setHasError(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || hasEnded || secondsLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [hasEnded, isOpen, secondsLeft]);

  const canGrant = hasEnded || secondsLeft <= 0 || hasError;
  const statusLabel = hasError
    ? "영상 재생에 실패했습니다."
    : hasEnded
      ? "시청 완료"
      : `남은 시간 ${secondsLeft}s`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm border-white/10 bg-[#0b0a08] p-4 shadow-[0_30px_60px_rgba(0,0,0,0.45)]">
        <div className="mb-3 flex items-center justify-between text-sm font-semibold text-white/70">
          <DialogTitle className="text-sm font-semibold text-white/70">
            Mock Rewarded Ad
          </DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:bg-white/10"
            >
              닫기
            </button>
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          모의 보상형 광고 영상을 재생합니다. 재생 완료 후 보상이 지급됩니다.
        </DialogDescription>

        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[24px] bg-black">
          <video
            src={MOCK_VIDEO_SRC}
            autoPlay
            muted
            playsInline
            onEnded={() => setHasEnded(true)}
            onError={() => setHasError(true)}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 text-center">
            <div className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
              Rewarded Video
            </div>
            <p className="text-sm font-semibold text-white/90">보상형 광고 재생 중</p>
            <p className="text-xs text-white/60">영상이 끝나면 보상이 지급됩니다</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-white/60">
          <span>Mock Mode</span>
          <span>{statusLabel}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="h-11 flex-1" onClick={onClose}>
            나중에 보기
          </Button>
          <Button variant="cta" className="h-11 flex-1" onClick={onGrant} disabled={!canGrant}>
            보상 받기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
