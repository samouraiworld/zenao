-- Add column "user_id" to table: "sold_tickets"
ALTER TABLE `sold_tickets` ADD COLUMN `user_id` integer NULL;
-- Create "checkins" table
CREATE TABLE `checkins` (`created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `sold_ticket_id` integer NOT NULL PRIMARY KEY AUTOINCREMENT, `gatekeeper_id` integer NULL, `signature` text NULL, CONSTRAINT `fk_sold_tickets_checkin` FOREIGN KEY (`sold_ticket_id`) REFERENCES `sold_tickets` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_checkins_deleted_at" to table: "checkins"
CREATE INDEX `idx_checkins_deleted_at` ON `checkins` (`deleted_at`);
