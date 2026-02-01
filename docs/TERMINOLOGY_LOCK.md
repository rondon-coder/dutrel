# Dutrel — Terminology Lock (Phase 2A) — FINAL

This document is the single source of truth for product language. No synonyms.

## Core Containers

### Household
A group of members sharing one or more buckets.
- Has roles, succession order, and shared visibility.
- Can contain Group Buckets and Individual Buckets.

### Member
A person with a login inside a household.
- May contribute funds.
- May upload receipts (context-dependent).
- Has no authority unless assigned a role.

## Roles (Authority)

### Payer
Primary coordinator for one or more Group Buckets.
- Can verify, dispute, reopen obligations.
- Can set autopay activation dates.
- Can pause buckets and approve buffer use.

### Secondary Payer
Backup coordinator.
- Same permissions as Payer.
- Automatically elevated if Payer is removed or inactive.

## Buckets (Money Organization)

### Bucket
A logical container representing one funding target.
- Has members, cadence, amount rules, and funding status.
- May be Group or Individual.
- Name is free-form (bundling can be implicit via name).

### Group Bucket
A bucket shared by multiple household members.
- Example: Electric, Water, Rent + HOA.
- Funding coordinated across members.

### Individual Bucket
A bucket owned by one member.
- Same safeguards as Group Buckets.
- Used for personal obligations (e.g., car, childcare).

## Funding & Timing

### Obligation
A single bill instance for a bucket in a billing cycle.
- Opens when bill is expected/ready.
- Closes when satisfied (receipt or verified autopay).
- Cannot remain open indefinitely.

### Warm-Up Period
The first 2 completed billing cycles after autopay is enabled.
- Manual payment + receipt required.
- Starts at autopay_enabled_at.

### Autopay Activation Date (autopay_enabled_at)
The date autopay was enabled on the external provider site.
- Determines Warm-Up timing.
- Editable only by Payer / Secondary.

## Proof & Resolution

### Receipt
A user-submitted artifact asserting an obligation was paid externally.
- Uploadable anytime.
- Does not move money.
- Requires payer verification unless auto-closed by timeout.

Receipt States:
- Member Submitted
- Pending Payer Review
- Verified
- Disputed
- Auto-Closed (Timeout)
- Escalated

### Dispute
A payer action that reopens an obligation.
- Structured reasons only.
- Pauses the bucket until resolved.

## Buffers & Exceptions

### Buffer
Extra funds collected to absorb expected variance.
- Lives at the bucket level.
- Used automatically for small fluctuations.
- Not auto-used for reversals.

### Recovery Mode
Temporary state entered after a failure or reversal.
- Pauses automatic actions.
- Requires explicit user resolution.
- No automatic retries.

## Notifications

### Bill Availability Reminder
Reminder sent 7–10 days before due date to prompt manual payment during Warm-Up or exceptions.

### Escalation
Timed reminders when actions are pending.
- Never judgmental.
- Always neutral.

## Explicit Non-Concepts
These do not exist in Dutrel:
- Anchor
- Auto-retry
- Guaranteed payment
- Utility verification
- Forced funding
- System judgment
