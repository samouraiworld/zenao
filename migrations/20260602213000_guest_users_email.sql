-- Add column "email" to table: "users" (set for guest users without an auth account)
ALTER TABLE `users` ADD COLUMN `email` text NULL;
-- Create index "idx_users_email" to table: "users"
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);
