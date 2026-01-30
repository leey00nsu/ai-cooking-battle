import { useCallback, useMemo, useState } from "react";
import type {
  CreateFlowState,
  CreateStepItem,
  GenerateResponse,
  ReserveResponse,
  StatusResponse,
  ValidateResponse,
} from "@/features/create-flow/model/types";

const initialState: CreateFlowState = {
  step: "idle",
  errorMessage: null,
  errorStep: null,
  requestId: null,
  imageUrl: null,
};

const stepOrder = ["validating", "reserving", "generating", "safety"] as const;

const stepLabels = {
  validating: {
    title: "Prompt Validation",
    messages: {
      idle: "검증 대기",
      active: "프롬프트 검증 중",
      done: "검증 완료",
      error: "검증 실패",
    },
  },
  reserving: {
    title: "Slot Reservation",
    messages: {
      idle: "슬롯 대기",
      active: "슬롯 예약 중",
      done: "예약 완료",
      error: "예약 실패",
    },
  },
  generating: {
    title: "AI Cooking",
    messages: {
      idle: "이미지 생성 대기",
      active: "이미지 생성 중",
      done: "생성 완료",
      error: "생성 실패",
    },
  },
  safety: {
    title: "Safety Check",
    messages: {
      idle: "안전 검사 대기",
      active: "안전 검사 중",
      done: "검사 완료",
      error: "검사 실패",
    },
  },
};

const createStepItems = (
  step: CreateFlowState["step"],
  errorStep?: CreateFlowState["errorStep"],
): CreateStepItem[] => {
  const errorIndex = step === "error" && errorStep ? stepOrder.indexOf(errorStep) : -1;
  const stepIndex =
    step === "idle"
      ? -1
      : step === "done"
        ? stepOrder.length - 1
        : step === "error" && errorIndex >= 0
          ? errorIndex
          : stepOrder.indexOf(step);

  return [
    {
      title: stepLabels.validating.title,
      description:
        step === "done"
          ? stepLabels.validating.messages.done
          : step === "error" && errorStep === "validating"
            ? stepLabels.validating.messages.error
            : stepIndex < 0
              ? stepLabels.validating.messages.idle
              : stepIndex === 0
                ? stepLabels.validating.messages.active
                : stepLabels.validating.messages.done,
      status:
        step === "done"
          ? "done"
          : step === "error" && errorStep === "validating"
            ? "error"
            : stepIndex < 0
              ? "idle"
              : stepIndex === 0
                ? "active"
                : "done",
    },
    {
      title: stepLabels.reserving.title,
      description:
        step === "done"
          ? stepLabels.reserving.messages.done
          : step === "error" && errorStep === "reserving"
            ? stepLabels.reserving.messages.error
            : stepIndex < 1
              ? stepLabels.reserving.messages.idle
              : stepIndex === 1
                ? stepLabels.reserving.messages.active
                : stepLabels.reserving.messages.done,
      status:
        step === "done"
          ? "done"
          : step === "error" && errorStep === "reserving"
            ? "error"
            : stepIndex < 1
              ? "idle"
              : stepIndex === 1
                ? "active"
                : "done",
    },
    {
      title: stepLabels.generating.title,
      description:
        step === "done"
          ? stepLabels.generating.messages.done
          : step === "error" && errorStep === "generating"
            ? stepLabels.generating.messages.error
            : stepIndex < 2
              ? stepLabels.generating.messages.idle
              : stepIndex === 2
                ? stepLabels.generating.messages.active
                : stepLabels.generating.messages.done,
      status:
        step === "done"
          ? "done"
          : step === "error" && errorStep === "generating"
            ? "error"
            : stepIndex < 2
              ? "idle"
              : stepIndex === 2
                ? "active"
                : "done",
    },
    {
      title: stepLabels.safety.title,
      description:
        step === "done"
          ? stepLabels.safety.messages.done
          : step === "error" && errorStep === "safety"
            ? stepLabels.safety.messages.error
            : stepIndex < 3
              ? stepLabels.safety.messages.idle
              : stepIndex === 3
                ? stepLabels.safety.messages.active
                : stepLabels.safety.messages.done,
      status:
        step === "done"
          ? "done"
          : step === "error" && errorStep === "safety"
            ? "error"
            : stepIndex < 3
              ? "idle"
              : stepIndex === 3
                ? "active"
                : "done",
    },
  ];
};

export function useCreateFlow() {
  const [state, setState] = useState<CreateFlowState>(initialState);

  const steps = useMemo(
    () => createStepItems(state.step, state.errorStep),
    [state.step, state.errorStep],
  );

  const start = useCallback(async (prompt: string) => {
    setState({
      step: "validating",
      errorMessage: null,
      errorStep: null,
      requestId: null,
      imageUrl: null,
    });

    const validateResponse = await fetch("/api/create/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }).then(async (res) => res.json() as Promise<ValidateResponse>);

    if (!validateResponse.ok) {
      setState({
        step: "error",
        errorMessage: validateResponse.message ?? "Validation failed.",
        errorStep: "validating",
        requestId: null,
        imageUrl: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, step: "reserving" }));

    const reserveResponse = await fetch("/api/create/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).then(async (res) => res.json() as Promise<ReserveResponse>);

    if (!reserveResponse.ok) {
      setState({
        step: "error",
        errorMessage: reserveResponse.message ?? "Reservation failed.",
        errorStep: "reserving",
        requestId: null,
        imageUrl: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, step: "generating" }));

    const generateResponse = await fetch("/api/create/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reservationId: reserveResponse.reservationId,
        prompt: validateResponse.normalizedPrompt,
      }),
    }).then(async (res) => res.json() as Promise<GenerateResponse>);

    if (!generateResponse.ok) {
      setState({
        step: "error",
        errorMessage: generateResponse.message ?? "Generation failed.",
        errorStep: "generating",
        requestId: null,
        imageUrl: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, step: "safety", requestId: generateResponse.requestId }));

    const statusResponse = await fetch(
      `/api/create/status?requestId=${generateResponse.requestId}`,
    ).then(async (res) => res.json() as Promise<StatusResponse>);

    if (!statusResponse.ok) {
      setState({
        step: "error",
        errorMessage: statusResponse.message ?? "Status fetch failed.",
        errorStep: "safety",
        requestId: generateResponse.requestId,
        imageUrl: null,
      });
      return;
    }

    setState({
      step: statusResponse.status === "DONE" ? "done" : "safety",
      errorMessage: null,
      errorStep: null,
      requestId: generateResponse.requestId,
      imageUrl: statusResponse.imageUrl,
    });
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
