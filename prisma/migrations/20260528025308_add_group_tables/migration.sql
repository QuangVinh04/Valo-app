-- CreateTable
CREATE TABLE "group" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_group" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_permission" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "permission_key" TEXT NOT NULL,

    CONSTRAINT "group_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_group_user_id_idx" ON "user_group"("user_id");

-- CreateIndex
CREATE INDEX "user_group_group_id_idx" ON "user_group"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_group_user_id_group_id_key" ON "user_group"("user_id", "group_id");

-- CreateIndex
CREATE INDEX "group_permission_group_id_idx" ON "group_permission"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_permission_group_id_permission_key_key" ON "group_permission"("group_id", "permission_key");

-- AddForeignKey
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_permission" ADD CONSTRAINT "group_permission_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
