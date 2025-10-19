# Rust Backend Migration Notes

## Current Scope
- [x] Set up Axum + sqlx service skeleton (`backend-rs/`)
- [x] Port read-focused APIs (creators, campaigns, posts, articles, events, podcasts, digital products)

## Next Targets
- [x] Auth endpoints (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`)
- [x] JWT issuance + validation parity for email/password login
- [x] GitHub OAuth bridge
- [x] Stripe checkout/subscriptions (create checkout session)
- [ ] Content creation/write APIs (campaigns & donations ✅, posts/events pending)
- [ ] Media uploads, notifications, messaging, analytics, referrals, workers (uploads ✅)

## Work Log
- 2025-02-14: Bootstrapped Axum project with read endpoints mirroring the frontend needs.
- 2025-02-14: Documented build instructions, env vars, and parity status in `backend-rs/README.md`.
- 2025-02-14: Added `/api/auth/register`, `/api/auth/login`, `/api/auth/me` with bcrypt hashing and JWT issuance.
- 2025-02-14: Implemented GitHub OAuth (authorize + callback) with user creation/linking and frontend redirect parity.
- 2025-02-14: Ported `/api/stripe/create-checkout-session` with Stripe customer management and Checkout session creation.
- 2025-02-14: Added campaign write endpoints (`POST /api/campaigns`, `PATCH/DELETE /api/campaigns/:id`, `GET /api/campaigns/me`).
- 2025-02-14: Added donation endpoints (`POST /api/donations`, list/detail/top-supporters/recent`).
- 2025-02-14: Added media upload service and `/api/upload/...` routes (Cloudinary/local fallback).
