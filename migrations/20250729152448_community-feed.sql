-- Disable the enforcement of foreign-keys constraints
PRAGMA defer_foreign_keys = on;

PRAGMA foreign_keys = off;
-- Create "new_feeds" table with the new schema
CREATE TABLE `new_feeds` (
    `id` integer PRIMARY KEY AUTOINCREMENT,
    `created_at` datetime NULL,
    `updated_at` datetime NULL,
    `deleted_at` datetime NULL,
    `slug` text NULL,
    `org_type` text NULL,
    `org_id` integer NULL
);
-- Copy rows from old "feeds" to "new_feeds"
INSERT INTO
    `new_feeds` (
        `id`,
        `created_at`,
        `updated_at`,
        `deleted_at`,
        `slug`,
        `org_type`,
        `org_id`
    )
SELECT
    `id`,
    `created_at`,
    `updated_at`,
    `deleted_at`,
    `slug`,
    'event',
    `event_id`
FROM `feeds`;
-- Drop old "feeds" table
DROP TABLE `feeds`;
-- Rename "new_feeds" to "feeds"
ALTER TABLE `new_feeds` RENAME TO `feeds`;
-- Create index "idx_feeds_deleted_at" on "feeds"
CREATE INDEX `idx_feeds_deleted_at` ON `feeds` (`deleted_at`);
-- Re-enable foreign key constraints
PRAGMA foreign_keys = on;

PRAGMA defer_foreign_keys = off;