-- Create "price_groups" table
CREATE TABLE `price_groups` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `created_at` datetime NULL,
  `updated_at` datetime NULL,
  `deleted_at` datetime NULL,
  `event_id` integer NOT NULL,
  `capacity` integer NULL,
  CONSTRAINT `fk_price_groups_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_price_groups_deleted_at" to table: "price_groups"
CREATE INDEX `idx_price_groups_deleted_at` ON `price_groups` (`deleted_at`);
-- Create index "idx_price_groups_event_id" to table: "price_groups"
CREATE INDEX `idx_price_groups_event_id` ON `price_groups` (`event_id`);

-- Create "prices" table
CREATE TABLE `prices` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `created_at` datetime NULL,
  `updated_at` datetime NULL,
  `deleted_at` datetime NULL,
  `price_group_id` integer NOT NULL,
  `amount_minor` integer NOT NULL,
  `currency_code` text NULL,
  `payment_account_id` integer NULL,
  CONSTRAINT `fk_prices_price_group` FOREIGN KEY (`price_group_id`) REFERENCES `price_groups` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_prices_payment_account` FOREIGN KEY (`payment_account_id`) REFERENCES `payment_accounts` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_prices_deleted_at" to table: "prices"
CREATE INDEX `idx_prices_deleted_at` ON `prices` (`deleted_at`);
-- Create index "idx_prices_payment_account_id" to table: "prices"
CREATE INDEX `idx_prices_payment_account_id` ON `prices` (`payment_account_id`);
-- Create index "idx_prices_price_group_id" to table: "prices"
CREATE INDEX `idx_prices_price_group_id` ON `prices` (`price_group_id`);
