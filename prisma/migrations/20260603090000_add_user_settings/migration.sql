ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{"theme":"dark","language":"vi"}';
