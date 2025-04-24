-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Create "new_users" table
CREATE TABLE `new_users` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `auth_id` text NULL, `display_name` text NULL, `bio` text NULL, `avatar_uri` text NULL, `plan` text NULL DEFAULT 'free');
-- Copy rows from old table "users" to new temporary table "new_users"
INSERT INTO `new_users` (`id`, `created_at`, `updated_at`, `deleted_at`, `auth_id`, `display_name`, `bio`, `avatar_uri`) SELECT `id`, `created_at`, `updated_at`, `deleted_at`, `auth_id`, `display_name`, `bio`, `avatar_uri` FROM `users`;
-- Drop "users" table after copying rows
DROP TABLE `users`;
-- Rename temporary table "new_users" to "users"
ALTER TABLE `new_users` RENAME TO `users`;
-- Create index "idx_users_auth_id" to table: "users"
CREATE UNIQUE INDEX `idx_users_auth_id` ON `users` (`auth_id`);
-- Create index "idx_users_deleted_at" to table: "users"
CREATE INDEX `idx_users_deleted_at` ON `users` (`deleted_at`);
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;
