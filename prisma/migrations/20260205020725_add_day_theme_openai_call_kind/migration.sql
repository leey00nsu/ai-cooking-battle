-- AlterEnum
ALTER TYPE "OpenAiCallKind" ADD VALUE 'DAY_THEME';

-- AlterTable
ALTER TABLE "openai_call_log" ALTER COLUMN "userId" DROP NOT NULL;
