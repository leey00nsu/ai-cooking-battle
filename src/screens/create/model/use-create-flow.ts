import { useCallback, useMemo, useState } from "react";
import type {
  CreateFlowState,
  CreateStepItem,
  GenerateResponse,
  ReserveResponse,
  StatusResponse,
  ValidateResponse,
} from "@/screens/create/model/types";

const initialState: CreateFlowState = {
  step: "idle",
  errorMessage: null,
  requestId: null,
  imageUrl: null,
};

const createStepItems = (step: CreateFlowState["step"]): CreateStepItem[] => {
  const stepIndex = ["validating", "reserving", "generating", "safety"].indexOf(
    step === "error" || step === "idle" ? "validating" : step,
  );

  return [
    {
      title: "Prompt Validation",
      description: "Checking prompt safety",
      status: step === "error" && stepIndex === 0 ? "error" : stepIndex > 0 ? "done" : "active",
    },
    {
      title: "Slot Reservation",
      description: "Claiming a slot",
      status: stepIndex < 1 ? "idle" : stepIndex === 1 ? "active" : "done",
    },
    {
      title: "AI Cooking",
      description: "Estimated: 12s",
      status: stepIndex < 2 ? "idle" : stepIndex === 2 ? "active" : "done",
    },
    {
      title: "Safety Check",
      description: "Final polish",
      status: stepIndex < 3 ? "idle" : stepIndex === 3 ? "active" : "done",
    },
  ];
};

export function useCreateFlow() {
  const [state, setState] = useState<CreateFlowState>(initialState);

  const steps = useMemo(() => createStepItems(state.step), [state.step]);

  const start = useCallback(async (prompt: string) => {
    setState({ step: "validating", errorMessage: null, requestId: null, imageUrl: null });

    const validateResponse = await fetch("/api/create/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }).then(async (res) => res.json() as Promise<ValidateResponse>);

    if (!validateResponse.ok) {
      setState({
        step: "error",
        errorMessage: validateResponse.message ?? "Validation failed.",
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
        requestId: generateResponse.requestId,
        imageUrl: null,
      });
      return;
    }

    setState({
      step: statusResponse.status === "DONE" ? "done" : "safety",
      errorMessage: null,
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
