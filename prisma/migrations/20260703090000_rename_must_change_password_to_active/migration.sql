ALTER TABLE "users" RENAME COLUMN "mustChangePassword" TO "active";
ALTER TABLE "users" ALTER COLUMN "active" SET DEFAULT false;
