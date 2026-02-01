"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createIdempotencyKey } from "@/features/create-flow/model/create-recovery";
import { fetchJson } from "@/shared/lib/fetch-json";
import { loadRewardedAd, type RewardedAdHandle } from "@/shared/lib/gpt-rewarded";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

type RewardRequestResponse =
  | { ok: true; rewardId: string; nonce: string; expiresAt: string | null }
  | { ok: false; code: string; message: string };

type RewardConfirmResponse =
  | { ok: true; rewardId: string; status: string }
  | { ok: false; code: string; message: string };

type AdRewardCardProps = {
  onRewardGranted: (rewardId: string) => void;
};

type RewardStatus = "idle" | "loading" | "ready" | "watching" | "success" | "error";

type RewardPayload = { rewardId: string; nonce: string };

const statusLabels: Record<RewardStatus, string> = {
  idle: "광고로 슬롯을 충전하세요",
  loading: "광고를 불러오는 중...",
  ready: "광고 시청 준비 완료",
  watching: "광고 시청 중...",
  success: "보상이 지급되었습니다",
  error: "광고 로드에 실패했습니다",
};

export default function AdRewardCard({ onRewardGranted }: AdRewardCardProps) {
  const adUnitPath = useMemo(() => process.env.NEXT_PUBLIC_GAM_REWARDED_AD_UNIT ?? "", []);
  const [status, setStatus] = useState<RewardStatus>("idle");
  const statusRef = useRef<RewardStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const rewardRef = useRef<RewardPayload | null>(null);
  const handleRef = useRef<RewardedAdHandle | null>(null);

  const cleanup = useCallback(() => {
    handleRef.current?.destroy();
    handleRef.current = null;
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleConfirmReward = useCallback(async () => {
    const payload = rewardRef.current;
    if (!payload) {
      setStatus("error");
      setMessage("보상 정보가 유효하지 않습니다.");
      return;
    }

    const response = await fetchJson<RewardConfirmResponse>("/api/ads/reward/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nonce: payload.nonce,
        idempotencyKey: createIdempotencyKey(),
      }),
    });

    if (!response.ok) {
      setStatus("error");
      setMessage(response.message ?? "보상 확정에 실패했습니다.");
      return;
    }

    setStatus("success");
    setMessage("슬롯이 충전되었습니다.");
    onRewardGranted(response.rewardId);
    rewardRef.current = null;
  }, [onRewardGranted]);

  const handleLoadRewarded = useCallback(async () => {
    if (!adUnitPath) {
      setStatus("error");
      setMessage("광고 설정이 누락되었습니다.");
      return;
    }

    if (status === "loading" || status === "watching") {
      return;
    }

    setStatus("loading");
    setMessage(null);

    let requestResponse: RewardRequestResponse;
    try {
      requestResponse = await fetchJson<RewardRequestResponse>("/api/ads/reward/request", {
        method: "POST",
      });
    } catch {
      setStatus("error");
      setMessage("보상 요청에 실패했습니다.");
      return;
    }

    if (!requestResponse.ok) {
      setStatus("error");
      setMessage(requestResponse.message ?? "보상 요청에 실패했습니다.");
      return;
    }

    rewardRef.current = {
      rewardId: requestResponse.rewardId,
      nonce: requestResponse.nonce,
    };

    try {
      handleRef.current = await loadRewardedAd({
        adUnitPath,
        callbacks: {
          onReady: (_show) => {
            setStatus("ready");
            setMessage("광고 시청 버튼을 눌러주세요.");
          },
          onGranted: async () => {
            setStatus("loading");
            setMessage("보상 확정 중...");
            await handleConfirmReward();
          },
          onClosed: () => {
            if (statusRef.current !== "success") {
              setStatus("idle");
              setMessage("광고가 닫혔습니다.");
            }
            cleanup();
          },
          onRenderEnded: (isEmpty) => {
            if (isEmpty) {
              setStatus("error");
              setMessage("현재 표시할 광고가 없습니다.");
              cleanup();
            }
          },
          onError: (errorMessage) => {
            setStatus("error");
            setMessage(errorMessage);
            cleanup();
          },
        },
      });
    } catch {
      setStatus("error");
      setMessage("광고 로딩에 실패했습니다.");
    }
  }, [adUnitPath, cleanup, handleConfirmReward, status]);

  const handleShowRewarded = useCallback(() => {
    if (!handleRef.current) {
      setStatus("error");
      setMessage("광고 준비가 완료되지 않았습니다.");
      return;
    }
    setStatus("watching");
    handleRef.current.show();
  }, []);

  const primaryLabel = status === "ready" ? "광고 보기" : "광고로 슬롯 받기";
  const isPrimaryDisabled = status === "loading" || status === "watching";

  return (
    <Card className="relative overflow-hidden" tone="accent">
      <CardContent className="py-6">
        <div className="relative z-10 flex flex-col gap-3">
          <div>
            <h3 className="text-lg font-bold">Out of credits?</h3>
            <p className="mt-2 text-sm text-white/60">
              Watch a short ad to refuel your kitchen with +1 Generation Slot.
            </p>
          </div>
          <p className="text-xs font-semibold text-white/70">{statusLabels[status]}</p>
          {message ? <p className="text-xs text-white/50">{message}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              intent="outline"
              size="sm"
              onClick={status === "ready" ? handleShowRewarded : handleLoadRewarded}
              disabled={isPrimaryDisabled}
            >
              {primaryLabel}
            </Button>
            {status === "ready" ? (
              <Button
                intent="ghost"
                size="sm"
                onClick={() => {
                  setStatus("idle");
                  setMessage("광고를 취소했습니다.");
                  cleanup();
                }}
              >
                나중에 보기
              </Button>
            ) : null}
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      </CardContent>
    </Card>
  );
}
