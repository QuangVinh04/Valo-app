-- DropIndex
DROP INDEX "conversation_attachments_messageId_idx";

-- DropIndex
DROP INDEX "conversation_attachments_userId_idx";

-- DropIndex
DROP INDEX "messages_conversationId_createdAt_idx";

-- DropIndex
DROP INDEX "messages_conversationId_idx";

-- AlterTable
ALTER TABLE "conversation_attachments" ALTER COLUMN "id" DROP DEFAULT;
