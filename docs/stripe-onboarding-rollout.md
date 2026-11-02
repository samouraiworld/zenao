# Durable Stripe community onboarding

This change is a source fix, not authorization to deploy or migrate production.
It protects community ticket-payment onboarding through Stripe Connect. It does
not migrate subscriptions or ticket settlement to RevenueCat.

## Behavior

A durable operation is globally unique for a community and provider, across all
Stripe platform accounts and live/test modes. The first attempt fixes the
credential owner, mode, request fingerprint, operation ID, and idempotency key.
An unknown outcome may reuse that key for less than 23 hours from the immutable
first-attempt time. After that deadline, or after a definitive configuration
error, onboarding requires reconciliation. It never silently starts a new
operation or generates a replacement key.

The atomic claim rechecks the requesting user's administrator role in the same
database transaction that reserves the operation. This successful claim is the
authorization point; no database transaction is held across provider calls.

The account mapping is saved atomically before requesting an onboarding link.
A link failure therefore resumes the saved account. A 30-second claim and
monotonic fence prevent a late worker from attaching an account or returning its
link. Verification writes use a separate request generation, the observed
operation fence, and a lease. A losing writer rereads the stored state. A fresh
Stripe restriction can downgrade a previously verified account.

Identity inspection, account creation/retrieval, and account-link creation use
the same credential-bound client. These operations do not use `stripe.Key`.

## Required rollout gates

1. Attest the actual running backend revision and deployment target through a
   trusted infrastructure path. A frontend deploy or historical workflow does
   not establish the running backend revision. Resolve any host identity or
   server maintenance discrepancy before remote access or deployment.
2. Confirm the intended Stripe platform account and mode using the deployed
   credential without printing the credential. Reconcile that identity with
   existing connected accounts and the owner's account decision.
3. Back up the database and rehearse this additive migration on an isolated
   copy. Check row counts, existing payment-account primary keys and Stripe IDs,
   and their order/price references before and after it.
4. Stop or disable every old onboarding creator before migration and keep it
   stopped until all backend instances run the new implementation. Old code
   bypasses the guard; a mixed rollout is unsafe. Preserve all historical
   successful, failed, and unknown account-creation evidence for reconciliation.
5. Have an authorized owner review the legacy report below. Every preexisting
   community is seeded as `legacy_blocked`. An empty mapping can conceal an old
   external success and cannot safely create an account automatically. A known
   mapping can only be adopted after retrieving that exact account with the
   selected platform/mode credential. Soft-deleted or conflicting mappings are
   blocked. This first change provides no operator unlock or replacement path.
6. Review the resulting legacy disposition and user impact before enabling
   onboarding. New communities created after cutover may automatically reserve
   their first operation. Perform a separately approved test-mode onboarding,
   link-failure/resume, and restriction-refresh check before production enablement.

The change is not rollout-ready while runtime identity or legacy disposition
is unresolved. No production database report or write is part of the source
test suite.

## Read-only legacy report

Run through an approved database connection before migration, against the same
snapshot used for the rehearsal. This aggregate reports the minimum number of
legacy communities requiring an explicit disposition. It deliberately includes
soft-deleted rows; do not interpret a missing active mapping as proof that no
Stripe account exists.

```sql
SELECT
  count(*) AS legacy_communities,
  sum(CASE WHEN NOT EXISTS (
    SELECT 1 FROM payment_accounts p
    WHERE p.community_id=c.id AND p.platform_type='stripe_connect'
      AND p.platform_account_id<>''
  ) THEN 1 ELSE 0 END) AS legacy_unmapped_or_empty,
  sum(CASE WHEN EXISTS (
    SELECT 1 FROM payment_accounts p
    WHERE p.community_id=c.id AND p.platform_type='stripe_connect'
      AND p.deleted_at IS NOT NULL
  ) THEN 1 ELSE 0 END) AS legacy_with_deleted_mapping
FROM communities c;
```

After the isolated rehearsal, compare those counts with:

```sql
SELECT state, count(*) AS operations,
  sum(CASE WHEN account_id='' THEN 1 ELSE 0 END) AS unmapped_or_empty
FROM stripe_onboarding_operations GROUP BY state;
```

Do not export customer records or credentials into review artifacts. The
migration test uses a two-community fixture: both receive a legacy guard, one
is unmapped, and the existing payment-account row ID and Stripe account ID are
unchanged.

## Failure and rollback

An unknown create outcome, exhausted replay window, expired claim, or conflicting
mapping fails closed. Preserve the operation and investigate using its operation
ID and provider logs; do not delete the row, reset its first-attempt timestamp,
or replay a key outside the bounded window. No request handler authorizes account
replacement.

The schema changes are additive. Retain the operation history and payment rows.
If reverting to an old binary, keep onboarding disabled first: old binaries do
not honor these guards. Do not drop the ledger as a rollback shortcut.
