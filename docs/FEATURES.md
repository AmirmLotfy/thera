# Thera — Feature overview

Thera is a **bilingual (English / Arabic)** web platform for mental wellness: self-service tools, human therapists, booking, payments, and video sessions. This page maps capabilities to main **routes** and **API modules** (paths under `src/routes/`).

---

## For learners and families (patients)


| Capability                                                            | Where it lives                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| Marketing home, trust content, AI teaser                              | `/` — `[index.tsx](../src/routes/index.tsx)`                 |
| How it works, FAQ, About, Contact                                     | `/how-it-works`, `/faq`, `/about`, `/contact`                |
| Blog                                                                  | `/blog`, `/blog/$slug`                                       |
| Legal                                                                 | `/privacy`, `/terms`                                         |
| Sign up / sign in (email, Google, password reset, email verification) | `/auth/`*, `/login`, `/signup`                               |
| Role selection and onboarding                                         | `/auth/role`, `/onboarding/$role`                            |
| Browse therapists, profile detail                                     | `/therapists`, `/therapists/$id`                             |
| Book a session (slot selection → booking)                             | `/book/$therapistId`                                         |
| Checkout: card (Polar) or Instapay instructions + proof               | `/checkout/$bookingId`, success/cancel routes                |
| Dashboard: mood, vibe, achievements, notifications, profile, security | `/dashboard/$role/*` for roles `adult`, `parent`, `teen`     |
| Parent: linked children                                               | `/dashboard/parent/children`                                 |
| Upcoming sessions, join video room                                    | `/dashboard/$role/sessions`, `/dashboard/$role/sessions/$id` |
| Bookings list                                                         | `/dashboard/$role/bookings`                                  |
| Session reports (read)                                                | `/dashboard/$role/reports`                                   |
| AI companion chat (streaming)                                         | `/dashboard/$role/chat`                                      |
| Pending payments / proofs (where applicable)                          | `/dashboard/$role/pending`                                   |


**Server APIs used by patients**

- `POST /api/booking/lock` — claim slot, create `pending_payment` booking  
- `POST /api/booking/cancel` — cancel with rules  
- `POST /api/polar/checkout` — start card checkout (or demo path if Polar not configured)  
- `POST /api/instapay/proof` — submit transfer proof for manual verification  
- `GET /api/sessions/$id/token` — Daily.co meeting token (demo when no Daily key)  
- `POST /api/sessions/$id/end` — end session (role-guarded as implemented)  
- `POST /api/ai/chat`, `POST /api/ai/intake`, `POST /api/ai/crisis-check`, `POST /api/ai/summarize`, `POST /api/ai/transcribe` — AI features on server

---

## For therapists


| Capability                                                            | Where it lives                                      |
| --------------------------------------------------------------------- | --------------------------------------------------- |
| Dashboard shell for therapist role                                    | `/dashboard/therapist`                              |
| Availability and slots                                                | `/dashboard/therapist/availability`                 |
| Instapay link / recipient display settings (no Instapay API—URL only) | `/dashboard/therapist/instapay`                     |
| Session management, live room                                         | `/dashboard/therapist/sessions`, `.../sessions/$id` |
| Bookings                                                              | `/dashboard/therapist/bookings`                     |
| Approvals / applications (workflow)                                   | `/dashboard/therapist/approvals`                    |
| Post-session report creation                                          | Therapist flows + `POST /api/reports/create`        |
| Profile                                                               | `/dashboard/therapist/profile`                      |
| Notifications, mood/vibe/achievements as enabled for role             | under `/dashboard/therapist/`*                      |


---

## For administrators


| Capability                           | Where it lives                                          |
| ------------------------------------ | ------------------------------------------------------- |
| Admin dashboard areas                | `/dashboard/admin/*`                                    |
| Users, sessions, payments, analytics | `users`, `sessions`, `payments`, `analytics` routes     |
| AI logs                              | `/dashboard/admin/ai-logs`                              |
| Content and settings                 | `/dashboard/admin/content`, `/dashboard/admin/settings` |
| Therapist approval                   | UI + `POST /api/admin/approve-therapist`                |
| User status changes                  | `POST /api/admin/users/status`                          |
| Instapay proof override              | `POST /api/admin/instapay/verify`                       |


---

## Platform and safety


| Topic              | Implementation notes                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Bilingual UI       | `useI18n` and copy in components; RTL supported for Arabic                                                         |
| Authentication     | Firebase Auth; server verifies `Bearer` ID tokens on API routes                                                    |
| Authorization      | Firestore security rules + server-side checks per route                                                            |
| AI safety          | Crisis-related handling in AI server routes (e.g. `ai/chat`, `ai/crisis-check`) — see code in `src/routes/api/ai/` |
| Data model         | Central types in `[src/lib/types.ts](../src/lib/types.ts)`                                                         |
| Background hygiene | Cloud Functions: reminders, log pruning, payment timeout release — see [ARCHITECTURE.md](./ARCHITECTURE.md)        |
| Email (lifecycle)  | Resend from Cloud Functions for specific triggers; transactional flows may also write `notifications` in Firestore |


---

## External services (summary)


| Service       | Role in Thera                                           |
| ------------- | ------------------------------------------------------- |
| Firebase      | Auth, Firestore, Storage, scheduled/trigger Functions   |
| Vercel        | Hosts TanStack Start app and all `/api/*` server routes |
| Google Gemini | Model calls from Vercel                                 |
| Daily.co      | Video rooms and tokens from Vercel                      |
| Polar         | Card checkout + webhook on Vercel                       |
| Resend        | Outbound email from Firebase Functions                  |


---

## Documentation index

- [ARCHITECTURE.md](./ARCHITECTURE.md) — diagrams and env-by-host  
- [DEPLOYMENT.md](./DEPLOYMENT.md) — connect Firebase, Vercel, secrets  
- [FEATURES.ar.md](./FEATURES.ar.md) — this page in Arabic  
- [README.md](../README.md) — project introduction and team  
- [README.ar.md](../README.ar.md) — Arabic introduction

