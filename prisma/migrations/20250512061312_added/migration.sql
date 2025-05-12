/*
  Warnings:

  - You are about to drop the column `pageId` on the `Analytics` table. All the data in the column will be lost.
  - You are about to drop the `_AnalyticsToUser` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Analytics` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Analytics" DROP CONSTRAINT "Analytics_pageId_fkey";

-- DropForeignKey
ALTER TABLE "_AnalyticsToUser" DROP CONSTRAINT "_AnalyticsToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_AnalyticsToUser" DROP CONSTRAINT "_AnalyticsToUser_B_fkey";

-- DropIndex
DROP INDEX "Analytics_pageId_key";

-- AlterTable
ALTER TABLE "Analytics" DROP COLUMN "pageId";

-- DropTable
DROP TABLE "_AnalyticsToUser";

-- CreateIndex
CREATE UNIQUE INDEX "Analytics_userId_key" ON "Analytics"("userId");

-- CreateIndex
CREATE INDEX "Analytics_userId_idx" ON "Analytics"("userId");

-- AddForeignKey
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
