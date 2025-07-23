-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Create "new_user_roles" table
CREATE TABLE `new_user_roles` (`created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `user_id` integer NULL, `org_type` text NULL, `org_id` integer NULL, `role` text NULL, PRIMARY KEY (`user_id`, `org_type`, `org_id`, `role`), CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Copy rows from old table "user_roles" to new temporary table "new_user_roles"
INSERT INTO `new_user_roles` (`created_at`, `updated_at`, `deleted_at`, `user_id`, `org_type`, `org_id`, `role`) SELECT `created_at`, `updated_at`, `deleted_at`, `user_id`, 'event', `event_id`, `role` FROM `user_roles`;
-- Drop "user_roles" table after copying rows
DROP TABLE `user_roles`;
-- Rename temporary table "new_user_roles" to "user_roles"
ALTER TABLE `new_user_roles` RENAME TO `user_roles`;
-- Create index "idx_user_roles_deleted_at" to table: "user_roles"
CREATE INDEX `idx_user_roles_deleted_at` ON `user_roles` (`deleted_at`);
-- Create "communities" table
CREATE TABLE `communities` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `display_name` text NULL, `description` text NULL, `avatar_uri` text NULL, `banner_uri` text NULL, `creator_id` integer NULL, CONSTRAINT `fk_communities_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_communities_deleted_at" to table: "communities"
CREATE INDEX `idx_communities_deleted_at` ON `communities` (`deleted_at`);
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;
