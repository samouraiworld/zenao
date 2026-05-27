-- Add ticket issuance status/error fields to orders

ALTER TABLE `orders` ADD COLUMN `ticket_issue_status` text NULL;
ALTER TABLE `orders` ADD COLUMN `ticket_issue_error` text NULL;
DROP INDEX IF EXISTS idx_sold_tickets_order_attendee_id;
CREATE UNIQUE INDEX idx_sold_tickets_order_attendee_id ON sold_tickets(order_attendee_id);
