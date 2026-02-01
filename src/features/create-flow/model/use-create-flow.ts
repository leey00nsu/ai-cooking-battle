import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createIdempotencyKey,
  createRecoveryStorage,
} from "@/features/create-flow/model/create-recovery";
import { createStepItems } from "@/features/create-flow/model/stepper-state";
import type {
  CreateFlowState,
  GenerateResponse,
  ReserveResponse,
  StatusResponse,
  ValidateResponse,
} from "@/features/create-flow/model/types";
import { fetchJson } from "@/shared/lib/fetch-json";
import { sleep } from "@/shared/lib/sleep";

const initialState: CreateFlowState = {
  step: "idle",
  errorMessage: null,
  errorStep: null,
  requestId: null,
  imageUrl: null,
};

export function useCreateFlow() {
  const [state, setState] = useState<CreateFlowState>(initialState);
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const recoveryKeyRef = useRef<string | null>(null);
  const isRecoveringRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const steps = useMemo(
    () => createStepItems(state.step, state.errorStep),
    [state.step, state.errorStep],
  );

  const recover = useCallback(async (idempotencyKey: string) => {
    runIdRef.current += 1;
    const runId = runIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const isActive = () =>
      mountedRef.current && runIdRef.current === runId && !controller.signal.aborted;

    isRecoveringRef.current = true;
    if (isActive()) {
      setState({
        step: "generating",
        errorMessage: null,
        errorStep: null,
        requestId: null,
        imageUrl: null,
      });
    }

    let statusResponse: StatusResponse;
    try {
      statusResponse = await fetchJson<StatusResponse>(
        `/api/create/status?idempotencyKey=${encodeURIComponent(idempotencyKey)}`,
        { signal: controller.signal },
      );
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        return;
      }
      if (isActive()) {
        setState({
          step: "error",
          errorMessage: "복구 요청 중 오류가 발생했습니다.",
          errorStep: "generating",
          requestId: null,
          imageUrl: null,
        });
      }
      return;
    }

    if (!statusResponse.ok) {
      if (
        statusResponse.code === "REQUEST_NOT_FOUND" ||
        statusResponse.code === "RESERVATION_EXPIRED"
      ) {
        createRecoveryStorage.clear();
        recoveryKeyRef.current = null;
      }
      if (isActive()) {
        setState({
          step: "error",
          errorMessage: statusResponse.message ?? "복구 요청에 실패했습니다.",
          errorStep: "generating",
          requestId: null,
          imageUrl: null,
        });
      }
      return;
    }

    if (!isActive()) {
      return;
    }

    if (statusResponse.status === "DONE") {
      setState({
        step: "done",
        errorMessage: null,
        errorStep: null,
        requestId: null,
        imageUrl: statusResponse.imageUrl,
      });
      createRecoveryStorage.clear();
      recoveryKeyRef.current = null;
      return;
    }

    setState({
      step: "safety",
      errorMessage: null,
      errorStep: null,
      requestId: null,
      imageUrl: statusResponse.imageUrl,
    });
  }, []);

  const start = useCallback(async (prompt: string, options?: { adRewardId?: string }) => {
    runIdRef.current += 1;
    const runId = runIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const isActive = () =>
      mountedRef.current && runIdRef.current === runId && !controller.signal.aborted;

    const handleError = (error: unknown, errorStep: CreateFlowState["errorStep"]) => {
      if (!isActive()) {
        return;
      }
      const message = error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.";
      setState({
        step: "error",
        errorMessage: message,
        errorStep,
        requestId: null,
        imageUrl: null,
      });
    };

    if (isActive()) {
      setState({
        step: "validating",
        errorMessage: null,
        errorStep: null,
        requestId: null,
        imageUrl: null,
      });
    }

    const idempotencyKey = recoveryKeyRef.current ?? createIdempotencyKey();
    recoveryKeyRef.current = idempotencyKey;
    createRecoveryStorage.save(idempotencyKey);

    let validateResponse: ValidateResponse;
    try {
      validateResponse = await fetchJson<ValidateResponse>("/api/create/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        return;
      }
      handleError(error, "validating");
      return;
    }

    if (!validateResponse.ok) {
      handleError(new Error(validateResponse.message ?? "Validation failed."), "validating");
      return;
    }

    if (isActive()) {
      setState((prev) => ({ ...prev, step: "reserving" }));
    }

    const adRewardId = options?.adRewardId?.trim();
    let reserveResponse: ReserveResponse;
    try {
      reserveResponse = await fetchJson<ReserveResponse>("/api/create/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          ...(adRewardId ? { adRewardId } : {}),
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        return;
      }
      handleError(error, "reserving");
      return;
    }

    if (!reserveResponse.ok) {
      handleError(new Error(reserveResponse.message ?? "Reservation failed."), "reserving");
      return;
    }

    if (isActive()) {
      setState((prev) => ({ ...prev, step: "generating" }));
    }

    let generateResponse: GenerateResponse;
    try {
      generateResponse = await fetchJson<GenerateResponse>("/api/create/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: reserveResponse.reservationId,
          prompt: validateResponse.normalizedPrompt,
          idempotencyKey,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        return;
      }
      handleError(error, "generating");
      return;
    }

    if (!generateResponse.ok) {
      handleError(new Error(generateResponse.message ?? "Generation failed."), "generating");
      return;
    }

    if (isActive()) {
      setState((prev) => ({ ...prev, step: "safety", requestId: generateResponse.requestId }));
    }

    if (generateResponse.requestId) {
      recoveryKeyRef.current = idempotencyKey;
      createRecoveryStorage.save(idempotencyKey);
    }

    const requestId = encodeURIComponent(generateResponse.requestId);
    while (true) {
      let statusResponse: StatusResponse;
      try {
        statusResponse = await fetchJson<StatusResponse>(
          `/api/create/status?requestId=${requestId}`,
          {
            signal: controller.signal,
          },
        );
      } catch (error) {
        if ((error as DOMException).name === "AbortError") {
          return;
        }
        handleError(error, "safety");
        return;
      }

      if (!statusResponse.ok) {
        handleError(new Error(statusResponse.message ?? "Status fetch failed."), "safety");
        return;
      }

      if (statusResponse.status !== "PROCESSING") {
        if (isActive()) {
          setState({
            step: statusResponse.status === "DONE" ? "done" : "safety",
            errorMessage: null,
            errorStep: null,
            requestId: generateResponse.requestId,
            imageUrl: statusResponse.imageUrl,
          });
        }
        if (statusResponse.status === "DONE") {
          createRecoveryStorage.clear();
          recoveryKeyRef.current = null;
        }
        return;
      }

      if (!isActive()) {
        return;
      }

      await sleep(1200);
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    createRecoveryStorage.clear();
    recoveryKeyRef.current = null;
  }, []);

  useEffect(() => {
    const stored = createRecoveryStorage.load();
    if (!stored || isRecoveringRef.current) {
      return;
    }
    recoveryKeyRef.current = stored.idempotencyKey;
    void recover(stored.idempotencyKey);
  }, [recover]);

  return {
    state,
    steps,
    start,
    recover,
    reset,
  };
}
