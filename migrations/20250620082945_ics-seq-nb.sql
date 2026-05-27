-- Add column "ics_sequence_number" to table: "events"
ALTER TABLE `events` ADD COLUMN `ics_sequence_number` integer NOT NULL DEFAULT 0;
