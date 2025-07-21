-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Drop "user_roles" table
DROP TABLE `user_roles`;
-- Create "communities" table
CREATE TABLE `communities` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `display_name` text NULL, `description` text NULL, `avatar_uri` text NULL, `banner_uri` text NULL, `creator_id` integer NULL, CONSTRAINT `fk_communities_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_communities_deleted_at" to table: "communities"
CREATE INDEX `idx_communities_deleted_at` ON `communities` (`deleted_at`);
-- Create "user_community_roles" table
CREATE TABLE `user_community_roles` (`created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `user_id` integer NULL, `community_id` integer NULL, `role` text NULL, PRIMARY KEY (`user_id`, `community_id`, `role`), CONSTRAINT `fk_user_community_roles_community` FOREIGN KEY (`community_id`) REFERENCES `communities` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION, CONSTRAINT `fk_user_community_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_user_community_roles_deleted_at" to table: "user_community_roles"
CREATE INDEX `idx_user_community_roles_deleted_at` ON `user_community_roles` (`deleted_at`);
-- Create "user_event_roles" table
CREATE TABLE `user_event_roles` (`created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `user_id` integer NULL, `event_id` integer NULL, `role` text NULL, PRIMARY KEY (`user_id`, `event_id`, `role`), CONSTRAINT `fk_user_event_roles_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION, CONSTRAINT `fk_user_event_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_user_event_roles_deleted_at" to table: "user_event_roles"
CREATE INDEX `idx_user_event_roles_deleted_at` ON `user_event_roles` (`deleted_at`);
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;
