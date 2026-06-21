// index.js
// ---------------------------------------------------------------------------
// One convenient import point for the whole backend. From your UI you can do:
//
//   import {
//     auth, mentalHealth, fitness, finance,
//     financeSettings, cashflow, debt, assets, projection, calc
//   } from "./backend/index.js";
// ---------------------------------------------------------------------------

// Core
export * as auth from "./auth.js";
export { profile, TRACKERS } from "./profile.js";   // who the user is + which trackers they enabled

// Simple trackers
export { mentalHealth } from "./mentalHealth.js";
export { fitness } from "./fitness.js";
export { spirit, PRACTICES } from "./spirit.js";     // neutral reflection tracker
export { finance } from "./finance.js";        // ad-hoc transaction log

// Finance planner (the spreadsheet, modeled)
export { financeSettings } from "./settings.js";
export { cashflow } from "./cashflow.js";
export { debt } from "./debt.js";
export { assets } from "./assets.js";
export { projection } from "./projection.js";
export * as calc from "./calc.js";             // pure functions, no storage
