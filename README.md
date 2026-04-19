# Thera

**Thera** is a bilingual (English / Arabic) mental wellness web platform: guided AI support, therapist discovery, booking, payments (card via Polar or bank transfer via therapist Instapay links), video sessions (Daily.co), and role-based dashboards for adults, parents, teens, therapists, and administrators.

Submitted for review by **Edu Tech** and **We Schools** as the capstone project of **Semi Colon Team**.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagrams (Mermaid), components, environment variables by host |
| [docs/FEATURES.md](docs/FEATURES.md) | Feature list mapped to routes and APIs |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Firebase, Vercel, secrets, and go-live checklist |
| [README.ar.md](README.ar.md) | **العربية** — نفس المحتوى التعريفي بالعربية الفصحى |

---

## Team — Semi Colon Team

| Name | Role |
|------|------|
| Menna Mohamed Bashir | UX/UI Designer & AI |
| Merna Mohamed | Back-End Developer |
| Raneem El-Saeed | Database Engineer |
| Mohamed Ahmed | Front-End Developer |

---

## Tech stack (summary)

| Area | Technologies |
|------|----------------|
| App framework | TanStack Start, TanStack Router, React 19, Vite |
| UI | Tailwind CSS, Radix UI, Framer Motion |
| Data & auth | Firebase Authentication, Cloud Firestore, Cloud Storage |
| Server APIs | TanStack Start routes under `src/routes/api/` (hosted on **Vercel**) |
| Background | Firebase Cloud Functions (email, schedules, housekeeping) |
| AI | Google Gemini (`@google/genai`) on Vercel |
| Video | Daily.co |
| Card payments | Polar |

---

## Quick start (developers)

```bash
npm install
# Create .env.local using variable names in docs/DEPLOYMENT.md
npm run dev
```

Open the URL printed in the terminal (typically `http://localhost:5173`).

---

## Repository layout (high level)

```
src/routes/          # Pages and layouts (file-based routing)
src/routes/api/      # Server-only HTTP handlers (AI, booking, payments, admin)
src/lib/             # Firebase client/server helpers, types, AI utilities
functions/           # Firebase Cloud Functions (triggers + schedules)
firestore.rules      # Firestore security rules
storage.rules        # Storage security rules
docs/                # Architecture, features, deployment guides
```

---

## License and confidentiality

This repository is maintained for academic and demonstration purposes. Do not commit real API keys, service account JSON, or personal health data.

---

## Links

- [Firebase Console](https://console.firebase.google.com)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Google AI Studio (Gemini API keys)](https://aistudio.google.com/apikey)
