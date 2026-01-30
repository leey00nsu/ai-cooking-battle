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
  requestId?: string | null;
  imageUrl?: string | null;
};

export type ValidateResponse =
  | { ok: true; normalizedPrompt: string }
  | { ok: false; code: string; message: string };

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
  | { ok: true; status: "PROCESSING" | "DONE"; imageUrl: string | null }
  | { ok: false; code: string; message: string };
