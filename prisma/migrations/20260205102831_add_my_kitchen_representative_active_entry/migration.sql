/*
  Warnings:

  - A unique constraint covering the columns `[representativeDishId]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "representativeDishId" TEXT;

-- CreateTable
CREATE TABLE "active_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "active_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "active_entry_userId_key" ON "active_entry"("userId");

-- CreateIndex
CREATE INDEX "active_entry_dishId_idx" ON "active_entry"("dishId");

-- CreateIndex
CREATE INDEX "active_entry_isActive_idx" ON "active_entry"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_representativeDishId_key" ON "user"("representativeDishId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_representativeDishId_fkey" FOREIGN KEY ("representativeDishId") REFERENCES "dish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_entry" ADD CONSTRAINT "active_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_entry" ADD CONSTRAINT "active_entry_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
