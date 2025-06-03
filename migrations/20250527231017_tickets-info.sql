-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Create "new_sold_tickets" table
CREATE TABLE `new_sold_tickets` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `event_id` integer NULL, `buyer_id` integer NULL, `user_id` integer NULL, `price` real NULL, `secret` text NOT NULL, `pubkey` text NOT NULL, CONSTRAINT `fk_sold_tickets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Copy rows from old table "sold_tickets" to new temporary table "new_sold_tickets"
INSERT INTO `new_sold_tickets` (`id`, `created_at`, `updated_at`, `deleted_at`, `event_id`, `buyer_id`, `user_id`, `price`, `secret`, `pubkey`) SELECT `id`, `created_at`, `updated_at`, `deleted_at`, `event_id`, `buyer_id`, `user_id`, `price`, `secret`, `pubkey` FROM `sold_tickets`;
-- Drop "sold_tickets" table after copying rows
DROP TABLE `sold_tickets`;
-- Rename temporary table "new_sold_tickets" to "sold_tickets"
ALTER TABLE `new_sold_tickets` RENAME TO `sold_tickets`;
-- Create index "idx_sold_tickets_pubkey" to table: "sold_tickets"
CREATE UNIQUE INDEX `idx_sold_tickets_pubkey` ON `sold_tickets` (`pubkey`);
-- Create index "idx_sold_tickets_secret" to table: "sold_tickets"
CREATE UNIQUE INDEX `idx_sold_tickets_secret` ON `sold_tickets` (`secret`);
-- Create index "idx_sold_tickets_event_id" to table: "sold_tickets"
CREATE INDEX `idx_sold_tickets_event_id` ON `sold_tickets` (`event_id`);
-- Create index "idx_sold_tickets_deleted_at" to table: "sold_tickets"
CREATE INDEX `idx_sold_tickets_deleted_at` ON `sold_tickets` (`deleted_at`);
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;
