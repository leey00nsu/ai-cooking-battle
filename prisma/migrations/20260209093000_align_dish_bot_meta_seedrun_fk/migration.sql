-- DropForeignKey
ALTER TABLE "dish_bot_meta" DROP CONSTRAINT "dish_bot_meta_seedRunId_fkey";

-- AddForeignKey
ALTER TABLE "dish_bot_meta"
ADD CONSTRAINT "dish_bot_meta_seedRunId_fkey"
FOREIGN KEY ("seedRunId") REFERENCES "bot_seed_run"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
