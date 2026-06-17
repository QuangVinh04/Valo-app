-- RenameForeignKey
ALTER TABLE "group_permission" RENAME CONSTRAINT "group_permission_group_id_fkey" TO "group_permission_groupId_fkey";

-- RenameForeignKey
ALTER TABLE "user_group" RENAME CONSTRAINT "user_group_group_id_fkey" TO "user_group_groupId_fkey";

-- RenameForeignKey
ALTER TABLE "user_group" RENAME CONSTRAINT "user_group_user_id_fkey" TO "user_group_userId_fkey";

-- RenameIndex
ALTER INDEX "group_permission_group_id_permission_key_key" RENAME TO "group_permission_groupId_permissionKey_key";

-- RenameIndex
ALTER INDEX "user_group_user_id_group_id_key" RENAME TO "user_group_userId_groupId_key";
