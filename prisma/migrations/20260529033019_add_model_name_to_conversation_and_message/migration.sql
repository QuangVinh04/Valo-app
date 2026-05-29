-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_userId_fkey";

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "model_name" TEXT;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "model_name" TEXT;

-- CreateIndex
CREATE INDEX "conversations_userId_updated_at_idx" ON "conversations"("userId", "updated_at");

-- CreateIndex
CREATE INDEX "messages_conversationId_created_at_idx" ON "messages"("conversationId", "created_at");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
