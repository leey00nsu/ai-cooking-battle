-- CreateEnum
CREATE TYPE "OpenAiCallKind" AS ENUM ('PROMPT_VALIDATE', 'IMAGE_SAFETY');

-- CreateTable
CREATE TABLE "openai_call_log" (
    "id" TEXT NOT NULL,
    "kind" "OpenAiCallKind" NOT NULL,
    "model" TEXT NOT NULL,
    "openAiResponseId" TEXT,
    "userId" TEXT NOT NULL,
    "createRequestId" TEXT,
    "inputPrompt" TEXT NOT NULL,
    "inputImageUrl" TEXT,
    "outputText" TEXT,
    "outputJson" JSONB,
    "decision" TEXT,
    "category" TEXT,
    "reason" TEXT,
    "errorCode" TEXT,
    "errorStatus" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "openai_call_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "openai_call_log_userId_idx" ON "openai_call_log"("userId");

-- CreateIndex
CREATE INDEX "openai_call_log_createRequestId_idx" ON "openai_call_log"("createRequestId");

-- CreateIndex
CREATE INDEX "openai_call_log_kind_idx" ON "openai_call_log"("kind");

-- AddForeignKey
ALTER TABLE "openai_call_log" ADD CONSTRAINT "openai_call_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openai_call_log" ADD CONSTRAINT "openai_call_log_createRequestId_fkey" FOREIGN KEY ("createRequestId") REFERENCES "create_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;
