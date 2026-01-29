const INTERNAL_PATH_REGEX = /^\/(?!\/)/;

export function resolveReturnTo(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  if (!INTERNAL_PATH_REGEX.test(value)) {
    return null;
  }
  if (value.includes("\\") || value.includes("//")) {
    return null;
  }
  return value;
}
