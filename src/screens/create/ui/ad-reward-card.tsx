"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SlotSummary } from "@/entities/slot/model/types";
import { createIdempotencyKey } from "@/features/create-flow/model/create-recovery";
import AdRewardRequest from "@/screens/create/ui/ad-reward-request";
import AdRewardSuccess from "@/screens/create/ui/ad-reward-success";
import MockRewardedModal from "@/screens/create/ui/mock-rewarded-modal";
import { fetchJson } from "@/shared/lib/fetch-json";
import { loadRewardedAd, type RewardedAdHandle } from "@/shared/lib/gpt-rewarded";

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

type RewardPayload = { rewardId: string; nonce: string; confirmIdempotencyKey: string };

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
  const isMockMode = useMemo(
    () => (process.env.NEXT_PUBLIC_IS_AD_MOCKING ?? "").toLowerCase() === "true",
    [],
  );
  const [status, setStatus] = useState<RewardStatus>("idle");
  const statusRef = useRef<RewardStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const rewardRef = useRef<RewardPayload | null>(null);
  const handleRef = useRef<RewardedAdHandle | null>(null);
  const [isMockOpen, setIsMockOpen] = useState(false);
  const { data: slotSummary } = useQuery<SlotSummary>({
    queryKey: ["slots", "summary"],
    queryFn: () => fetchJson<SlotSummary>("/api/slots/summary"),
  });
  const requestRewardMutation = useMutation({
    mutationFn: () =>
      fetchJson<RewardRequestResponse>("/api/ads/reward/request", {
        method: "POST",
      }),
  });
  const confirmRewardMutation = useMutation({
    mutationFn: (payload: Pick<RewardPayload, "nonce" | "confirmIdempotencyKey">) =>
      fetchJson<RewardConfirmResponse>("/api/ads/reward/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonce: payload.nonce,
          idempotencyKey: payload.confirmIdempotencyKey,
        }),
      }),
  });

  const cleanup = useCallback(() => {
    handleRef.current?.destroy();
    handleRef.current = null;
  }, []);

  const closeMock = useCallback((messageText?: string) => {
    setIsMockOpen(false);
    rewardRef.current = null;
    if (statusRef.current !== "success") {
      setStatus("idle");
      setMessage(messageText ?? "광고가 닫혔습니다.");
    }
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => () => cleanup(), [cleanup]);
  const remainingLabel = slotSummary
    ? `Remaining Ad Slots: ${Math.max(slotSummary.adLimit - slotSummary.adUsedCount, 0)}/${slotSummary.adLimit}`
    : null;

  const handleConfirmReward = useCallback(async () => {
    const payload = rewardRef.current;
    if (!payload) {
      setStatus("error");
      setMessage("보상 정보가 유효하지 않습니다.");
      return;
    }

    let finalized = false;
    setStatus("loading");
    setMessage("보상 확정 중...");

    try {
      const response = await confirmRewardMutation.mutateAsync({
        nonce: payload.nonce,
        confirmIdempotencyKey: payload.confirmIdempotencyKey,
      });

      if (!response.ok) {
        finalized = true;
        setStatus("error");
        setMessage(response.message ?? "보상 확정에 실패했습니다.");
        return;
      }

      finalized = true;
      setStatus("success");
      setMessage("슬롯이 충전되었습니다.");
      onRewardGranted(response.rewardId);
      rewardRef.current = null;
    } catch (error) {
      finalized = true;
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "보상 확정에 실패했습니다.");
    } finally {
      if (!finalized) {
        setStatus("error");
        setMessage("보상 확정에 실패했습니다.");
      }
    }
  }, [confirmRewardMutation, onRewardGranted]);

  const handleLoadRewarded = useCallback(async () => {
    if (!isMockMode && !adUnitPath) {
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
      requestResponse = await requestRewardMutation.mutateAsync();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "보상 요청에 실패했습니다.");
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
      confirmIdempotencyKey: createIdempotencyKey(),
    };

    if (isMockMode) {
      setStatus("watching");
      setMessage("모의 광고를 재생합니다.");
      setIsMockOpen(true);
      return;
    }

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
  }, [adUnitPath, cleanup, handleConfirmReward, isMockMode, requestRewardMutation, status]);

  const handleShowRewarded = useCallback(() => {
    if (!handleRef.current) {
      setStatus("error");
      setMessage("광고 준비가 완료되지 않았습니다.");
      return;
    }
    setStatus("watching");
    handleRef.current.show();
  }, []);

  const handleMockGrant = useCallback(async () => {
    setStatus("loading");
    setMessage("보상 확정 중...");
    await handleConfirmReward();
    setIsMockOpen(false);
  }, [handleConfirmReward]);

  const primaryLabel =
    status === "ready" ? "광고 보기" : status === "error" ? "다시 시도" : "광고로 슬롯 받기";
  const isPrimaryDisabled = status === "loading" || status === "watching";

  if (status === "success") {
    return (
      <AdRewardSuccess
        onPrimary={() => {
          setStatus("idle");
          setMessage("보상 슬롯을 사용해 요리를 시작하세요.");
        }}
        onSecondary={() => {
          setStatus("idle");
          setMessage("보상 슬롯이 준비되었습니다.");
        }}
      />
    );
  }

  return (
    <>
      <AdRewardRequest
        title="Refill Your Cooking Slot"
        description="무료 슬롯이 모두 소진되었어요. 짧은 광고를 보고 보너스 슬롯 1개를 즉시 받을 수 있습니다."
        statusLabel={statusLabels[status]}
        message={message}
        primaryLabel={primaryLabel}
        onPrimary={status === "ready" ? handleShowRewarded : handleLoadRewarded}
        onSecondary={
          status === "ready" || status === "error"
            ? () => {
                setStatus("idle");
                setMessage("광고를 취소했습니다.");
                cleanup();
              }
            : undefined
        }
        isPrimaryDisabled={isPrimaryDisabled}
        remainingLabel={remainingLabel ?? undefined}
      />
      <MockRewardedModal
        isOpen={isMockOpen}
        onClose={() => closeMock("광고가 닫혔습니다.")}
        onGrant={handleMockGrant}
      />
    </>
  );
}
