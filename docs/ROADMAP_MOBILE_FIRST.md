# Dutrel — Mobile-first + Marketing Roadmap (v2 Locked)

------------------------------------------------------------
STACK
------------------------------------------------------------

Backend/API: Next.js (App Router) on Vercel
DB: Neon Postgres + Prisma
Auth: Email login (mobile-safe sessions)
Blob: Vercel Blob
Email: Resend
Mobile: React Native (Expo)
Push: Expo Push (Phase 3+)
Marketing Site: Informational only

------------------------------------------------------------
PHASE 0 — Infrastructure
------------------------------------------------------------

- Vercel deployment
- Production Neon database
- Prisma migrations
- /api/health
- Environment guardrails
- Domain + Privacy + Terms draft

------------------------------------------------------------
PHASE 1 — Core Coordination Engine
------------------------------------------------------------

- Households
- Roles + succession
- Buckets (Group + Individual)
- Obligations lifecycle
- Receipts + escalation
- Autopay warm-up logic
- Recovery Mode
- Attachments system
- Audit logging

NON-CUSTODIAL.

------------------------------------------------------------
PHASE 2A — Bill Account Monitoring (Plaid Read-Only)
------------------------------------------------------------

- Connect Bill Account (recommended separate account)
- Balance snapshot
- Upcoming obligation total
- Sufficiency indicator:
    - Sufficient
    - At Risk
    - Insufficient
- Cleared payment detection
- Missed payment detection
- No money movement
- No budgeting analytics
- Disconnect anytime

Still NON-CUSTODIAL.

------------------------------------------------------------
PHASE 2B — Notification + Hardening
------------------------------------------------------------

- T-10 to T-7 reminders
- T-3 danger alerts
- Escalation timers
- Invite flow
- Member removal
- Audit visibility

------------------------------------------------------------
PHASE 3 — App Store Launch Package
------------------------------------------------------------

- Privacy Policy
- Terms
- In-app account deletion
- Data retention controls
- Store assets
- Push notifications

------------------------------------------------------------
PHASE 4 — Partner Integration Layer (Optional Future)
------------------------------------------------------------

- Wallet issuance
- ACH rails
- Webhooks
- KYC
- Reconciliation

This phase changes custody model and requires compliance expansion.
