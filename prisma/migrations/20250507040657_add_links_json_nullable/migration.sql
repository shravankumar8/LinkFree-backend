/*
  Warnings:

  - You are about to drop the `Link` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Link" DROP CONSTRAINT "Link_pageId_fkey";

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "links" JSONB DEFAULT '[]';

-- DropTable
DROP TABLE "Link";
