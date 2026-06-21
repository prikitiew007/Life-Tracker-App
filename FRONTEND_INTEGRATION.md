# Frontend Integration Spec

This document is the **contract** between the UI and the backend. Build the front end (Claude Design or otherwise) against the functions and data shapes below — do not invent new ones. Everything here is already implemented and tested in `backend/`.

## Golden rules

1. **One import:** `import { ... } from "./backend/index.js";` (ES modules, `<script type="module">`).
2. **Auth gate:** a user must be signed in before any read/write. Every tracker call throws `"Not signed in."` otherwise. Render the app only after `auth.onAuthChange` reports a user.
3. **Async everywhere:** every backend call returns a Promise. `await` it and wrap in `try/catch` for user-facing errors.
4. **Don't store derived numbers.** Surplus, net worth, payoff, FIRE projection are *computed* (via `calc.js`). Always recompute; never persist them.
5. **No localStorage for app data.** (The old prototype used it; the backend replaces it with Firestore so data syncs across web + future mobile.)

---

## Auth

```js
import { auth } from "./backend/index.js";

auth.onAuthChange(user => { /* user object or null — toggle login screen vs app */ });
await auth.signUp(email, password);   // password 6+ chars
await auth.signIn(email, password);
await auth.signOutUser();
auth.getCurrentUserId();              // string | null
```

UI needs: an email/password login + signup screen, and a sign-out control. Show friendly text for common errors (`auth/invalid-credential`, `auth/email-already-in-use`, `auth/weak-password`).

---

## Onboarding & tracker selection — `profile`, `TRACKERS`

This app lets each user pick which trackers they want. Right after signup, show an onboarding screen; let them change it later in Settings.

```js
import { profile, TRACKERS } from "./backend/index.js";

// TRACKERS is the catalog to render (checkboxes / cards):
// [{ key:"mentalHealth", label:"Mental Health", icon:"🧠", description:"..." }, ...]
//   keys: "mentalHealth" | "fitness" | "spirit" | "finance"

// First-run gate:
if (!(await profile.isOnboarded())) showOnboarding();   // else go to home

// Onboarding "continue" button:
await profile.completeOnboarding(["mentalHealth", "finance"]);  // marks onboarded=true

// Settings screen:
await profile.toggleTracker("spirit", true);   // turn one on/off
await profile.setTrackers(["fitness"]);        // replace the whole list
const p = await profile.get();                 // { onboarded, enabledTrackers, displayName }
profile.subscribe(p => renderNav(p.enabledTrackers));
```

**Drive the whole UI off `enabledTrackers`:** only show the nav items / home cards for trackers in that list. Unknown or unchecked trackers are simply hidden. (Disabling a tracker hides it; it does not delete the data.)

---

## Simple trackers (one-button each)

All three share the same methods: `add(entry)`, `list({max})`, `subscribe(cb,{max})`, `update(id,patch)`, `remove(id)`. `add` returns the new id; `list`/`subscribe` return arrays of `{ id, ...fields, createdAt, date }`, newest first.

### Mental health — `mentalHealth`
| field | type | required | notes |
|-------|------|----------|-------|
| mood | number 1–5 | ✅ | the only required field |
| note | string | — | free text |
| tags | string[] | — | e.g. `["anxious","grateful"]` |
| sleepHours | number | — | |

```js
await mentalHealth.add({ mood: 4, note: "Slept well", tags: ["calm"], sleepHours: 7 });
```
UI suggestion: a mood picker (1–5) + optional note. That's the "one button."

### Fitness — `fitness`
| field | type | required | notes |
|-------|------|----------|-------|
| activity | string | ✅ | e.g. "Run", "Yoga" |
| durationMin | number | — | |
| intensity | number 1–5 | — | |
| note | string | — | |

```js
await fitness.add({ activity: "Run", durationMin: 30, intensity: 4 });
```

### Reflection (the spiritual tracker, neutral) — `spirit`
Non-denominational by design — no scripture. `PRACTICES` is a suggested list (`Meditation`, `Gratitude`, `Reflection`, `Breathwork`, `Journaling`, `Prayer`, `Time in nature`); free text is allowed too.
| field | type | required | notes |
|-------|------|----------|-------|
| practice | string | ✅ | e.g. "Meditation"; people of faith can pick "Prayer" |
| minutes | number | — | |
| gratitude | string | — | what you're grateful for |
| note | string | — | free reflection / thoughts |

```js
import { spirit, PRACTICES } from "./backend/index.js";
await spirit.add({ practice: "Meditation", minutes: 10, gratitude: "A quiet morning" });
```

### Finance (ad-hoc log) — `finance`
| field | type | required | notes |
|-------|------|----------|-------|
| amount | number > 0 | ✅ | |
| type | "income" \| "expense" | ✅ | |
| category | string | — | |
| account | string | — | |
| note | string | — | |

```js
await finance.add({ amount: 12.5, type: "expense", category: "Food" });
await finance.balance();   // number: income − expenses
```

> `finance` is the quick spending log. For the structured monthly planner, use `cashflow` below.

---

## Finance planner (the spreadsheet, modeled)

### Settings — `financeSettings`
One config doc. Read it to prefill forms; write partial updates.

```js
const s = await financeSettings.get();          // merged over defaults
await financeSettings.set({ currentAge: 27, targetAge: 40 });   // merges
financeSettings.subscribe(s => { /* live */ });
```
Fields (all editable): `currentAge, targetAge, annualReturn (0.07), inflation (0.025), swr (0.04), yearsDebtClearing (2), cpfRate (0.20), rsuPriceUsd, usdSgd, startingAssets, annualExpenses, annualSurplus`.

UI suggestion: a "Plan settings" screen of labeled inputs. Show rates as % (store as fractions: 7% → 0.07).

### Cashflow — `cashflow`
Standard CRUD plus `summary(month, opts)`.

| field | type | required | notes |
|-------|------|----------|-------|
| month | "YYYY-MM" | — | defaults to current month |
| kind | "income" \| "expense" | ✅ | |
| amount | number | ✅ | |
| category | string | — | |
| note | string | — | |

```js
await cashflow.add({ month:"2026-01", kind:"income",  category:"Base salary", amount:5949 });
const m = await cashflow.summary("2026-01");
// m -> { month, incomeItems, expenseItems, gross, cpf, net, expenses, debtPayment, surplus, savingsRate }
```
UI suggestion: month selector → two lists (income / expenses) with add rows → a summary card (net, surplus, savings rate %). `cpfRate` and debt payment are pulled automatically; both can be overridden via `summary(month, { cpfRate, debtPayment })`.

### Debt — `debt`
Standard CRUD plus `stats()`, `totalMonthlyPayment()`, `simulate({extra})`.

| field | type | required | notes |
|-------|------|----------|-------|
| name | string | ✅ | |
| balance | number | — | |
| annualRate | number (fraction) | — | 0.48 = 48%/yr |
| minPayment | number | — | per month |
| extraPayment | number | — | per month |
| notes | string | — | |

```js
const stats = await debt.stats();
// -> { totalBalance, annualInterest, totalMonthlyPayment, monthsToClearRough, payoffOrder }
const plan = await debt.simulate({ extra: 1000 });
// -> { monthsToDebtFree, totalInterestPaid, feasible }
```
UI suggestion: list of debts; a "leak" figure (`annualInterest`); a highlighted **payoff order** (avalanche — highest rate first); a what-if slider for `extra` driving `simulate()`.

### Assets + RSU — `assets`
Asset CRUD plus `netWorth()`, and a separate RSU vesting list.

Asset fields: `name` (✅), `category`, `value`, `liquid` ("Yes"/"No"/"Sellable"), `notes`.
RSU vest fields: `vestDate` ("YYYY-MM-DD", ✅), `shares`, `notes`.

```js
await assets.add({ name:"CPF OA", category:"CPF", value:20025, liquid:"No" });
const nw = await assets.netWorth();        // { total, liquid, locked, byCategory }

await assets.addVest({ vestDate:"2026-07-15", shares:4 });
await assets.listVests();  await assets.removeVest(id);
const rsu = await assets.rsuSummary();     // price/FX from settings; override with { priceUsd, usdSgd, asOf }
// rsu -> { rows, totalShares, vestedShares, unvestedShares, next12Shares,
//          vestedValue, unvestedValue, monthlyRsuNext12 }
```
UI suggestion: net-worth card (total + liquid vs locked + by-category breakdown); a vesting table with status chips (Vested / Next 12mo / Future) and `monthlyRsuNext12` surfaced.

### FIRE projection — `projection`
Pure math; nothing to store.

```js
const p = await projection.run();          // reads settings; pass overrides for what-ifs
// p -> { fiNumber, ageReachFI, rows:[{ age, year, start, contribution, growth, end, reachedFI }] }
await projection.run({ annualReturn: 0.05 });   // scenario
```
Requires `currentAge` + `targetAge` set in settings (throws otherwise). UI suggestion: a headline ("Financial freedom at age **{ageReachFI}**"), the FI target number, and a line/area chart of `rows[].end` with the FI line overlaid.

---

## Suggested screen map

| Screen | Backend it calls |
|--------|------------------|
| Login / Signup | `auth.*` |
| Onboarding (choose trackers) | `TRACKERS`, `profile.completeOnboarding` |
| Home / dashboard | only enabled trackers (`profile.get`), then latest `mentalHealth.list`, `fitness.list`, `spirit.list`, `cashflow.summary`, `assets.netWorth`, `projection.run` |
| Mental health | `mentalHealth.*` |
| Fitness | `fitness.*` |
| Reflection | `spirit.*`, `PRACTICES` |
| Money › Cashflow | `cashflow.*`, `financeSettings` |
| Money › Debt | `debt.*` |
| Money › Assets & RSU | `assets.*`, `financeSettings` |
| Money › Freedom plan | `projection.*`, `financeSettings` |
| Settings | `profile.toggleTracker` (which trackers show), `financeSettings.*`, `auth.signOutUser` |

> Navigation is dynamic: render a tracker's nav item / home card **only if** its key is in `profile.get().enabledTrackers`.

## De-branding checklist (for whoever builds the UI)
The earlier design was a faith-based "Recovery" app. For the general-audience version:
- Rename the product away from "Recovery, measured" to a neutral name (e.g. "Life Tracker").
- Remove all scripture/quote content (e.g. Psalm references) and any `scripture` / `scriptureRef` fields.
- Rename the "Soul" pillar to **"Reflection"** and point it at the `spirit` tracker above (neutral practices, no scripture).
- Replace the demo account `ann@recovery.app` with a generic placeholder.
- Keep the four-pillar visual language if you like it, just relabel: Mental Health · Fitness · Reflection · Finance.

## Cross-platform note
Built this way (ES modules + Firebase web SDK), the same UI + backend wraps into iOS/Android via **Capacitor** with no code changes. Keep all data access going through these functions — never call Firestore directly from a component — so the contract stays portable.
