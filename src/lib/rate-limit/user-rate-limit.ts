type RateLimitState = {
  windowStartMs: number;
  count: number;
};

type CheckRateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
};

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

const stateByKey = new Map<string, RateLimitState>();

export function checkRateLimit(options: CheckRateLimitOptions): RateLimitDecision {
  const nowMs = options.nowMs ?? Date.now();
  const existing = stateByKey.get(options.key);

  if (!existing || nowMs - existing.windowStartMs >= options.windowMs) {
    stateByKey.set(options.key, { windowStartMs: nowMs, count: 1 });
    return { allowed: true, remaining: Math.max(0, options.limit - 1) };
  }

  const nextCount = existing.count + 1;
  existing.count = nextCount;
  stateByKey.set(options.key, existing);

  if (nextCount > options.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((options.windowMs - (nowMs - existing.windowStartMs)) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, remaining: Math.max(0, options.limit - nextCount) };
}
