# Thera — Deployment and environment setup

This guide explains how to connect Firebase, Vercel, and third-party services so Thera runs outside **demo mode**. For a diagram of what runs where, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Prerequisites

- Node.js compatible with the repo (see `package.json` engines if specified)
- Firebase project with **Blaze** billing if you use Cloud Functions
- Vercel account (recommended for TanStack Start production builds)
- Optional: [Google AI Studio](https://aistudio.google.com/apikey) API key for Gemini, Daily.co, Polar, Resend accounts as needed

---

## 1. Firebase project

1. In [Firebase Console](https://console.firebase.google.com), create a project (or reuse an existing one).
2. Enable **Authentication** (Email/Password and Google are used in the app).
3. Enable **Cloud Firestore** and **Storage**.
4. Enable **Cloud Functions** (Gen 2) if you deploy `functions/`.
5. Register a **Web app** and copy the web config for `VITE_*` variables.

### Security rules and indexes

From the repository root (after `firebase login` and `firebase use <projectId>`):

```bash
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage:rules
```

---

## 2. Local environment (`.env.local`)

Create `.env.local` in the project root (never commit it):

```bash
# Firebase Web SDK (client)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Optional
# VITE_FIREBASE_MEASUREMENT_ID=
# VITE_FIREBASE_VAPID_KEY=
# VITE_ENABLE_DEMO=false

# Server-only (TanStack Start / Vite dev server) — same names as Vercel
# FIREBASE_ADMIN_KEY={"type":"service_account",...}   # single-line JSON
# GEMINI_API_KEY=
# DAILY_API_KEY=
# POLAR_ACCESS_TOKEN=
# POLAR_PRODUCT_ID=
# POLAR_WEBHOOK_SECRET=
# POLAR_SERVER=production
# PUBLIC_SITE_URL=https://your-domain.example
```

Restart the dev server after changes. If Firebase keys are missing or invalid, the app may show **demo mode** (mock data) unless `VITE_ENABLE_DEMO=false` forces otherwise.

---

## 3. Firebase Cloud Functions

Interactive HTTP APIs live on **Vercel** (`src/routes/api/**`). Cloud Functions in this repository handle **triggers**, **schedules**, and **Resend** email only.

```bash
cd functions
npm install
```

### Secrets (Firebase Functions)

```bash
npx firebase-tools@latest functions:secrets:set RESEND_API_KEY
npx firebase-tools@latest functions:secrets:set EMAIL_FROM
npx firebase-tools@latest functions:secrets:set APP_URL
```

- **RESEND_API_KEY** — from [Resend](https://resend.com).
- **EMAIL_FROM** — verified sender, e.g. `Thera <notifications@yourdomain.com>`.
- **APP_URL** — public site URL used in email links (e.g. `https://your-domain.example`).

Deploy functions:

```bash
cd ..
npx firebase-tools@latest deploy --only functions
```

Do **not** expect Gemini, Polar, or Daily keys to be read by this Functions codebase; configure those on **Vercel** for server routes.

---

## 4. Vercel (production)

1. Import the Git repository into Vercel.
2. Use the build settings from [`vercel.json`](../vercel.json) (`npm run build:vercel`, output `.vercel/output`).
3. Add **all** variables from section 2: both `VITE_*` (client) and server-only keys (`FIREBASE_ADMIN_KEY`, `GEMINI_API_KEY`, `DAILY_API_KEY`, `POLAR_*`, etc.) in the Vercel project **Environment Variables** UI.
4. For **Polar**, configure the webhook URL to `https://<your-domain>/api/polar/webhook` and set `POLAR_WEBHOOK_SECRET` to match.

---

## 5. Firebase Console checklist

- **Authentication → Settings → Authorized domains**: add your Vercel and custom domains.
- **Google provider**: configure OAuth client and consent screen in Google Cloud if needed.
- **Firestore / Storage**: confirm rules deployed and indexes built.

---

## 6. Useful scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production client/server bundle |
| `npm run build:vercel` | Vercel-oriented build |
| `npm run grant-admin` | Utility script to grant admin (see script source) |

---

## Related documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system diagrams and env-by-host table  
- [README-FIREBASE.md](../README-FIREBASE.md) — legacy short link; prefer this file for full setup  
- [FEATURES.md](./FEATURES.md) — product capabilities  
