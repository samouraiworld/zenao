-- Add column "password_hash" to table: "events"
ALTER TABLE `events` ADD COLUMN `password_hash` text NULL;
