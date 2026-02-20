Dutrel — Terminology Lock — v3 (LOCKED)

This document is the single source of truth for product language.
No synonyms. No drift.
All schema and API design must conform to this terminology.

CORE PRODUCT IDENTITY

Dutrel is a shared obligation coordination and verification system.

It is NOT:

A bank

A wallet

A neobank

A utility replacement

A guaranteed payment system

Phase 1–3 are strictly NON-CUSTODIAL.

CORE CONTAINERS
Household

A group of members sharing one or more buckets.

Has roles and succession order.

Can contain Group Buckets and Individual Buckets.

May represent roommates or a property.

Member

A person with a login inside a household.

May contribute funds externally.

May upload receipts.

Has no authority unless assigned a role.

ROLES (Authority)
Payer

Primary coordinator for Group Buckets.

Can verify, dispute, reopen obligations.

Can set autopay activation dates.

Can pause buckets and approve buffer use.

Secondary Payer

Backup coordinator.

Same permissions as Payer.

Automatically elevated if Payer is removed or inactive.

Roles are household-scoped.

Individual Bucket authority comes from ownership — not from role assignment.

BUCKETS (Money Organization)
Bucket

A logical container representing one funding target.

Has members, cadence, amount rules, and funding status.

May be Group or Individual.

Group Bucket

A bucket shared by multiple household members.
Examples: Electric, Water, Rent + HOA.

Individual Bucket

A bucket owned by one member.
Used for personal obligations (e.g., car, childcare).

FUNDING & TIMING
Obligation

A single bill instance for a bucket in a billing cycle.

Opens when bill is expected or ready.

Closes when satisfied (receipt or verified autopay detection).

Cannot remain open indefinitely.

Warm-Up Period

The first 2 completed billing cycles after autopay is enabled.

Manual payment + receipt required.

Starts at autopay_enabled_at.

Autopay Activation Date (autopay_enabled_at)

The date autopay was enabled on the external provider site.

Determines Warm-Up timing.

Editable only by Payer / Secondary.

Autopay always occurs externally.

BILL ACCOUNT
Bill Account

A user-connected external checking or savings account used solely
to monitor bill sufficiency and detect payment events.

Dutrel does not store funds.

Dutrel does not move funds.

Dutrel does not initiate transfers in Phase 1–3.

Recommended to be a dedicated account without a debit card.

Used only for balance monitoring and payment detection.

Bill Accounts are observation-only in Phase 2.

EXTERNAL PARTNERS
PaymentPartner (Schema Enum)

PaymentPartner represents any external provider integrated with Dutrel.

It includes:

Monitoring providers (e.g., PLAID)

Future money-movement providers (e.g., UNIT, DWOLLA, STRIPE_TREASURY)

Important:

Presence of a PaymentPartner value does NOT imply custody.

Presence of PLAID does NOT imply money movement.

Custody remains disabled unless an explicit Partner Phase is implemented.

PLAID = read-only monitoring provider.
UNIT/DWOLLA/STRIPE_TREASURY = future custody partners (not active in Phase 1–3).

PROOF & RESOLUTION
Receipt

A user-submitted artifact asserting an obligation was paid externally.

Uploadable anytime.

Does not move money.

Requires payer verification unless auto-closed by timeout.

Receipt States:

MEMBER_SUBMITTED

PENDING_PAYER_REVIEW

VERIFIED

DISPUTED

AUTO_CLOSED_TIMEOUT

ESCALATED

Dispute

A payer action that reopens an obligation.

Requires structured reason.

Pauses the bucket if necessary.

Logged in audit trail.

BUFFERS & EXCEPTIONS
Buffer

Extra funds collected to absorb expected variance.

Lives at the bucket level.

Used for small fluctuations.

Not auto-used for reversals.

Recovery Mode

Temporary state entered after a failure or reversal.

Pauses automatic actions.

Requires manual resolution.

No automatic retries.

NOTIFICATIONS
Bill Availability Reminder

Reminder sent 7–10 days before due date.

Escalation

Timed reminders when actions are pending.

+24h reminder

+48h warning

+72h auto-close (receipt only)

Never judgmental.

EXPLICIT NON-CONCEPTS

These do not exist in Dutrel:

Anchor

Auto-retry

Guaranteed payment

Wallet

Utility verification scraping

Forced funding

System judgment

Lifestyle spending analytics

LOCK RULE

If a new feature cannot be described using the terminology above,
it must not be implemented without updating this document first.
------------------------------------------------------------
RESPONSIBILITY
------------------------------------------------------------

Responsible Member
HouseholdMember designated as legally or functionally responsible
for a specific bucket’s obligation.

- Can manage that bucket.
- Used for credit reporting logic.
- Does not override Payer authority.

### Bucket Responsibility
A bucket can optionally designate one or more **responsible household members**.
- The first responsible member is **PRIMARY**; additional are **SECONDARY**.
- Responsible members can manage the bucket (even if they are not the household payer).
- PAYER / SECONDARY_PAYER always retain manage access across all buckets.