# Life Tracker

A personal life-tracking app for anyone — track your **mental health**, **fitness**, **reflection**, and **finances**, and pick only the areas you care about. Built web-first with Firebase, and structured to wrap into iOS/Android later via Capacitor.

## Where things live

- **`backend/`** — the real, current backend: auth, the four trackers, the finance planner engine, security rules, docs, and test pages. Start with `backend/README.md`.
- **`backend/FRONTEND_INTEGRATION.md`** — the contract the UI is built against (use this with Claude Design).

## Trackers

| Tracker | What it logs |
|---------|--------------|
| Mental Health | mood check-ins, sleep, notes |
| Fitness | workouts and activity |
| Reflection | meditation, gratitude, reflection (non-denominational) |
| Finance | cashflow, debt payoff, net worth/RSU, financial-freedom projection |

Each user chooses which trackers to enable when they sign up, and can change that anytime in settings.

## Stale files (safe to delete)

`backend.js` and `firebase-config.js` in this root folder are leftovers from the first prototype and are **superseded by the versions inside `backend/`**. Keeping them risks confusion — ask me to remove them whenever you like.
