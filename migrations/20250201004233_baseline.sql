-- Create "users" table
CREATE TABLE `users` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `clerk_id` text NULL, `display_name` text NULL, `bio` text NULL, `avatar_uri` text NULL);
-- Create index "idx_users_clerk_id" to table: "users"
CREATE UNIQUE INDEX `idx_users_clerk_id` ON `users` (`clerk_id`);
-- Create index "idx_users_deleted_at" to table: "users"
CREATE INDEX `idx_users_deleted_at` ON `users` (`deleted_at`);
-- Create "events" table
CREATE TABLE `events` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `title` text NULL, `description` text NULL, `start_date` datetime NULL, `end_date` datetime NULL, `image_uri` text NULL, `ticket_price` real NULL, `capacity` integer NULL, `location` text NULL, `creator_id` integer NULL, CONSTRAINT `fk_events_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_events_deleted_at" to table: "events"
CREATE INDEX `idx_events_deleted_at` ON `events` (`deleted_at`);
-- Create "sold_tickets" table
CREATE TABLE `sold_tickets` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `event_id` integer NULL, `user_id` text NULL, `price` real NULL);
-- Create index "idx_sold_tickets_deleted_at" to table: "sold_tickets"
CREATE INDEX `idx_sold_tickets_deleted_at` ON `sold_tickets` (`deleted_at`);
