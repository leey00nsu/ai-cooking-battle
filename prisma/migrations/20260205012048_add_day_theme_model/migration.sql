-- CreateTable
CREATE TABLE "day_theme" (
    "dayKey" TEXT NOT NULL,
    "themeText" TEXT NOT NULL,
    "themeTextEn" TEXT NOT NULL,
    "themeImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "day_theme_pkey" PRIMARY KEY ("dayKey")
);

-- CreateIndex
CREATE INDEX "day_theme_createdAt_idx" ON "day_theme"("createdAt");
