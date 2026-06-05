-- Manual seed for demo users.
-- Default password for every seeded user: 123456
-- Run with:
-- docker exec -i valo-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < prisma/seed-users.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

WITH ensured_group AS (
  INSERT INTO "group" ("id", "name", "description", "created_at", "updated_at")
  VALUES (
    gen_random_uuid(),
    'user',
    'Regular users with limited access',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("name") DO UPDATE
  SET
    "description" = COALESCE("group"."description", EXCLUDED."description"),
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id"
),
target_group AS (
  SELECT "id" FROM ensured_group
  UNION ALL
  SELECT "id" FROM "group" WHERE "name" = 'user'
  LIMIT 1
),
seed_users ("full_name", "email", "phone_number", "address") AS (
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
    "full_name",
    "email",
    "phone_number",
    "address",
    "password",
    "must_change_password",
    "settings",
    "created_at",
    "updated_at"
  )
  SELECT
    gen_random_uuid(),
    seed_users."full_name",
    seed_users."email",
    seed_users."phone_number",
    seed_users."address",
    '$2b$10$vNmgNT3MthG5d9SEMDSqVOAEZCVaGcYiYdSnZOXD8HFqxi1w2G5Ry',
    false,
    '{"theme":"dark","language":"vi"}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM seed_users
  ON CONFLICT ("email") DO UPDATE
  SET
    "full_name" = EXCLUDED."full_name",
    "phone_number" = EXCLUDED."phone_number",
    "address" = EXCLUDED."address",
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id", "email"
)
INSERT INTO "user_group" ("id", "user_id", "group_id", "assigned_at")
SELECT
  gen_random_uuid(),
  upserted_users."id",
  target_group."id",
  CURRENT_TIMESTAMP
FROM upserted_users
CROSS JOIN target_group
ON CONFLICT ("user_id", "group_id") DO NOTHING;
