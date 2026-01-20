-- Add orders and ticket hold tables

-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;

-- Create "orders" table
CREATE TABLE `orders` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `created_at` integer NOT NULL,
  `confirmed_at` integer NULL,
  `event_id` integer NOT NULL,
  `buyer_id` integer NOT NULL,
  `currency_code` text NOT NULL,
  `amount_minor` integer NOT NULL,
  `status` text NOT NULL,
  `payment_account_id` integer NOT NULL,
  `payment_provider` text NULL,
  `payment_session_id` text NULL,
  `payment_intent_id` text NULL,
  `invoice_id` text NULL,
  `invoice_url` text NULL,
  CONSTRAINT `fk_orders_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_orders_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_orders_payment_account` FOREIGN KEY (`payment_account_id`) REFERENCES `payment_accounts` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_orders_event_id" to table: "orders"
CREATE INDEX `idx_orders_event_id` ON `orders` (`event_id`);
-- Create index "idx_orders_buyer_id" to table: "orders"
CREATE INDEX `idx_orders_buyer_id` ON `orders` (`buyer_id`);
-- Create index "idx_orders_payment_session_id" to table: "orders"
CREATE INDEX `idx_orders_payment_session_id` ON `orders` (`payment_session_id`);

-- Create "ticket_holds" table
CREATE TABLE `ticket_holds` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `created_at` integer NOT NULL,
  `event_id` integer NOT NULL,
  `price_group_id` integer NOT NULL,
  `order_id` integer NOT NULL,
  `quantity` integer NOT NULL,
  `expires_at` integer NOT NULL,
  CONSTRAINT `fk_ticket_holds_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_ticket_holds_price_group` FOREIGN KEY (`price_group_id`) REFERENCES `price_groups` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_ticket_holds_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_ticket_holds_event_id" to table: "ticket_holds"
CREATE INDEX `idx_ticket_holds_event_id` ON `ticket_holds` (`event_id`);
-- Create index "idx_ticket_holds_price_group_id" to table: "ticket_holds"
CREATE INDEX `idx_ticket_holds_price_group_id` ON `ticket_holds` (`price_group_id`);
-- Create index "idx_ticket_holds_order_id" to table: "ticket_holds"
CREATE INDEX `idx_ticket_holds_order_id` ON `ticket_holds` (`order_id`);
-- Create index "idx_ticket_holds_expires_at" to table: "ticket_holds"
CREATE INDEX `idx_ticket_holds_expires_at` ON `ticket_holds` (`expires_at`);

-- Create "order_attendees" table
CREATE TABLE `order_attendees` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `created_at` integer NOT NULL,
  `order_id` integer NOT NULL,
  `price_id` integer NOT NULL,
  `price_group_id` integer NOT NULL,
  `user_id` integer NOT NULL,
  `amount_minor` integer NOT NULL,
  `currency_code` text NOT NULL,
  CONSTRAINT `fk_order_attendees_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_order_attendees_price` FOREIGN KEY (`price_id`) REFERENCES `prices` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_order_attendees_price_group` FOREIGN KEY (`price_group_id`) REFERENCES `price_groups` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_order_attendees_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_order_attendees_order_id" to table: "order_attendees"
CREATE INDEX `idx_order_attendees_order_id` ON `order_attendees` (`order_id`);
-- Create index "idx_order_attendees_price_id" to table: "order_attendees"
CREATE INDEX `idx_order_attendees_price_id` ON `order_attendees` (`price_id`);
-- Create index "idx_order_attendees_price_group_id" to table: "order_attendees"
CREATE INDEX `idx_order_attendees_price_group_id` ON `order_attendees` (`price_group_id`);
-- Create index "idx_order_attendees_user_id" to table: "order_attendees"
CREATE INDEX `idx_order_attendees_user_id` ON `order_attendees` (`user_id`);

-- Create "new_sold_tickets" table
CREATE TABLE `new_sold_tickets` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `created_at` datetime NULL,
  `updated_at` datetime NULL,
  `deleted_at` datetime NULL,
  `event_id` integer NULL,
  `buyer_id` integer NULL,
  `user_id` integer NULL,
  `order_id` integer NULL,
  `price_id` integer NULL,
  `price_group_id` integer NULL,
  `order_attendee_id` integer NULL,
  `amount_minor` integer NULL,
  `currency_code` text NULL,
  `secret` text NOT NULL,
  `pubkey` text NOT NULL,
  CONSTRAINT `fk_sold_tickets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_sold_tickets_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_sold_tickets_price` FOREIGN KEY (`price_id`) REFERENCES `prices` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_sold_tickets_price_group` FOREIGN KEY (`price_group_id`) REFERENCES `price_groups` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `fk_sold_tickets_order_attendee` FOREIGN KEY (`order_attendee_id`) REFERENCES `order_attendees` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Copy rows from old table "sold_tickets" to new temporary table "new_sold_tickets"
INSERT INTO `new_sold_tickets` (
  `id`,
  `created_at`,
  `updated_at`,
  `deleted_at`,
  `event_id`,
  `buyer_id`,
  `user_id`,
  `order_id`,
  `price_id`,
  `price_group_id`,
  `order_attendee_id`,
  `amount_minor`,
  `currency_code`,
  `secret`,
  `pubkey`
) SELECT
  `id`,
  `created_at`,
  `updated_at`,
  `deleted_at`,
  `event_id`,
  `buyer_id`,
  `user_id`,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  `secret`,
  `pubkey`
FROM `sold_tickets`;
-- Drop "sold_tickets" table after copying rows
DROP TABLE `sold_tickets`;
-- Rename temporary table "new_sold_tickets" to "sold_tickets"
ALTER TABLE `new_sold_tickets` RENAME TO `sold_tickets`;
-- Create index "idx_sold_tickets_pubkey" to table: "sold_tickets"
CREATE UNIQUE INDEX `idx_sold_tickets_pubkey` ON `sold_tickets` (`pubkey`);
-- Create index "idx_sold_tickets_secret" to table: "sold_tickets"
CREATE UNIQUE INDEX `idx_sold_tickets_secret` ON `sold_tickets` (`secret`);
-- Create index "idx_sold_tickets_event_id" to table: "sold_tickets"
CREATE INDEX `idx_sold_tickets_event_id` ON `sold_tickets` (`event_id`);
-- Create index "idx_sold_tickets_order_id" to table: "sold_tickets"
CREATE INDEX `idx_sold_tickets_order_id` ON `sold_tickets` (`order_id`);
-- Create index "idx_sold_tickets_price_id" to table: "sold_tickets"
CREATE INDEX `idx_sold_tickets_price_id` ON `sold_tickets` (`price_id`);
-- Create index "idx_sold_tickets_price_group_id" to table: "sold_tickets"
CREATE INDEX `idx_sold_tickets_price_group_id` ON `sold_tickets` (`price_group_id`);
-- Create index "idx_sold_tickets_order_attendee_id" to table: "sold_tickets"
CREATE INDEX `idx_sold_tickets_order_attendee_id` ON `sold_tickets` (`order_attendee_id`);
-- Create index "idx_sold_tickets_deleted_at" to table: "sold_tickets"
CREATE INDEX `idx_sold_tickets_deleted_at` ON `sold_tickets` (`deleted_at`);

-- Enable foreign key constraints
PRAGMA foreign_keys = on;
