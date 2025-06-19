-- Add column "sequence_number" to table: "events"
ALTER TABLE `events` ADD COLUMN `sequence_number` integer NOT NULL DEFAULT 0;
