ALTER TABLE "group" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "group" AS g
SET "permissions" = permissions_by_group.permissions
FROM (
  SELECT "groupId", array_agg("permissionKey" ORDER BY "permissionKey") AS permissions
  FROM "group_permission"
  GROUP BY "groupId"
) AS permissions_by_group
WHERE g.id = permissions_by_group."groupId";

DROP TABLE "group_permission";
