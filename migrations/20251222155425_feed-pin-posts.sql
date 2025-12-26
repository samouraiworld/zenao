-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Create "new_events" table
CREATE TABLE `new_events` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `created_at` datetime NULL,
  `updated_at` datetime NULL,
  `deleted_at` datetime NULL,
  `title` text NULL,
  `description` text NULL,
  `start_date` datetime NULL,
  `end_date` datetime NULL,
  `image_uri` text NULL,
  `ticket_price` real NULL,
  `capacity` integer NULL,
  `creator_id` integer NULL,
  `discoverable` numeric NULL,
  `password_hash` text NULL,
  `loc_venue_name` text NULL,
  `loc_kind` text NULL,
  `loc_address` text NULL,
  `loc_instructions` text NULL,
  `loc_timezone` text NULL,
  `loc_lat` real NULL,
  `loc_lng` real NULL,
  `ics_sequence_number` integer NOT NULL DEFAULT 0,
  CONSTRAINT `fk_events_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Copy rows from old table "events" to new temporary table "new_events"
INSERT INTO `new_events` (`id`, `created_at`, `updated_at`, `deleted_at`, `title`, `description`, `start_date`, `end_date`, `image_uri`, `ticket_price`, `capacity`, `creator_id`, `discoverable`, `password_hash`, `loc_venue_name`, `loc_kind`, `loc_address`, `loc_instructions`, `loc_timezone`, `loc_lat`, `loc_lng`, `ics_sequence_number`) SELECT `id`, `created_at`, `updated_at`, `deleted_at`, `title`, `description`, `start_date`, `end_date`, `image_uri`, `ticket_price`, `capacity`, `creator_id`, `discoverable`, `password_hash`, `loc_venue_name`, `loc_kind`, `loc_address`, `loc_instructions`, `loc_timezone`, `loc_lat`, `loc_lng`, `ics_sequence_number` FROM `events`;
-- Drop "events" table after copying rows
DROP TABLE `events`;
-- Rename temporary table "new_events" to "events"
ALTER TABLE `new_events` RENAME TO `events`;
-- Create index "idx_events_deleted_at" to table: "events"
CREATE INDEX `idx_events_deleted_at` ON `events` (`deleted_at`);
-- Add column "pinned_at" to table: "posts"
ALTER TABLE `posts` ADD COLUMN `pinned_at` datetime NULL;
-- Create "new_poll_votes" table
CREATE TABLE `new_poll_votes` (
  `poll_result_id` integer NULL,
  `user_id` integer NULL,
  `created_at` datetime NULL,
  PRIMARY KEY (`poll_result_id`, `user_id`),
  CONSTRAINT `fk_poll_results_votes` FOREIGN KEY (`poll_result_id`) REFERENCES `poll_results` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_poll_votes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Copy rows from old table "poll_votes" to new temporary table "new_poll_votes"
INSERT INTO `new_poll_votes` (`poll_result_id`, `user_id`, `created_at`) SELECT `poll_result_id`, `user_id`, `created_at` FROM `poll_votes`;
-- Drop "poll_votes" table after copying rows
DROP TABLE `poll_votes`;
-- Rename temporary table "new_poll_votes" to "poll_votes"
ALTER TABLE `new_poll_votes` RENAME TO `poll_votes`;
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;
