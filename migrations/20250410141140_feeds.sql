-- Create "feeds" table
CREATE TABLE `feeds` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `slug` text NULL, `event_id` integer NULL, CONSTRAINT `fk_feeds_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_feeds_deleted_at" to table: "feeds"
CREATE INDEX `idx_feeds_deleted_at` ON `feeds` (`deleted_at`);
-- Create "posts" table
CREATE TABLE `posts` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `kind` text NULL, `parent_uri` text NULL, `latitude` real NULL, `longitude` real NULL, `content` text NULL, `title` text NULL, `preview_text` text NULL, `preview_image_uri` text NULL, `uri` text NULL, `description` text NULL, `image_uri` text NULL, `audio_uri` text NULL, `video_uri` text NULL, `thumbnail_image_uri` text NULL, `user_id` integer NULL, `feed_id` integer NULL, CONSTRAINT `fk_posts_feed` FOREIGN KEY (`feed_id`) REFERENCES `feeds` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION, CONSTRAINT `fk_posts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_posts_deleted_at" to table: "posts"
CREATE INDEX `idx_posts_deleted_at` ON `posts` (`deleted_at`);
-- Create "polls" table
CREATE TABLE `polls` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `question` text NULL, `kind` integer NULL, `duration` integer NULL, `post_id` integer NULL, CONSTRAINT `fk_polls_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_polls_deleted_at" to table: "polls"
CREATE INDEX `idx_polls_deleted_at` ON `polls` (`deleted_at`);
-- Create "poll_results" table
CREATE TABLE `poll_results` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `option` text NULL, `poll_id` integer NULL, CONSTRAINT `fk_polls_results` FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_poll_results_deleted_at" to table: "poll_results"
CREATE INDEX `idx_poll_results_deleted_at` ON `poll_results` (`deleted_at`);
-- Create "poll_votes" table
CREATE TABLE `poll_votes` (`poll_result_id` integer NULL, `user_id` integer NULL, PRIMARY KEY (`poll_result_id`, `user_id`), CONSTRAINT `fk_poll_votes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION, CONSTRAINT `fk_poll_votes_poll_result` FOREIGN KEY (`poll_result_id`) REFERENCES `poll_results` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create "tags" table
CREATE TABLE `tags` (`post_id` integer NULL, `name` text NULL, PRIMARY KEY (`post_id`, `name`), CONSTRAINT `fk_posts_tags` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
