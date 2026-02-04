import type { CreateFlowState, CreateStepItem } from "@/features/create-flow/model/types";

const stepOrder = ["reserving", "validating", "generating", "safety"] as const;

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

type StepKey = (typeof stepOrder)[number];

const isStepKey = (value: CreateFlowState["step"]): value is StepKey =>
  stepOrder.includes(value as StepKey);

const resolveStepIndex = (
  step: CreateFlowState["step"],
  errorStep?: CreateFlowState["errorStep"],
) => {
  if (step === "idle") {
    return -1;
  }

  if (step === "done") {
    return stepOrder.length - 1;
  }

  if (step === "error" && errorStep) {
    return stepOrder.indexOf(errorStep);
  }

  if (isStepKey(step)) {
    return stepOrder.indexOf(step);
  }

  return -1;
};

const resolveStatus = (
  stepIndex: number,
  currentIndex: number,
  step: CreateFlowState["step"],
  errorStep: CreateFlowState["errorStep"] | null,
): CreateStepItem["status"] => {
  if (step === "done") {
    return "done";
  }

  if (step === "error" && errorStep === stepOrder[currentIndex]) {
    return "error";
  }

  if (stepIndex < currentIndex) {
    return "idle";
  }

  if (stepIndex === currentIndex) {
    return "active";
  }

  return "done";
};

const resolveDescription = (
  stepIndex: number,
  currentIndex: number,
  step: CreateFlowState["step"],
  errorStep: CreateFlowState["errorStep"] | null,
  messages: (typeof stepLabels)[StepKey]["messages"],
) => {
  if (step === "done") {
    return messages.done;
  }

  if (step === "error" && errorStep === stepOrder[currentIndex]) {
    return messages.error;
  }

  if (stepIndex < currentIndex) {
    return messages.idle;
  }

  if (stepIndex === currentIndex) {
    return messages.active;
  }

  return messages.done;
};

export const createStepItems = (
  step: CreateFlowState["step"],
  errorStep?: CreateFlowState["errorStep"],
): CreateStepItem[] => {
  const stepIndex = resolveStepIndex(step, errorStep);

  return stepOrder.map((key, index) => ({
    title: stepLabels[key].title,
    description: resolveDescription(
      stepIndex,
      index,
      step,
      errorStep ?? null,
      stepLabels[key].messages,
    ),
    status: resolveStatus(stepIndex, index, step, errorStep ?? null),
  }));
};

export const resolveActiveStep = (steps: CreateStepItem[]) => {
  const activeIndex = steps.findIndex((step) => step.status === "active");
  const errorIndex = steps.findIndex((step) => step.status === "error");
  if (activeIndex >= 0) {
    return activeIndex + 1;
  }
  if (errorIndex >= 0) {
    return errorIndex + 1;
  }
  return steps.length > 0 ? 1 : 0;
};
