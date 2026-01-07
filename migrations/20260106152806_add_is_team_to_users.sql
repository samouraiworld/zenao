-- Add column "is_team" to table: "users"
ALTER TABLE `users` ADD COLUMN `is_team` numeric NULL DEFAULT false;
