# Connecting Firebase to Thera

> **Where things run:** All interactive HTTP APIs (Gemini, booking, Polar, Daily, Instapay proof, admin APIs) live on **Vercel** under `src/routes/api/`. **Firebase Cloud Functions** in this repo only handle Firestore triggers, schedules, and **Resend** email. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the full checklist [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Thera ships with a complete Firebase scaffold (Auth, Firestore, Storage, Cloud Functions) but no live keys. The app runs in **demo mode** with mock data until you connect your project.

## 1. Create a Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Enable: **Authentication** (Email/Password + Google), **Firestore**, **Storage**, **Functions** (Blaze plan required).
3. Add a **Web app** to the project; copy the config object.

## 2. Add environment variables

Create `.env.local` in the project root (or set them on Vercel):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Optional — force demo mode on even when Firebase keys are present (default: auto)
# VITE_ENABLE_DEMO=false
```

For **server** variables (`FIREBASE_ADMIN_KEY`, `GEMINI_API_KEY`, `POLAR_`*, `DAILY_API_KEY`, etc.), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Restart the dev server. The "demo mode" banner should disappear when the client Firebase config is valid.

## 3. Deploy security rules

```bash
npx firebase-tools@latest login
npx firebase-tools@latest use <your-project-id>
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage:rules
```

## 4. Deploy Cloud Functions (email + schedules)

Gemini, Polar, and Daily are **not** configured here — set those on **Vercel** for `src/routes/api/`.

```bash
cd functions
npm install
npx firebase-tools@latest functions:secrets:set RESEND_API_KEY
npx firebase-tools@latest functions:secrets:set EMAIL_FROM
npx firebase-tools@latest functions:secrets:set APP_URL
cd ..
npx firebase-tools@latest deploy --only functions
```

Functions in `functions/src/index.ts`:


| Function              | Trigger                          | Purpose                                                  |
| --------------------- | -------------------------------- | -------------------------------------------------------- |
| `sendBookingEmail`    | Firestore `bookings/{id}` update | Email when status becomes `confirmed`                    |
| `notifyReportReady`   | Firestore `reports/{id}` create  | Email patient when report is created                     |
| `scheduledReminders`  | Schedule every 15 min            | ~24h and ~1h session reminders                           |
| `pruneAdminLogs`      | Schedule daily                   | Retention for `adminLogs`                                |
| `releaseExpiredLocks` | Schedule every 5 min             | Cancels stale `pending_payment` bookings and frees slots |


Server-side API routes (TanStack Start on **Vercel**, `src/routes/api/`):


| Route                     | Method   | Purpose                                                               |
| ------------------------- | -------- | --------------------------------------------------------------------- |
| `ai/chat`                 | POST+SSE | Streaming Gemini chat with two-stage crisis detection and AbortSignal |
| `ai/intake`               | POST     | Structured intake analysis (`responseSchema` JSON)                    |
| `ai/summarize`            | POST     | Bilingual report summary                                              |
| `ai/crisis-check`         | POST     | Standalone crisis classifier                                          |
| `ai/transcribe`           | POST     | Audio transcription (when configured)                                 |
| `booking/lock`            | POST     | Atomic slot claim → booking creation                                  |
| `booking/cancel`          | POST     | Transactional cancel with refund + notifications                      |
| `polar/checkout`          | POST     | Initiate Polar card-payment checkout                                  |
| `polar/webhook`           | POST     | Verify payment, create session, send notifications                    |
| `instapay/proof`          | POST     | Submit transfer proof (status → `awaiting_verification`)              |
| `admin/instapay/verify`   | POST     | Admin approve/reject proof, create session on approve                 |
| `admin/approve-therapist` | POST     | Therapist application approval                                        |
| `admin/users/status`      | POST     | Admin user status changes                                             |
| `sessions/$id/end`        | POST     | Therapist ends live session                                           |
| `sessions/$id/token`      | GET      | Daily.co meeting token (returns `demo:true` when key absent)          |
| `reports/create`          | POST     | Therapist submits post-session report                                 |


## 5. (Optional) Payment & video providers

- **Polar (card payments)**: set `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_WEBHOOK_SECRET` (and optional `POLAR_SERVER`) on **Vercel**, not in Functions secrets.
- **Daily.co (video)**: set `DAILY_API_KEY` on **Vercel**. When absent, session rooms run in demo mode and display a banner.
- **Instapay (bank transfer)**: therapists add their Instapay link in **Dashboard → Availability → InstaPay settings**. The checkout page renders a deep-link button on mobile and a QR code on desktop. After the patient transfers and uploads a screenshot, **the therapist** reviews and confirms in **Dashboard → InstaPay proofs**. Admins retain override access.

## 6. Deploy the frontend to Vercel

The app is a TanStack Start project — Vercel autodetects it. Add the same `VITE_FIREBASE_`* and server env vars in Vercel → Project → Settings → Environment Variables. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Key Firestore schema notes


| Collection               | Key fields                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `users/{uid}`            | `role`, `displayName`, `language`, `xp`, `onboardingCompleted`, `notifPrefs`, `updatedAt`                                    |
| `therapists/{uid}`       | `displayName`, `verified`, `instapay.{link,handle,recipientName}`                                                            |
| `availabilitySlots/{id}` | `therapistId`, `startsAt`, `endsAt`, `status` (open/locked/booked)                                                           |
| `bookings/{id}`          | `patientUid`, `therapistId`, `slotId`, `startsAt`, `endsAt`, `status`, `paymentProvider`                                     |
| `sessions/{id}`          | `bookingId`, `patientUid`, `therapistId`, `startsAt`, `endsAt`, `status` (upcoming/live/ended/missed), `roomUrl`, `roomName` |
| `payments/{id}`          | `bookingId`, `provider`, `status`, `amount`, `currency`, proof fields per `PaymentDoc`                                       |
| `reports/{id}`           | `sessionId`, `therapistId`, `patientUid`, `raw`, `summaryEn`, `summaryAr`, `createdAt`                                       |
| `adminLogs/{id}`         | `kind`, `severity`, `createdAt`, plus context fields                                                                         |
| `notifications/{id}`     | `userId`, `kind`, `read`, `createdAt`, bilingual `title`/`body`                                                              |
| `config/{id}`            | Public config (readable by all, writable by admin)                                                                           |


**Firestore security rules** are in `firestore.rules`. **Full TypeScript schemas** are in `src/lib/types.ts`.