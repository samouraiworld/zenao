-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Create "new_poll_results" table
CREATE TABLE `new_poll_results` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `option` text NULL, `poll_id` integer NULL, CONSTRAINT `fk_polls_results` FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Copy rows from old table "poll_results" to new temporary table "new_poll_results"
INSERT INTO `new_poll_results` (`id`, `created_at`, `updated_at`, `deleted_at`, `option`, `poll_id`) SELECT `id`, `created_at`, `updated_at`, `deleted_at`, `option`, `poll_id` FROM `poll_results`;
-- Drop "poll_results" table after copying rows
DROP TABLE `poll_results`;
-- Rename temporary table "new_poll_results" to "poll_results"
ALTER TABLE `new_poll_results` RENAME TO `poll_results`;
-- Create index "idx_poll_results_deleted_at" to table: "poll_results"
CREATE INDEX `idx_poll_results_deleted_at` ON `poll_results` (`deleted_at`);
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;
