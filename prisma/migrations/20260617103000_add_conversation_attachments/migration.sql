CREATE TABLE "conversation_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversation_attachments_conversationId_idx" ON "conversation_attachments"("conversationId");

ALTER TABLE "conversation_attachments"
ADD CONSTRAINT "conversation_attachments_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "conversations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
