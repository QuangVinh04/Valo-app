-- Drop explicit non-unique indexes removed from the Prisma schema.
DROP INDEX IF EXISTS "conversations_userId_idx";
DROP INDEX IF EXISTS "conversations_userId_updated_at_idx";
DROP INDEX IF EXISTS "messages_conversationId_idx";
DROP INDEX IF EXISTS "messages_conversationId_created_at_idx";
DROP INDEX IF EXISTS "user_group_user_id_idx";
DROP INDEX IF EXISTS "user_group_group_id_idx";
DROP INDEX IF EXISTS "group_permission_group_id_idx";

-- Rename database columns to match Prisma field names directly.
ALTER TABLE "users" RENAME COLUMN "full_name" TO "fullName";
ALTER TABLE "users" RENAME COLUMN "phone_number" TO "phoneNumber";
ALTER TABLE "users" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "users" RENAME COLUMN "updated_at" TO "updatedAt";
ALTER TABLE "users" RENAME COLUMN "refresh_token" TO "refreshToken";
ALTER TABLE "users" RENAME COLUMN "must_change_password" TO "mustChangePassword";

ALTER TABLE "conversations" RENAME COLUMN "model_name" TO "modelName";
ALTER TABLE "conversations" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "conversations" RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "messages" RENAME COLUMN "sender_type" TO "senderType";
ALTER TABLE "messages" RENAME COLUMN "model_name" TO "modelName";
ALTER TABLE "messages" RENAME COLUMN "created_at" TO "createdAt";

ALTER TABLE "group" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "group" RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "user_group" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE "user_group" RENAME COLUMN "group_id" TO "groupId";
ALTER TABLE "user_group" RENAME COLUMN "assigned_at" TO "assignedAt";

ALTER TABLE "group_permission" RENAME COLUMN "group_id" TO "groupId";
ALTER TABLE "group_permission" RENAME COLUMN "permission_key" TO "permissionKey";

-- Settings no longer has a default and may be null.
ALTER TABLE "users" ALTER COLUMN "settings" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "settings" DROP NOT NULL;
