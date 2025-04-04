-- Create "feeds" table
CREATE TABLE `feeds` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `slug` text NULL, `event_id` integer NULL, CONSTRAINT `fk_feeds_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_feeds_deleted_at" to table: "feeds"
CREATE INDEX `idx_feeds_deleted_at` ON `feeds` (`deleted_at`);
-- Create "posts" table
CREATE TABLE `posts` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `kind` text NULL, `parent_uri` text NULL, `latitude` real NULL, `longitude` real NULL, `tags` text NULL, `content` text NULL, `title` text NULL, `preview_text` text NULL, `preview_image_uri` text NULL, `uri` text NULL, `description` text NULL, `image_uri` text NULL, `audio_uri` text NULL, `video_uri` text NULL, `thumbnail_image_uri` text NULL, `user_id` integer NULL, `feed_id` integer NULL, CONSTRAINT `fk_posts_feed` FOREIGN KEY (`feed_id`) REFERENCES `feeds` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION, CONSTRAINT `fk_posts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_posts_deleted_at" to table: "posts"
CREATE INDEX `idx_posts_deleted_at` ON `posts` (`deleted_at`);
-- Create "polls" table
CREATE TABLE `polls` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `question` text NULL, `kind` integer NULL, `duration` integer NULL, `post_id` integer NULL, CONSTRAINT `fk_polls_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_polls_deleted_at" to table: "polls"
CREATE INDEX `idx_polls_deleted_at` ON `polls` (`deleted_at`);
-- Create "poll_options" table
CREATE TABLE `poll_options` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `option` text NULL, `count` integer NULL, `poll_id` integer NULL, CONSTRAINT `fk_polls_options` FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_poll_options_deleted_at" to table: "poll_options"
CREATE INDEX `idx_poll_options_deleted_at` ON `poll_options` (`deleted_at`);
-- Create "poll_votes" table
CREATE TABLE `poll_votes` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `poll_id` integer NULL, `poll_option_id` integer NULL, `user_id` integer NULL, CONSTRAINT `fk_poll_votes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION, CONSTRAINT `fk_poll_votes_poll_option` FOREIGN KEY (`poll_option_id`) REFERENCES `poll_options` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION, CONSTRAINT `fk_poll_votes_poll` FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_poll_votes_deleted_at" to table: "poll_votes"
CREATE INDEX `idx_poll_votes_deleted_at` ON `poll_votes` (`deleted_at`);
