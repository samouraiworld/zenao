-- Add verification fields to "payment_accounts"
ALTER TABLE `payment_accounts` ADD COLUMN `verification_state` text NOT NULL DEFAULT 'pending';
ALTER TABLE `payment_accounts` ADD COLUMN `last_verified_at` datetime NULL;
-- Create index "idx_payment_accounts_community_id" to table: "payment_accounts"
CREATE INDEX `idx_payment_accounts_community_id` ON `payment_accounts` (`community_id`);
