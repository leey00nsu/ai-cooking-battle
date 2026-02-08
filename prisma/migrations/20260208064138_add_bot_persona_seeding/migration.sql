-- CreateEnum
CREATE TYPE "BotSeedTriggerType" AS ENUM ('SCHEDULE', 'ADMIN');

-- CreateEnum
CREATE TYPE "BotSeedRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED_PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "BotSeedItemStatus" AS ENUM ('SELECTED', 'GENERATING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "bot_persona" (
    "personaKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "stylePrompt" TEXT NOT NULL,
    "styleGroup" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_persona_pkey" PRIMARY KEY ("personaKey")
);

-- CreateTable
CREATE TABLE "bot_seed_run" (
    "id" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "triggerType" "BotSeedTriggerType" NOT NULL,
    "status" "BotSeedRunStatus" NOT NULL DEFAULT 'PENDING',
    "selectedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_seed_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_seed_item" (
    "id" TEXT NOT NULL,
    "seedRunId" TEXT NOT NULL,
    "personaKey" TEXT NOT NULL,
    "selectedOrder" INTEGER NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "BotSeedItemStatus" NOT NULL DEFAULT 'SELECTED',
    "dishId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_seed_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_bot_meta" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "personaKey" TEXT NOT NULL,
    "seedRunId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dish_bot_meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_persona_isActive_idx" ON "bot_persona"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "bot_seed_run_dayKey_key" ON "bot_seed_run"("dayKey");

-- CreateIndex
CREATE INDEX "bot_seed_run_status_idx" ON "bot_seed_run"("status");

-- CreateIndex
CREATE INDEX "bot_seed_run_createdAt_idx" ON "bot_seed_run"("createdAt");

-- CreateIndex
CREATE INDEX "bot_seed_item_seedRunId_idx" ON "bot_seed_item"("seedRunId");

-- CreateIndex
CREATE INDEX "bot_seed_item_personaKey_idx" ON "bot_seed_item"("personaKey");

-- CreateIndex
CREATE INDEX "bot_seed_item_status_idx" ON "bot_seed_item"("status");

-- CreateIndex
CREATE INDEX "bot_seed_item_dishId_idx" ON "bot_seed_item"("dishId");

-- CreateIndex
CREATE UNIQUE INDEX "bot_seed_item_seedRunId_selectedOrder_attempt_key" ON "bot_seed_item"("seedRunId", "selectedOrder", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "dish_bot_meta_dishId_key" ON "dish_bot_meta"("dishId");

-- CreateIndex
CREATE INDEX "dish_bot_meta_dayKey_idx" ON "dish_bot_meta"("dayKey");

-- CreateIndex
CREATE INDEX "dish_bot_meta_personaKey_idx" ON "dish_bot_meta"("personaKey");

-- CreateIndex
CREATE INDEX "dish_bot_meta_seedRunId_idx" ON "dish_bot_meta"("seedRunId");

-- AddForeignKey
ALTER TABLE "bot_seed_item" ADD CONSTRAINT "bot_seed_item_seedRunId_fkey" FOREIGN KEY ("seedRunId") REFERENCES "bot_seed_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_seed_item" ADD CONSTRAINT "bot_seed_item_personaKey_fkey" FOREIGN KEY ("personaKey") REFERENCES "bot_persona"("personaKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_seed_item" ADD CONSTRAINT "bot_seed_item_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_bot_meta" ADD CONSTRAINT "dish_bot_meta_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_bot_meta" ADD CONSTRAINT "dish_bot_meta_personaKey_fkey" FOREIGN KEY ("personaKey") REFERENCES "bot_persona"("personaKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_bot_meta" ADD CONSTRAINT "dish_bot_meta_seedRunId_fkey" FOREIGN KEY ("seedRunId") REFERENCES "bot_seed_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
