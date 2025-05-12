/*
  Warnings:

  - You are about to drop the column `username` on the `Page` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Page` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Page_username_key";

-- AlterTable
ALTER TABLE "Page" DROP COLUMN "username",
ADD COLUMN     "slug" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "visibility" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");
