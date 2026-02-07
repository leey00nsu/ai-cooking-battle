const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const HANGUL_BATCHIM_DIVISOR = 28;

function getKoreanObjectParticle(word: string) {
  const trimmed = word.trim();
  if (!trimmed) {
    return "(을/를)";
  }

  const lastChar = Array.from(trimmed).pop();
  if (!lastChar) {
    return "(을/를)";
  }

  const codePoint = lastChar.codePointAt(0);
  if (!codePoint || codePoint < HANGUL_SYLLABLE_START || codePoint > HANGUL_SYLLABLE_END) {
    return "(을/를)";
  }

  const hasBatchim = (codePoint - HANGUL_SYLLABLE_START) % HANGUL_BATCHIM_DIVISOR !== 0;
  return hasBatchim ? "을" : "를";
}

export { getKoreanObjectParticle };
