# Dutrel — FAQ Foundation (from pressure tests)

This is a future FAQ skeleton based on locked behavior. Copy is intentionally neutral.

## General
### What does Dutrel do?
Dutrel helps households and individuals coordinate recurring payments by showing funding gaps early, tracking obligations, and closing the loop with receipts or confirmations.

### Does Dutrel force anyone to pay?
No. Dutrel does not force funding. It surfaces gaps early and provides clear resolution paths.

## Utilities & External Accounts
### Should everyone have access to the utility provider account?
Yes—when possible. Households should ensure all members have access to the utility provider’s account for unforeseen issues (e.g., account holder leaves, autopay changes, provider account updates).

### Why doesn’t Dutrel verify payments directly with the utility?
Phase 1 does not connect to utility systems. Dutrel relies on receipts and confirmations to keep the household coordinated without scraping or impersonating utilities.

## Autopay
### When should we enable autopay?
Enable autopay on the utility provider site. Record the autopay activation date in Dutrel.

### What is the Warm-Up Period?
The first 2 completed billing cycles after autopay is enabled. During Warm-Up, manual payment + receipt is required to avoid early setup delays or first-time autopay timing issues.

## Receipts
### Can anyone upload a receipt?
Yes. Any member may upload a receipt anytime. Member receipts require payer review to close an obligation.

### What if the payer ignores a receipt?
Receipts escalate (24/48/72 hours) and may auto-close by timeout to prevent the system from stalling. Coordinators can reopen with a reason.

### What if a receipt is nonsense?
Payer/Secondary can dispute/reopen with a structured reason. The action is logged and visible to the household.

## Failures, NSF, Reversals
### What happens if a scheduled debit fails?
Dutrel notifies the household and the impacted member. Manual funding or external payment can be used, with receipt submission to close the loop.

### What if the utility reverses a payment?
Dutrel enters Recovery Mode for that bucket: it pauses automatic actions and requires manual resolution. Dutrel does not automatically retry because utilities typically do not retry multiple times.

## Roles
### What is a Payer?
The household coordinator for group buckets. The payer is not the only person who can pay a bill, but is responsible for verifying/closing loops and resolving disputes.

### What if the payer leaves unexpectedly?
Secondary Payer is promoted automatically. Obligations remain intact. Households should ensure shared access to external provider accounts when possible.
