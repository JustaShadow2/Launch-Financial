-- CreateTable
CREATE TABLE "DailyChallengeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "choice" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallengeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyChallengeLog_userId_idx" ON "DailyChallengeLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallengeLog_userId_day_key" ON "DailyChallengeLog"("userId", "day");

-- AddForeignKey
ALTER TABLE "DailyChallengeLog" ADD CONSTRAINT "DailyChallengeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
