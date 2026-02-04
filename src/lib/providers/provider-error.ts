export type ProviderErrorCode =
  | "MISSING_ENV"
  | "HTTP_ERROR"
  | "GENERATION_FAILED"
  | "INVALID_INPUT"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "UNKNOWN";

export class ProviderError extends Error {
  readonly provider: string;
  readonly code: ProviderErrorCode;
  readonly status?: number;

  constructor(args: {
    provider: string;
    code: ProviderErrorCode;
    message: string;
    status?: number;
    cause?: unknown;
  }) {
    super(args.message, args.cause ? { cause: args.cause } : undefined);
    this.name = "ProviderError";
    this.provider = args.provider;
    this.code = args.code;
    this.status = args.status;
  }
}
