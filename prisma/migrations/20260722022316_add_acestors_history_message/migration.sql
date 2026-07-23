-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "ancestors" TEXT[] DEFAULT ARRAY[]::TEXT[];
