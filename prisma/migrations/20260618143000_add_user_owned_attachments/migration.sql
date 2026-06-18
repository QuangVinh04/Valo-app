ALTER TABLE "conversation_attachments"
ADD COLUMN "userId" UUID;

UPDATE "conversation_attachments" AS attachment
SET "userId" = conversation."userId"
FROM "conversations" AS conversation
WHERE attachment."conversationId" = conversation."id";

DELETE FROM "conversation_attachments"
WHERE "userId" IS NULL;

ALTER TABLE "conversation_attachments"
ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "conversation_attachments"
DROP CONSTRAINT IF EXISTS "conversation_attachments_conversationId_fkey";

ALTER TABLE "conversation_attachments"
ADD CONSTRAINT "conversation_attachments_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_attachments"
DROP COLUMN "conversationId";

CREATE INDEX IF NOT EXISTS "conversation_attachments_userId_idx"
ON "conversation_attachments"("userId");
