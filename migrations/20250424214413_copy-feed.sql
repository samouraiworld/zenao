-- Copy rows from old table "sold_tickets" to new temporary table "new_sold_tickets"
INSERT INTO `feeds` (`created_at`, `updated_at`, `event_id`, `slug`) SELECT `created_at`, `updated_at`, `id`, 'main' FROM `events`;
