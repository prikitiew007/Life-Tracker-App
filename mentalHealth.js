// mentalHealth.js
// ---------------------------------------------------------------------------
// Mental health check-in tracker.
//
// One entry = how you're doing right now. The only required field is `mood`
// (1 = very low ... 5 = very good). Everything else is optional, and you can
// add new fields later without breaking old entries.
//
// USAGE (this is what your "Mental Health" button calls):
//   import { mentalHealth } from "./backend/mentalHealth.js";
//   await mentalHealth.add({ mood: 4, note: "Slept well", tags: ["calm"] });
//   const recent = await mentalHealth.list();
// ---------------------------------------------------------------------------

import { makeStore, todayISO } from "./_store.js";

function prepare(input = {}) {
  const mood = Number(input.mood);
  if (!Number.isFinite(mood) || mood < 1 || mood > 5) {
    throw new Error("mentalHealth: `mood` is required and must be a number 1-5.");
  }
  return {
    mood,                                   // 1-5, required
    note: (input.note ?? "").trim(),        // free text, optional
    tags: Array.isArray(input.tags) ? input.tags : [], // e.g. ["anxious","grateful"]
    sleepHours: input.sleepHours != null ? Number(input.sleepHours) : null, // optional
    date: input.date || todayISO()          // YYYY-MM-DD
  };
}

export const mentalHealth = makeStore("mentalHealth", prepare);
export default mentalHealth;
