# Booking system QA checklist

Manual verification matrix after deploying indexes, rules, and Vercel env vars.

## Deploy order

1. `firebase deploy --only firestore:rules,firestore:indexes`
2. Deploy Cloud Functions (`releaseExpiredLocks` needs `bookings` status+createdAt index)
3. Vercel: `PUBLIC_SITE_URL`, `FIREBASE_ADMIN_KEY` (no Polar vars required while card payments are deferred)
4. **Polar (deferred):** set `POLAR_PAYMENTS_ENABLED=true` plus Polar secrets when ready; until then checkout is InstaPay-only

## Test matrix

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Two users same slot | Second gets 409; slot disappears live for both |
| 2 | Polar pay (when enabled) | Redirect to Polar → webhook → confirmed + session |
| 3 | InstaPay | Proof `pending_review` → therapist approves → confirmed |
| 4 | Lock timeout 15 min | Slot reopens; booking cancelled (`releaseExpiredLocks`) |
| 5 | Therapist toggles booked cell | Blocked in UI; Firestore rules block client revert |
| 6 | Parent books for child | `childId` + `childName` on booking; visible in checkout |
| 7 | Message after booking | Inbox thread opens; realtime delivery |
| 8 | Rebook shortcut | Dashboard / bookings “Book again” → wizard |

## Env vars

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Firebase and Polar configuration.
