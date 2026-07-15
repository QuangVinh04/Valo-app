-- Manual seed for demo users.
-- Default password for every seeded user: Demo@1234
-- The password satisfies the current UI policy: 8+ chars, uppercase, lowercase,
-- number, and special character. Re-running this script resets demo passwords.
-- Run with:
-- docker exec -i valo-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < prisma/seed-users.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

WITH ensured_group AS (
  INSERT INTO "group" (
    "id",
    "name",
    "description",
    "permissions",
    "isSystem",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    gen_random_uuid(),
    'user',
    'Regular users with limited access',
    ARRAY['CHAT', 'CONV_C', 'CONV_R', 'CONV_U', 'CONV_D']::TEXT[],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("name") DO UPDATE
  SET
    "description" = EXCLUDED."description",
    "permissions" = EXCLUDED."permissions",
    "isSystem" = true,
    "updatedAt" = CURRENT_TIMESTAMP
  RETURNING "id"
),
target_group AS (
  SELECT "id" FROM ensured_group
  UNION ALL
  SELECT "id" FROM "group" WHERE "name" = 'user'
  LIMIT 1
),
seed_users ("fullName", "email", "phoneNumber", "address") AS (
  VALUES
    ('Evelyn Loomis', 'e.loomis@neuralhub.ai', '+1 415 010 1001', 'San Francisco, CA'),
    ('Marcus Chen', 'm.chen@agentflow.io', '+1 415 010 1002', 'Seattle, WA'),
    ('Sofia Vance', 'vance.s@neural.core', '+1 415 010 1003', 'Austin, TX'),
    ('Julian Hayes', 'j.hayes@hub.internal', '+1 415 010 1004', 'New York, NY'),
    ('Alex Rivera', 'alex@deepintelligence.ai', '+1 415 010 1005', 'Denver, CO')
),
upserted_users AS (
  INSERT INTO "users" (
    "id",
    "fullName",
    "email",
    "phoneNumber",
    "address",
    "password",
    "active",
    "settings",
    "createdAt",
    "updatedAt"
  )
  SELECT
    gen_random_uuid(),
    seed_users."fullName",
    seed_users."email",
    seed_users."phoneNumber",
    seed_users."address",
    '$2b$10$Z6JAsYAyDKi2bVtyk1wH2.wh4QkLP0ZSk4cn8/HDq7tTX04haJyp.',
    true,
    '{"theme":"dark","language":"vi"}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM seed_users
  ON CONFLICT ("email") DO UPDATE
  SET
    "fullName" = EXCLUDED."fullName",
    "phoneNumber" = EXCLUDED."phoneNumber",
    "address" = EXCLUDED."address",
    "password" = EXCLUDED."password",
    "active" = true,
    "settings" = EXCLUDED."settings",
    "updatedAt" = CURRENT_TIMESTAMP
  RETURNING "id", "email"
)
INSERT INTO "user_group" ("id", "userId", "groupId", "assignedAt")
SELECT
  gen_random_uuid(),
  upserted_users."id",
  target_group."id",
  CURRENT_TIMESTAMP
FROM upserted_users
CROSS JOIN target_group
ON CONFLICT ("userId", "groupId") DO NOTHING;
