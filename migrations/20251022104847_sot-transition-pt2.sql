-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Drop "posts" table
DROP TABLE `posts`;
-- Drop "polls" table
DROP TABLE `polls`;
-- Drop "poll_results" table
DROP TABLE `poll_results`;
-- Drop "tags" table
DROP TABLE `tags`;
-- Drop "reactions" table
DROP TABLE `reactions`;
-- Drop "checkins" table
DROP TABLE `checkins`;
-- Drop "communities" table
DROP TABLE `communities`;
-- Drop "entity_roles" table
DROP TABLE `entity_roles`;
-- Drop "feeds" table
DROP TABLE `feeds`;
-- Drop "events" table
DROP TABLE `events`;
-- Create "new_users" table
CREATE TABLE `new_users` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `auth_id` text NULL, `plan` text NULL DEFAULT 'free', `realm_id` text NULL);
-- Copy rows from old table "users" to new temporary table "new_users"
INSERT INTO `new_users` (`id`, `created_at`, `updated_at`, `deleted_at`, `auth_id`, `plan`, `realm_id`) SELECT `id`, `created_at`, `updated_at`, `deleted_at`, `auth_id`, `plan`, `realm_id` FROM `users`;
-- Drop "users" table after copying rows
DROP TABLE `users`;
-- Rename temporary table "new_users" to "users"
ALTER TABLE `new_users` RENAME TO `users`;
-- Create index "idx_users_realm_id" to table: "users"
CREATE UNIQUE INDEX `idx_users_realm_id` ON `users` (`realm_id`);
-- Create index "idx_users_auth_id" to table: "users"
CREATE UNIQUE INDEX `idx_users_auth_id` ON `users` (`auth_id`);
-- Create index "idx_users_deleted_at" to table: "users"
CREATE INDEX `idx_users_deleted_at` ON `users` (`deleted_at`);
-- Create "new_sold_tickets" table
CREATE TABLE `new_sold_tickets` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `event_realm_id` text NOT NULL, `user_realm_id` text NOT NULL, `buyer_realm_id` text NOT NULL, `price` real NULL, `secret` text NOT NULL, `pubkey` text NOT NULL);
-- Copy rows from old table "sold_tickets" to new temporary table "new_sold_tickets"
INSERT INTO `new_sold_tickets` (`id`, `created_at`, `updated_at`, `deleted_at`, `event_realm_id`, `user_realm_id`, `buyer_realm_id`, `price`, `secret`, `pubkey`) SELECT `id`, `created_at`, `updated_at`, `deleted_at`, `event_realm_id`, `user_realm_id`, `buyer_realm_id`, `price`, `secret`, `pubkey` FROM `sold_tickets`;
-- Drop "sold_tickets" table after copying rows
DROP TABLE `sold_tickets`;
-- Rename temporary table "new_sold_tickets" to "sold_tickets"
ALTER TABLE `new_sold_tickets` RENAME TO `sold_tickets`;
-- Create index "idx_sold_tickets_pubkey" to table: "sold_tickets"
CREATE UNIQUE INDEX `idx_sold_tickets_pubkey` ON `sold_tickets` (`pubkey`);
-- Create index "idx_sold_tickets_secret" to table: "sold_tickets"
CREATE UNIQUE INDEX `idx_sold_tickets_secret` ON `sold_tickets` (`secret`);
-- Create index "idx_event_user_deleted" to table: "sold_tickets"
CREATE UNIQUE INDEX `idx_event_user_deleted` ON `sold_tickets` (`event_realm_id`, `user_realm_id`, `deleted_at`);
-- Create index "idx_sold_tickets_deleted_at" to table: "sold_tickets"
CREATE INDEX `idx_sold_tickets_deleted_at` ON `sold_tickets` (`deleted_at`);
-- Drop "poll_votes" table
DROP TABLE `poll_votes`;
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;
