# Dutrel — Mobile-first + Marketing Site Roadmap (Locked)

## Locked stack
- Backend/API: Next.js (App Router) on Vercel
- DB: Neon Postgres + Prisma
- Auth: email login with mobile-safe sessions
- Receipt uploads: Vercel Blob (Phase 1)
- Email notifications: Resend (Phase 1)
- Mobile apps: React Native (Expo)
- Push notifications: Expo Push → APNs/FCM (Phase 3+)
- Website: Marketing-only (no login/dashboard) initially

## Phases

### Phase 0 — Infra Bootstrap
- Next.js API on Vercel
- Neon + Prisma migrations
- Auth baseline
- Blob wiring
- /api/health endpoint
- Env var guardrails

### Phase 1 — Core Mobile MVP (Demo A built like Demo B)
Implements the full failure & recovery model without payment partners:
- Households, members, roles, succession
- Buckets (Group/Individual), cadence, variability, buffers
- Obligations (open/close/dispute/reopen/reversed)
- Receipts (member submit → payer verify; escalation + auto-close)
- Autopay warm-up + autopay_enabled_at
- Recovery Mode (no retries)
- Payer controls (pause, acknowledge gap, edit amount, external paid)

### Phase 2 — Notifications + Onboarding Hardening
- Bill availability reminders (T-10 to T-7)
- Underfunded alerts + T-3 danger window messaging
- Receipt escalation timers
- Invites + join flow
- Member removal (minimal)
- Support intake surface + audit visibility

### Phase 3 — App Store / Play Store Launch Package
- Privacy Policy + Terms
- Account deletion (in-app)
- Receipt retention/deletion behavior
- Store listing assets
- Push notifications

### Phase 4 — Partner Integration Layer
- Wallet + ACH + webhooks + KYC as required
- Reconciliation and reversal handling
