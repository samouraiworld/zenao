-- Create "payment_accounts" table
CREATE TABLE `payment_accounts` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `created_at` datetime NULL,
  `updated_at` datetime NULL,
  `deleted_at` datetime NULL,
  `community_id` integer NOT NULL,
  `platform_type` text NOT NULL,
  `platform_account_id` text NOT NULL,
  `onboarding_state` text NOT NULL,
  `started_at` datetime NOT NULL,
  CONSTRAINT `fk_payment_accounts_community` FOREIGN KEY (`community_id`) REFERENCES `communities` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_payment_accounts_deleted_at" to table: "payment_accounts"
CREATE INDEX `idx_payment_accounts_deleted_at` ON `payment_accounts` (`deleted_at`);
-- Create index "idx_payment_accounts_community_platform" to table: "payment_accounts"
CREATE UNIQUE INDEX `idx_payment_accounts_community_platform` ON `payment_accounts` (`community_id`, `platform_type`);
