-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Drop "poll_options" table
DROP TABLE `poll_options`;
-- Create "new_poll_votes" table
CREATE TABLE `new_poll_votes` (`poll_result_id` integer NULL, `user_id` integer NULL, PRIMARY KEY (`poll_result_id`, `user_id`), CONSTRAINT `fk_poll_votes_poll_result` FOREIGN KEY (`poll_result_id`) REFERENCES `poll_results` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION, CONSTRAINT `fk_poll_votes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Copy rows from old table "poll_votes" to new temporary table "new_poll_votes"
INSERT INTO `new_poll_votes` (`user_id`) SELECT `user_id` FROM `poll_votes`;
-- Drop "poll_votes" table after copying rows
DROP TABLE `poll_votes`;
-- Rename temporary table "new_poll_votes" to "poll_votes"
ALTER TABLE `new_poll_votes` RENAME TO `poll_votes`;
-- Create "poll_results" table
CREATE TABLE `poll_results` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `option` text NULL, `count` integer NULL, `poll_id` integer NULL, CONSTRAINT `fk_polls_results` FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_poll_results_deleted_at" to table: "poll_results"
CREATE INDEX `idx_poll_results_deleted_at` ON `poll_results` (`deleted_at`);
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;
