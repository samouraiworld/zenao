-- Create "user_roles" table
CREATE TABLE `user_roles` (`created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `user_id` integer NULL, `event_id` integer NULL, `role` text NULL, PRIMARY KEY (`user_id`, `event_id`, `role`));
-- Create index "idx_user_roles_deleted_at" to table: "user_roles"
CREATE INDEX `idx_user_roles_deleted_at` ON `user_roles` (`deleted_at`);
-- Copy existing organizers
INSERT INTO `user_roles` (`created_at`, `updated_at`, `deleted_at`, `user_id`, `event_id`, `role`) SELECT `created_at`, `updated_at`, `deleted_at`, `creator_id`, `id`, 'organizer' FROM `events`;
-- Copy existing participants
INSERT INTO `user_roles` (`created_at`, `updated_at`, `deleted_at`, `user_id`, `event_id`, `role`) SELECT `created_at`, `updated_at`, `deleted_at`, `user_id`, `event_id`, 'participant' FROM `sold_tickets`;