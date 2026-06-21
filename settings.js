// settings.js
// ---------------------------------------------------------------------------
// Your planning assumptions, stored as ONE document per user
// (users/{uid}/config/finance). These feed the cashflow CPF calc, the RSU
// valuation, and the FIRE projection. Editing a yellow cell in the spreadsheet
// = calling financeSettings.set({ ... }) here.
// ---------------------------------------------------------------------------

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebase.js";
import { getCurrentUserId } from "./auth.js";

// Sensible defaults (match the spreadsheet's assumptions where general).
export const DEFAULT_SETTINGS = {
  currentAge: null,
  targetAge: null,
  annualReturn: 0.07,        // 7%
  inflation: 0.025,          // 2.5%
  swr: 0.04,                 // 4% rule -> 25x expenses
  yearsDebtClearing: 2,      // kill debt before investing
  cpfRate: 0.20,             // employee CPF as fraction of gross
  rsuPriceUsd: 0,            // MU share price (USD)
  usdSgd: 0,                 // FX rate
  startingAssets: 0          // investable assets today
};

function ref() {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not signed in.");
  return doc(db, "users", uid, "config", "finance");
}

export const financeSettings = {
  /** Read settings, merged over defaults. */
  async get() {
    const snap = await getDoc(ref());
    return { ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) };
  },
  /** Update some settings (merges; leaves other fields untouched). */
  async set(patch) {
    return setDoc(ref(), patch, { merge: true });
  },
  /** Live updates of settings. Returns an unsubscribe function. */
  subscribe(callback) {
    return onSnapshot(ref(), (snap) =>
      callback({ ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) })
    );
  }
};

export default financeSettings;
