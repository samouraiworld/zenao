-- One guard across all credentials/platforms/modes. A missing legacy mapping
-- cannot prove that an earlier external create did not succeed.
CREATE TABLE stripe_onboarding_operations (
  community_id integer NOT NULL,
  platform_type text NOT NULL,
  operation_id text NOT NULL DEFAULT '',
  platform_account_id text NOT NULL DEFAULT '',
  live_mode numeric NOT NULL DEFAULT false,
  fingerprint text NOT NULL DEFAULT '',
  idempotency_key text NOT NULL DEFAULT '',
  state text NOT NULL,
  first_attempt_at datetime NULL,
  fence integer NOT NULL DEFAULT 0,
  lease_until datetime NOT NULL,
  account_id text NOT NULL DEFAULT '',
  PRIMARY KEY (community_id, platform_type),
  CONSTRAINT fk_stripe_onboarding_operations_community FOREIGN KEY (community_id) REFERENCES communities(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);
INSERT INTO stripe_onboarding_operations (community_id, platform_type, state, lease_until, account_id)
SELECT c.id, 'stripe_connect', 'legacy_blocked', '1970-01-01 00:00:00',
  COALESCE((SELECT p.platform_account_id FROM payment_accounts p
    WHERE p.community_id=c.id AND p.platform_type='stripe_connect'), '')
FROM communities c;
ALTER TABLE payment_accounts ADD COLUMN verification_generation integer NOT NULL DEFAULT 0;
ALTER TABLE payment_accounts ADD COLUMN verification_lease_until datetime NULL;
