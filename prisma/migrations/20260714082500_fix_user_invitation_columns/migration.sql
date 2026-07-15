-- Keep this migration compatible with databases that already ran the original
-- invitation-status migration as well as fresh databases using the new schema.
ALTER TABLE "users"
ALTER COLUMN "password" DROP NOT NULL;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "invitationEmailFailed" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'invitationStatus'
  ) THEN
    EXECUTE 'UPDATE "users"
             SET "invitationEmailFailed" = true
             WHERE "invitationStatus"::text = ''FAILED''';
    EXECUTE 'ALTER TABLE "users" DROP COLUMN "invitationStatus"';
  END IF;
END $$;

DROP TYPE IF EXISTS "InvitationStatus";
