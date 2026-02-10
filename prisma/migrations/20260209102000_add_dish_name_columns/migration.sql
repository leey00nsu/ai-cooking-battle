ALTER TABLE "dish" ADD COLUMN "dishName" TEXT;
ALTER TABLE "dish" ADD COLUMN "dishNameEn" TEXT;

UPDATE "dish"
SET "dishName" = "prompt"
WHERE "dishName" IS NULL;

UPDATE "dish"
SET "dishNameEn" = "promptEn"
WHERE "dishNameEn" IS NULL;

ALTER TABLE "dish" ALTER COLUMN "dishName" SET NOT NULL;
