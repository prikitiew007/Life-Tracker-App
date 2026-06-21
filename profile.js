// profile.js
// ---------------------------------------------------------------------------
// Who the user is and WHICH trackers they want. This powers two things:
//   1. Onboarding right after signup: "Choose what you want to track."
//   2. Settings later: turn any tracker section on/off.
//
// Stored as one doc per user: users/{uid}/config/profile
//   { onboarded: boolean, enabledTrackers: string[], displayName?: string }
//
//   import { profile, TRACKERS } from "./backend/profile.js";
//   // onboarding screen renders TRACKERS, user ticks some, then:
//   await profile.completeOnboarding(["mentalHealth", "finance"]);
//   // settings screen:
//   await profile.toggleTracker("spirit", true);
//   const p = await profile.get();           // { onboarded, enabledTrackers }
// ---------------------------------------------------------------------------

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebase.js";
import { getCurrentUserId } from "./auth.js";

// The catalog of trackers the app offers. The UI renders this list for both
// onboarding and settings. `key` must match the module/collection name.
export const TRACKERS = [
  { key: "mentalHealth", label: "Mental Health", icon: "🧠", description: "Mood check-ins, sleep, notes" },
  { key: "fitness",      label: "Fitness",       icon: "🏃", description: "Workouts and activity" },
  { key: "spirit",       label: "Reflection",    icon: "🧘", description: "Meditation, gratitude, reflection" },
  { key: "finance",      label: "Finance",       icon: "💰", description: "Cashflow, debt, assets, freedom plan" }
];

const VALID = new Set(TRACKERS.map((t) => t.key));
const DEFAULTS = { onboarded: false, enabledTrackers: [], displayName: "" };

function ref() {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not signed in.");
  return doc(db, "users", uid, "config", "profile");
}

function clean(keys) {
  // keep only known tracker keys, no duplicates, in catalog order
  const set = new Set((keys || []).filter((k) => VALID.has(k)));
  return TRACKERS.map((t) => t.key).filter((k) => set.has(k));
}

export const profile = {
  /** Read the profile, merged over defaults. */
  async get() {
    const snap = await getDoc(ref());
    return { ...DEFAULTS, ...(snap.exists() ? snap.data() : {}) };
  },

  /** True if the user has finished the "choose your trackers" step. */
  async isOnboarded() {
    return (await this.get()).onboarded === true;
  },

  /** Finish onboarding with the chosen trackers. Marks onboarded = true. */
  async completeOnboarding(keys) {
    return setDoc(ref(), { enabledTrackers: clean(keys), onboarded: true }, { merge: true });
  },

  /** Replace the enabled-tracker list (used by settings). */
  async setTrackers(keys) {
    return setDoc(ref(), { enabledTrackers: clean(keys) }, { merge: true });
  },

  /** Turn a single tracker on or off (used by settings toggles). */
  async toggleTracker(key, on) {
    if (!VALID.has(key)) throw new Error("profile: unknown tracker '" + key + "'.");
    const current = (await this.get()).enabledTrackers;
    const next = on ? [...current, key] : current.filter((k) => k !== key);
    return this.setTrackers(next);
  },

  /** Is a given tracker enabled for this user? */
  async isEnabled(key) {
    return (await this.get()).enabledTrackers.includes(key);
  },

  /** Optional: set a display name. */
  async setDisplayName(name) {
    return setDoc(ref(), { displayName: String(name || "").trim() }, { merge: true });
  },

  /** Live updates of the profile. Returns an unsubscribe function. */
  subscribe(callback) {
    return onSnapshot(ref(), (snap) =>
      callback({ ...DEFAULTS, ...(snap.exists() ? snap.data() : {}) })
    );
  }
};

export default profile;
