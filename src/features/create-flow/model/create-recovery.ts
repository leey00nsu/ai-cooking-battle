const STORAGE_KEY = "createFlow:idempotency";

export type StoredCreateRecovery = {
  idempotencyKey: string;
  startedAt: string;
};

export const createRecoveryStorage = {
  load(): StoredCreateRecovery | null {
    if (typeof window === "undefined") {
      return null;
    }
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as StoredCreateRecovery;
      if (!parsed?.idempotencyKey) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },
  save(idempotencyKey: string) {
    if (typeof window === "undefined") {
      return;
    }
    const payload: StoredCreateRecovery = {
      idempotencyKey,
      startedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  },
  clear() {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  },
};

export function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
