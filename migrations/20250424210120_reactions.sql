-- Create "reactions" table
CREATE TABLE `reactions` (`id` integer NULL PRIMARY KEY AUTOINCREMENT, `created_at` datetime NULL, `updated_at` datetime NULL, `deleted_at` datetime NULL, `icon` text NULL, `post_id` integer NULL, `user_id` integer NULL, CONSTRAINT `fk_posts_reactions` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION, CONSTRAINT `fk_reactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "idx_reactions_deleted_at" to table: "reactions"
CREATE INDEX `idx_reactions_deleted_at` ON `reactions` (`deleted_at`);
