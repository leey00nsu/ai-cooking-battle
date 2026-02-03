-- Drop incorrect unique index that blocks multiple reservations per user/day.
-- The slot policy is enforced by application logic (freeDailyLimit + ACTIVE reservation count).
DROP INDEX IF EXISTS "slot_reservation_userId_dayKey_free_key";
