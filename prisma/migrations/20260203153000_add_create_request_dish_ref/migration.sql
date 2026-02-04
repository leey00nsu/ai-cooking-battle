-- AlterTable
ALTER TABLE "create_request" ADD COLUMN     "dishId" TEXT;

-- CreateIndex
CREATE INDEX "create_request_dishId_idx" ON "create_request"("dishId");

-- AddForeignKey
ALTER TABLE "create_request" ADD CONSTRAINT "create_request_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
