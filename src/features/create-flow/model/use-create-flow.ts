import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createStepItems } from "@/features/create-flow/model/stepper-state";
import type {
  CreateFlowState,
  GenerateResponse,
  ReserveResponse,
  StatusResponse,
  ValidateResponse,
} from "@/features/create-flow/model/types";
import { fetchJson } from "@/shared/lib/fetch-json";

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

  const start = useCallback(async (prompt: string) => {
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

    let reserveResponse: ReserveResponse;
    try {
      reserveResponse = await fetchJson<ReserveResponse>("/api/create/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

    let statusResponse: StatusResponse;
    try {
      statusResponse = await fetchJson<StatusResponse>(
        `/api/create/status?requestId=${generateResponse.requestId}`,
        { signal: controller.signal },
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

    if (isActive()) {
      setState({
        step: statusResponse.status === "DONE" ? "done" : "safety",
        errorMessage: null,
        errorStep: null,
        requestId: generateResponse.requestId,
        imageUrl: statusResponse.imageUrl,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    steps,
    start,
    reset,
  };
}
