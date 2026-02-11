ALTER TABLE "day_theme" ADD COLUMN "themeWeights" JSONB;
ALTER TABLE "day_theme" ADD COLUMN "themeSignals" JSONB;

UPDATE "day_theme"
SET
  "themeWeights" = COALESCE(
    "themeWeights",
    '{"A":15,"B":55,"F":30}'::jsonb
  ),
  "themeSignals" = COALESCE(
    "themeSignals",
    '{
      "A":["일상 상황을 떠올리게 하는 간단한 상차림"],
      "B":["요리 형태가 축 설명과 일치"],
      "F":["풍미를 암시하는 재료 포인트"]
    }'::jsonb
  )
WHERE
  "themeWeights" IS NULL
  OR "themeSignals" IS NULL;

ALTER TABLE "day_theme" ALTER COLUMN "themeWeights" SET NOT NULL;
ALTER TABLE "day_theme" ALTER COLUMN "themeSignals" SET NOT NULL;
