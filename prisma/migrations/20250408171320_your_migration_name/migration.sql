/*
  Warnings:

  - You are about to drop the column `customizations` on the `Page` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `Page` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Page` table. All the data in the column will be lost.
  - You are about to drop the `Template` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[pageId]` on the table `Analytics` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `Page` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pageId` to the `Analytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `socialLinks` to the `Page` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `Page` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Analytics" DROP CONSTRAINT "Analytics_userId_fkey";

-- DropForeignKey
ALTER TABLE "Page" DROP CONSTRAINT "Page_templateId_fkey";

-- AlterTable
ALTER TABLE "Analytics" ADD COLUMN     "pageId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Page" DROP COLUMN "customizations",
DROP COLUMN "link",
DROP COLUMN "title",
ADD COLUMN     "background" TEXT,
ADD COLUMN     "socialLinks" JSONB NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- DropTable
DROP TABLE "Template";

-- CreateTable
CREATE TABLE "_AnalyticsToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AnalyticsToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AnalyticsToUser_B_index" ON "_AnalyticsToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Analytics_pageId_key" ON "Analytics"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_username_key" ON "Page"("username");

-- AddForeignKey
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnalyticsToUser" ADD CONSTRAINT "_AnalyticsToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Analytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnalyticsToUser" ADD CONSTRAINT "_AnalyticsToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
