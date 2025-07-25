-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Create "membership_roles" table
CREATE TABLE `membership_roles` (
    `created_at` datetime NULL,
    `updated_at` datetime NULL,
    `deleted_at` datetime NULL,
    `org_child_type` text NULL,
    `org_child_id` integer NULL,
    `org_parent_type` text NULL,
    `org_parent_id` integer NULL,
    `role` text NULL,
    PRIMARY KEY (
        `org_child_type`,
        `org_child_id`,
        `org_parent_type`,
        `org_parent_id`,
        `role`
    )
);
-- Insert data from user_roles with transformation
-- Copy data from "user_roles" to "membership_roles"
INSERT INTO
    `membership_roles` (
        `created_at`,
        `updated_at`,
        `deleted_at`,
        `org_child_type`,
        `org_child_id`,
        `org_parent_type`,
        `org_parent_id`,
        `role`
    )
SELECT
    `created_at`,
    `updated_at`,
    `deleted_at`,
    'user',
    `user_id`,
    `org_type`,
    `org_id`,
    `role`
FROM `user_roles`;
-- Drop "user_roles" table
DROP TABLE `user_roles`;
-- Create index "idx_membership_roles_deleted_at" to table: "membership_roles"
CREATE INDEX `idx_membership_roles_deleted_at` ON `membership_roles` (`deleted_at`);
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;