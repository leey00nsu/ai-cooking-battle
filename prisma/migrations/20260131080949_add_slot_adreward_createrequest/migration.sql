-- CreateEnum
CREATE TYPE "SlotReservationStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "SlotType" AS ENUM ('FREE', 'AD');

-- CreateEnum
CREATE TYPE "AdRewardStatus" AS ENUM ('PENDING', 'GRANTED', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CreateRequestStatus" AS ENUM ('VALIDATING', 'RESERVING', 'GENERATING', 'SAFETY', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "daily_slot_counter" (
    "dayKey" TEXT NOT NULL,
    "freeLimit" INTEGER NOT NULL DEFAULT 30,
    "adLimit" INTEGER NOT NULL DEFAULT 30,
    "freeUsedCount" INTEGER NOT NULL DEFAULT 0,
    "adUsedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_slot_counter_pkey" PRIMARY KEY ("dayKey")
);

-- CreateTable
CREATE TABLE "slot_reservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "status" "SlotReservationStatus" NOT NULL,
    "slotType" "SlotType" NOT NULL,
    "adRewardId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_reward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "status" "AdRewardStatus" NOT NULL,
    "nonce" TEXT NOT NULL,
    "confirmIdempotencyKey" TEXT,
    "grantedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "create_request" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "status" "CreateRequestStatus" NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "create_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slot_reservation_userId_idx" ON "slot_reservation"("userId");

-- CreateIndex
CREATE INDEX "slot_reservation_dayKey_idx" ON "slot_reservation"("dayKey");

-- CreateIndex
CREATE INDEX "slot_reservation_status_idx" ON "slot_reservation"("status");

-- CreateIndex
CREATE INDEX "slot_reservation_expiresAt_idx" ON "slot_reservation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "slot_reservation_userId_idempotencyKey_key" ON "slot_reservation"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ad_reward_nonce_key" ON "ad_reward"("nonce");

-- CreateIndex
CREATE INDEX "ad_reward_userId_idx" ON "ad_reward"("userId");

-- CreateIndex
CREATE INDEX "ad_reward_dayKey_idx" ON "ad_reward"("dayKey");

-- CreateIndex
CREATE INDEX "ad_reward_status_idx" ON "ad_reward"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ad_reward_userId_confirmIdempotencyKey_key" ON "ad_reward"("userId", "confirmIdempotencyKey");

-- CreateIndex
CREATE INDEX "create_request_userId_idx" ON "create_request"("userId");

-- CreateIndex
CREATE INDEX "create_request_reservationId_idx" ON "create_request"("reservationId");

-- CreateIndex
CREATE INDEX "create_request_status_idx" ON "create_request"("status");

-- CreateIndex
CREATE UNIQUE INDEX "create_request_userId_idempotencyKey_key" ON "create_request"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "slot_reservation" ADD CONSTRAINT "slot_reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_reservation" ADD CONSTRAINT "slot_reservation_adRewardId_fkey" FOREIGN KEY ("adRewardId") REFERENCES "ad_reward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_reward" ADD CONSTRAINT "ad_reward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "create_request" ADD CONSTRAINT "create_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "create_request" ADD CONSTRAINT "create_request_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "slot_reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
