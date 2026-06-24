ALTER TABLE "conversation_attachments"
ADD COLUMN IF NOT EXISTS "messageId" UUID;

CREATE INDEX IF NOT EXISTS "conversation_attachments_messageId_idx"
ON "conversation_attachments"("messageId");

ALTER TABLE "conversation_attachments"
DROP CONSTRAINT IF EXISTS "conversation_attachments_messageId_fkey";

ALTER TABLE "conversation_attachments"
ADD CONSTRAINT "conversation_attachments_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "messages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
