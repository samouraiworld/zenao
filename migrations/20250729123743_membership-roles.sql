-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Create "entity_roles" table
CREATE TABLE `entity_roles` (
    `created_at` datetime NULL,
    `updated_at` datetime NULL,
    `deleted_at` datetime NULL,
    `entity_type` text NULL,
    `entity_id` integer NULL,
    `org_type` text NULL,
    `org_id` integer NULL,
    `role` text NULL,
    PRIMARY KEY (
        `entity_type`,
        `entity_id`,
        `org_type`,
        `org_id`,
        `role`
    )
);
-- Copy data from "user_roles" to "entity_roles"
INSERT INTO
    `entity_roles` (
        `created_at`,
        `updated_at`,
        `deleted_at`,
        `entity_type`,
        `entity_id`,
        `org_type`,
        `org_id`,
        `role`
    )
SELECT
    `created_at`,
    `updated_at`,
    `deleted_at`,
    'user', -- hardcode old user_roles to entity_type='user'
    `user_id`,
    `org_type`,
    `org_id`,
    `role`
FROM `user_roles`;
-- Drop "user_roles" table
DROP TABLE `user_roles`;
-- Create index "idx_entity_roles_deleted_at" to table: "entity_roles"
CREATE INDEX `idx_entity_roles_deleted_at` ON `entity_roles` (`deleted_at`);
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;