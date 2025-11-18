
UPDATE `users`
SET
    `realm_id` = 'gno.land/r/zenao/users/u' || id
WHERE
    `realm_id` IS NULL
    OR `realm_id` = '';

UPDATE `sold_tickets`
SET
    `event_realm_id` = 'gno.land/r/zenao/events/e' || `event_id`
WHERE
    `event_realm_id` = '';

UPDATE `sold_tickets`
SET
    `user_realm_id` = 'gno.land/r/zenao/users/u' || `user_id`
WHERE
    `user_realm_id` = '';

UPDATE `sold_tickets`
SET
    `buyer_realm_id` = 'gno.land/r/zenao/users/u' || `buyer_id`
WHERE
    `buyer_realm_id` = '';
