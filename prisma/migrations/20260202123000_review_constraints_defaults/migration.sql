-- Align DB defaults with runtime slot policy.
ALTER TABLE "daily_slot_counter"
  ALTER COLUMN "freeLimit" SET DEFAULT 60,
  ALTER COLUMN "adLimit" SET DEFAULT 0;

-- Enforce one FREE reservation per user per day under concurrency.
CREATE UNIQUE INDEX "slot_reservation_userId_dayKey_free_key"
ON "slot_reservation" ("userId", "dayKey")
WHERE "slotType" = 'FREE';

-- Enforce one PENDING ad reward per user/day under concurrency.
CREATE UNIQUE INDEX "ad_reward_userId_dayKey_pending_key"
ON "ad_reward" ("userId", "dayKey")
WHERE "status" = 'PENDING';
