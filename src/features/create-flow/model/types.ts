export type CreateStep =
  | "idle"
  | "validating"
  | "reserving"
  | "generating"
  | "safety"
  | "done"
  | "error";

export type CreateStepItem = {
  title: string;
  description: string;
  status: "idle" | "active" | "done" | "error";
};

export type CreateFlowState = {
  step: CreateStep;
  errorMessage?: string | null;
  errorStep?: "validating" | "reserving" | "generating" | "safety" | null;
  requestId?: string | null;
  imageUrl?: string | null;
};

export type ValidateResponse =
  | {
      ok: true;
      normalizedPrompt: string;
      translatedPromptEn: string | null;
      validationId: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      category?: string;
      fixGuide?: string;
      validationId?: string;
      translatedPromptEn?: string | null;
    };

export type ReserveResponse =
  | {
      ok: true;
      slotType: "free" | "ad";
      reservationId: string;
      expiresInSeconds: number;
    }
  | { ok: false; code: string; message: string };

export type GenerateResponse =
  | { ok: true; requestId: string; status: "QUEUED" | "PROCESSING" }
  | { ok: false; code: string; message: string };

export type StatusResponse =
  | {
      ok: true;
      status: "VALIDATING" | "RESERVING" | "GENERATING" | "SAFETY" | "DONE";
      dishId: string | null;
      imageUrl: string | null;
    }
  | { ok: false; code: string; message: string; retryable?: boolean };
