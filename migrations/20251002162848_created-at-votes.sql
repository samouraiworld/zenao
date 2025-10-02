-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;

-- Add column "created_at" to table: "poll_votes"
ALTER TABLE `poll_votes`
ADD COLUMN `created_at` datetime NOT NULL DEFAULT(CURRENT_TIMESTAMP);

-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;