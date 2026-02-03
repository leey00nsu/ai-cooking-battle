-- CreateTable
CREATE TABLE "dish" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_day_score" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dish_day_score_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dish_userId_idx" ON "dish"("userId");

-- CreateIndex
CREATE INDEX "dish_createdAt_idx" ON "dish"("createdAt");

-- CreateIndex
CREATE INDEX "dish_isHidden_idx" ON "dish"("isHidden");

-- CreateIndex
CREATE INDEX "dish_day_score_dishId_idx" ON "dish_day_score"("dishId");

-- CreateIndex
CREATE INDEX "dish_day_score_dayKey_idx" ON "dish_day_score"("dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "dish_day_score_dishId_dayKey_key" ON "dish_day_score"("dishId", "dayKey");

-- AddForeignKey
ALTER TABLE "dish" ADD CONSTRAINT "dish_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_day_score" ADD CONSTRAINT "dish_day_score_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

