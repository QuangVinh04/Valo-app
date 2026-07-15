-- Admin-created users do not have a password until they accept the email invitation.
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- Allows the admin UI to offer resending only when invitation delivery failed.
ALTER TABLE "users"
ADD COLUMN "invitationEmailFailed" BOOLEAN NOT NULL DEFAULT false;
