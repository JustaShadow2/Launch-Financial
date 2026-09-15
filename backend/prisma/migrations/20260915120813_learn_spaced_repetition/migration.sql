-- AlterTable
ALTER TABLE "LessonProgress" ADD COLUMN     "crownLevel" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freezeLastEarnedDay" TEXT,
ADD COLUMN     "freezeUsedDay" TEXT,
ADD COLUMN     "streakFreezes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ItemMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "halfLifeHours" DOUBLE PRECISION NOT NULL DEFAULT 24,
    "lastReviewed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timesSeen" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "timesWrong" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ItemMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemMemory_userId_lessonId_idx" ON "ItemMemory"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "ItemMemory_userId_idx" ON "ItemMemory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMemory_userId_itemId_key" ON "ItemMemory"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "ItemMemory" ADD CONSTRAINT "ItemMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
