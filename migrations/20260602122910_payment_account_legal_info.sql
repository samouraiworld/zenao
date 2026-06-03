-- Add merchant legal/business profile columns to "payment_accounts", mirrored
-- from the connected Stripe account (merchant of record in direct charges).
ALTER TABLE `payment_accounts` ADD COLUMN `business_name` text NOT NULL DEFAULT '';
ALTER TABLE `payment_accounts` ADD COLUMN `legal_name` text NOT NULL DEFAULT '';
ALTER TABLE `payment_accounts` ADD COLUMN `support_email` text NOT NULL DEFAULT '';
ALTER TABLE `payment_accounts` ADD COLUMN `support_phone` text NOT NULL DEFAULT '';
ALTER TABLE `payment_accounts` ADD COLUMN `support_url` text NOT NULL DEFAULT '';
ALTER TABLE `payment_accounts` ADD COLUMN `business_address` text NOT NULL DEFAULT '';
ALTER TABLE `payment_accounts` ADD COLUMN `country` text NOT NULL DEFAULT '';
