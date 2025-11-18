-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;

-- 1. Create new table with created_at (based on 20250424210119_feeds.sql model with one field more)
-- I create a new table instead of alter to be able to put a default value non-constant (see limitation of ALTER in sqlite here: https://stackoverflow.com/questions/61966855/how-to-add-column-to-database-with-default)
CREATE TABLE `poll_votes_new` (
    `poll_result_id` integer NULL,
    `user_id` integer NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`poll_result_id`, `user_id`),
    CONSTRAINT `fk_poll_votes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT `fk_poll_votes_poll_result` FOREIGN KEY (`poll_result_id`) REFERENCES `poll_results` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- 2. Copy existing data, backfilling created_at
INSERT INTO
    `poll_votes_new` (
        `poll_result_id`,
        `user_id`,
        `created_at`
    )
SELECT `poll_result_id`, `user_id`, CURRENT_TIMESTAMP
FROM `poll_votes`;

-- 3. Drop old table
DROP TABLE `poll_votes`;

-- 4. Rename new table
ALTER TABLE `poll_votes_new` RENAME TO `poll_votes`;

-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;
