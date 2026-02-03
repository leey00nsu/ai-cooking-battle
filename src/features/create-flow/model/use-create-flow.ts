import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createIdempotencyKey } from "@/features/create-flow/model/create-recovery";
import { createStepItems } from "@/features/create-flow/model/stepper-state";
import type {
  CreateFlowState,
  CreateStep,
  GenerateResponse,
  ReserveResponse,
  StatusResponse,
  ValidateResponse,
} from "@/features/create-flow/model/types";
import type { FetchJsonError } from "@/shared/lib/fetch-json";
import { fetchJson } from "@/shared/lib/fetch-json";
import { sleep } from "@/shared/lib/sleep";

const initialState: CreateFlowState = {
  step: "idle",
  errorMessage: null,
  errorStep: null,
  requestId: null,
  imageUrl: null,
};

type ApiCreateStatus = Extract<StatusResponse, { ok: true }>["status"];

const mapStatusToStep = (status: ApiCreateStatus): CreateStep => {
  switch (status) {
    case "VALIDATING":
      return "validating";
    case "RESERVING":
      return "reserving";
    case "GENERATING":
      return "generating";
    case "SAFETY":
      return "safety";
    case "DONE":
      return "done";
  }
};

export function useCreateFlow() {
  const [state, setState] = useState<CreateFlowState>(initialState);
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

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
  const validateMutation = useMutation({
    mutationFn: ({ prompt, signal }: { prompt: string; signal: AbortSignal }) =>
      fetchJson<ValidateResponse>("/api/create/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal,
      }),
  });
  const reserveMutation = useMutation({
    mutationFn: ({
      idempotencyKey,
      adRewardId,
      signal,
    }: {
      idempotencyKey: string;
      adRewardId?: string;
      signal: AbortSignal;
    }) =>
      fetchJson<ReserveResponse>("/api/create/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          ...(adRewardId ? { adRewardId } : {}),
        }),
        signal,
      }),
  });
  const generateMutation = useMutation({
    mutationFn: ({
      reservationId,
      prompt,
      idempotencyKey,
      signal,
    }: {
      reservationId: string;
      prompt: string;
      idempotencyKey: string;
      signal: AbortSignal;
    }) =>
      fetchJson<GenerateResponse>("/api/create/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId,
          prompt,
          idempotencyKey,
        }),
        signal,
      }),
  });
  const statusMutation = useMutation({
    mutationFn: ({ query, signal }: { query: string; signal: AbortSignal }) =>
      fetchJson<StatusResponse>(`/api/create/status?${query}`, { signal }),
  });

  const recoverByRequestId = useCallback(
    async (requestId: string) => {
      const trimmedRequestId = requestId.trim();
      if (!trimmedRequestId) {
        return;
      }

      runIdRef.current += 1;
      const runId = runIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const isActive = () =>
        mountedRef.current && runIdRef.current === runId && !controller.signal.aborted;

      if (isActive()) {
        setState({
          step: "generating",
          errorMessage: null,
          errorStep: null,
          requestId: trimmedRequestId,
          imageUrl: null,
        });
      }

      const encodedRequestId = encodeURIComponent(trimmedRequestId);
      while (true) {
        let statusResponse: StatusResponse;
        try {
          statusResponse = await statusMutation.mutateAsync({
            query: `requestId=${encodedRequestId}`,
            signal: controller.signal,
          });
        } catch (error) {
          if ((error as DOMException).name === "AbortError") {
            return;
          }
          const fetchError = error as FetchJsonError;
          if (
            fetchError?.status === 404 ||
            fetchError?.status === 410 ||
            fetchError?.code === "REQUEST_NOT_FOUND" ||
            fetchError?.code === "RESERVATION_EXPIRED"
          ) {
            if (isActive()) {
              setState(initialState);
            }
            return;
          }
          if (isActive()) {
            setState({
              step: "error",
              errorMessage: "복구 요청 중 오류가 발생했습니다.",
              errorStep: "generating",
              requestId: trimmedRequestId,
              imageUrl: null,
            });
          }
          return;
        }

        if (!statusResponse.ok) {
          if (isActive()) {
            setState({
              step: "error",
              errorMessage: statusResponse.message ?? "복구 요청에 실패했습니다.",
              errorStep: "generating",
              requestId: trimmedRequestId,
              imageUrl: null,
            });
          }
          return;
        }

        if (!isActive()) {
          return;
        }

        setState({
          step: mapStatusToStep(statusResponse.status),
          errorMessage: null,
          errorStep: null,
          requestId: trimmedRequestId,
          imageUrl: statusResponse.imageUrl,
        });

        if (statusResponse.status === "DONE") {
          return;
        }

        await sleep(1200);
      }
    },
    [statusMutation],
  );

  const start = useCallback(
    async (prompt: string, options?: { adRewardId?: string }) => {
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
        const message =
          error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.";
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

      const idempotencyKey = createIdempotencyKey();

      let validateResponse: ValidateResponse;
      try {
        validateResponse = await validateMutation.mutateAsync({
          prompt,
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
        reserveResponse = await reserveMutation.mutateAsync({
          idempotencyKey,
          ...(adRewardId ? { adRewardId } : {}),
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
        generateResponse = await generateMutation.mutateAsync({
          reservationId: reserveResponse.reservationId,
          prompt: validateResponse.normalizedPrompt,
          idempotencyKey,
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
        setState((prev) => ({
          ...prev,
          step: "generating",
          requestId: generateResponse.requestId,
        }));
      }

      const requestId = encodeURIComponent(generateResponse.requestId);
      while (true) {
        let statusResponse: StatusResponse;
        try {
          statusResponse = await statusMutation.mutateAsync({
            query: `requestId=${requestId}`,
            signal: controller.signal,
          });
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

        if (isActive()) {
          setState({
            step: mapStatusToStep(statusResponse.status),
            errorMessage: null,
            errorStep: null,
            requestId: generateResponse.requestId,
            imageUrl: statusResponse.imageUrl,
          });
        }

        if (statusResponse.status === "DONE") {
          return;
        }

        await sleep(1200);
      }
    },
    [generateMutation, reserveMutation, statusMutation, validateMutation],
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  useEffect(() => {
    if (mountedRef.current) {
      setState(initialState);
    }
  }, []);

  return {
    state,
    steps,
    start,
    recoverByRequestId,
    reset,
  };
}
