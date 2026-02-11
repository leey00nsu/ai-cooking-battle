-- CreateEnum
CREATE TYPE "DishDayScoreStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- AlterEnum
ALTER TYPE "OpenAiCallKind" ADD VALUE 'DISH_SCORE';

-- AlterTable
ALTER TABLE "dish_day_score" ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "execution" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "oneLiner" TEXT,
ADD COLUMN     "reasons" JSONB,
ADD COLUMN     "status" "DishDayScoreStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "themeFit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tip" TEXT;

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetDishId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_reporterId_idx" ON "report"("reporterId");

-- CreateIndex
CREATE INDEX "report_targetDishId_idx" ON "report"("targetDishId");

-- CreateIndex
CREATE INDEX "report_createdAt_idx" ON "report"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "report_reporterId_targetDishId_key" ON "report"("reporterId", "targetDishId");

-- CreateIndex
CREATE INDEX "dish_day_score_status_idx" ON "dish_day_score"("status");

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_targetDishId_fkey" FOREIGN KEY ("targetDishId") REFERENCES "dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
