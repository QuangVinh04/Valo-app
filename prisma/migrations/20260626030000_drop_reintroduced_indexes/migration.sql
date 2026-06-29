-- Drop indexes recreated by older migrations but no longer represented in the Prisma schema.
DROP INDEX IF EXISTS "conversation_attachments_messageId_idx";
DROP INDEX IF EXISTS "messages_conversationId_createdAt_idx";
DROP INDEX IF EXISTS "messages_conversationId_idx";
