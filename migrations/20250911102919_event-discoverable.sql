-- Add column "discoverable" to table: "events"
ALTER TABLE `events` ADD COLUMN `discoverable` numeric NOT NULL DEFAULT 1 ;
