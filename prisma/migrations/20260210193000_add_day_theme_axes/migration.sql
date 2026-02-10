ALTER TABLE "day_theme" ADD COLUMN "axisAType" TEXT;
ALTER TABLE "day_theme" ADD COLUMN "axisA" TEXT;
ALTER TABLE "day_theme" ADD COLUMN "axisBType" TEXT;
ALTER TABLE "day_theme" ADD COLUMN "axisB" TEXT;
ALTER TABLE "day_theme" ADD COLUMN "axisFlavor" TEXT;

UPDATE "day_theme"
SET
  "axisAType" = COALESCE("axisAType", '분위기'),
  "axisA" = COALESCE("axisA", '일상'),
  "axisBType" = COALESCE("axisBType", '음식종류'),
  "axisB" = COALESCE("axisB", '요리'),
  "axisFlavor" = COALESCE("axisFlavor", '담백한')
WHERE
  "axisAType" IS NULL
  OR "axisA" IS NULL
  OR "axisBType" IS NULL
  OR "axisB" IS NULL
  OR "axisFlavor" IS NULL;

ALTER TABLE "day_theme" ALTER COLUMN "axisAType" SET NOT NULL;
ALTER TABLE "day_theme" ALTER COLUMN "axisA" SET NOT NULL;
ALTER TABLE "day_theme" ALTER COLUMN "axisBType" SET NOT NULL;
ALTER TABLE "day_theme" ALTER COLUMN "axisB" SET NOT NULL;
ALTER TABLE "day_theme" ALTER COLUMN "axisFlavor" SET NOT NULL;
