ALTER TABLE "conversations"
ADD COLUMN "chatId" TEXT,
ADD COLUMN "sessionId" TEXT;

DROP TABLE IF EXISTS "messages";

DROP TYPE IF EXISTS "Role";
