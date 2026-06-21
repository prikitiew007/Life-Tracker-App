# Life Tracker — Backend

A small, framework-agnostic data layer for three trackers: **mental health**, **fitness**, and **finance**. It talks straight to Firebase (Auth + Firestore) from the client, so there is no server to run or pay for. The same code runs on the web today and inside an iOS/Android app later via **Capacitor**.

## What's in here

| File | Purpose |
|------|---------|
| `firebase-config.js` | Your project keys. **Fill this in first.** |
| `firebase.js` | Boots Firebase once; exports `auth` and `db`. |
| `auth.js` | Sign up / sign in / sign out / current user. |
| `_store.js` | Internal CRUD helper shared by all trackers. |
| `mentalHealth.js` | Mental health check-in tracker. |
| `fitness.js` | Fitness / activity tracker. |
| `finance.js` | Finance tracker (+ `balance()`). |
| `index.js` | One import point for everything. |
| `firestore.rules` | Security rules — **deploy these**. |
| `demo.html` | Plain test page with the 3 buttons. |

## How a tracker is used (what each UI button calls)

```js
import { auth, mentalHealth, fitness, finance } from "./backend/index.js";

await auth.signIn("me@example.com", "secret123");   // required before writing

await mentalHealth.add({ mood: 4, note: "Slept well", tags: ["calm"] });
await fitness.add({ activity: "Run", durationMin: 30, intensity: 4 });
await finance.add({ amount: 12.50, type: "expense", category: "Food" });

const recent  = await fitness.list();        // newest 50
const balance = await finance.balance();     // income − expenses
```

Every tracker exposes the same methods: `add(entry)`, `list({max})`, `subscribe(cb)` (live updates), `update(id, patch)`, `remove(id)`. Required fields: mental health needs `mood` (1–5); fitness needs `activity`; finance needs `amount` (>0) and `type` (`income`/`expense`). Everything else is optional and safe to extend later.

## Finance planner (modeled from the Financial Freedom Planner spreadsheet)

The simple `finance` tracker above is an ad-hoc spending log. The **planner** is the full spreadsheet, modeled as code. It splits cleanly into two kinds of thing:

- **Stored inputs** — your settings, income/expense lines, debts, assets, RSU vesting schedule.
- **Pure calculations** (`calc.js`, no database) — surplus, savings rate, debt payoff, net worth, RSU valuation, and the FIRE projection. These are recomputed on demand, exactly like the spreadsheet's formulas.

```js
import { auth, financeSettings, cashflow, debt, assets, projection } from "./backend/index.js";
await auth.signIn("me@example.com", "secret123");

// 1. Assumptions (the yellow cells)
await financeSettings.set({ currentAge: 27, targetAge: 40, cpfRate: 0.20,
                            rsuPriceUsd: 100, usdSgd: 1.34, annualExpenses: 21521, annualSurplus: 78848 });

// 2. Cashflow — monthly income & expense lines
await cashflow.add({ month: "2026-01", kind: "income",  category: "Base salary", amount: 5949 });
await cashflow.add({ month: "2026-01", kind: "expense", category: "Food",        amount: 400 });
const jan = await cashflow.summary("2026-01");   // -> net, surplus, savingsRate

// 3. Debt — avalanche payoff (highest rate first)
await debt.add({ name: "Tuition loan", balance: 12500, annualRate: 0.045, minPayment: 200 });
const stats = await debt.stats();                // -> totalBalance, annualInterest, payoffOrder
const plan  = await debt.simulate({ extra: 1000 }); // -> monthsToDebtFree, totalInterestPaid

// 4. Assets + RSU
await assets.add({ name: "CPF OA", category: "CPF", value: 20025, liquid: "No" });
await assets.addVest({ vestDate: "2026-07-15", shares: 4 });
const nw  = await assets.netWorth();             // -> total, liquid, locked, byCategory
const rsu = await assets.rsuSummary();           // -> vested/unvested, monthlyRsuNext12

// 5. FIRE projection (pure math, reads your settings)
const fi = await projection.run();               // -> fiNumber, ageReachFI, year-by-year rows
```

The engine in `calc.js` was verified against your spreadsheet: it reproduces the Jan savings rate (73.193%), RSU monthly income (S$6,096.14), the FI number (S$741,678.92), and FI age (36) to the cent.

> **The one rule the model enforces** (from your README): debt is paid off before money goes into investments, and the highest-interest debt is paid first. `debt.stats().payoffOrder` and `simulate()` encode exactly that.

## Data model

```
users / {userId} / mentalHealth / {entryId}     // simple tracker
users / {userId} / fitness      / {entryId}     // simple tracker
users / {userId} / spirit       / {entryId}     // reflection tracker (neutral)
users / {userId} / finance      / {entryId}     // ad-hoc transaction log
users / {userId} / config       / profile       // onboarding + enabled trackers
users / {userId} / cashflow     / {entryId}     // planner: monthly income/expense lines
users / {userId} / debt         / {entryId}     // planner: debts
users / {userId} / assets       / {entryId}     // planner: asset holdings
users / {userId} / rsuVests     / {entryId}     // planner: RSU vesting schedule
users / {userId} / config       / finance       // planner: assumptions (single doc)
```

Each user's data lives under their own id. That single fact is what makes the security rules two lines long — and it's the part that carries over to ANY future tech choice (even native Swift/Kotlin).

## Setup (one time)

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → Create database.
4. Project settings → Your apps → Web app → copy the config into `firebase-config.js`.
5. Deploy the security rules (below). Do this on day one.

### Deploy the security rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore      # point it at firestore.rules when asked
firebase deploy --only firestore:rules
```

> The keys in `firebase-config.js` are **not secret** — they only identify your project. Your data is protected by `firestore.rules`, not by hiding the keys.

## Run the test harness locally

ES module imports don't work from `file://`, so serve the folder over HTTP:

```bash
# from inside the backend/ folder
python3 -m http.server 8000
# then open http://localhost:8000/demo.html
```

Sign up, then tap each of the three buttons, then **Show my recent entries**. If entries appear (and show up in the Firestore console), the backend works.

## Later: turn this into iOS + Android apps (Capacitor)

You don't rewrite anything. Capacitor wraps your finished web app in a native shell:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Life Tracker" com.you.lifetracker
npx cap add ios
npx cap add android
# copy your built web files into the webDir, then:
npx cap sync
npx cap open ios       # or: npx cap open android
```

The Firebase web SDK used here runs fine inside Capacitor's WebView, so `auth.js` and all three trackers work unchanged. To upgrade the apps later, you update the web code and run `npx cap sync` again.

> If you ever switch to **React Native** instead, reuse these files but replace the `https://www.gstatic.com/...` CDN imports with the `firebase` npm package — the function bodies stay the same. If you go fully **native (Swift/Kotlin)**, this JS is rewritten, but the data model and `firestore.rules` above transfer directly.
