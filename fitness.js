// fitness.js
// ---------------------------------------------------------------------------
// Fitness / activity tracker.
//
// One entry = one workout or activity. The only required field is `activity`
// (a short label like "Run" or "Yoga"). Duration, intensity and notes are
// optional; add more fields (sets, reps, distance) later as needed.
//
// USAGE (this is what your "Fitness" button calls):
//   import { fitness } from "./backend/fitness.js";
//   await fitness.add({ activity: "Run", durationMin: 30, intensity: 4 });
//   const recent = await fitness.list();
// ---------------------------------------------------------------------------

import { makeStore, todayISO } from "./_store.js";

function prepare(input = {}) {
  const activity = (input.activity ?? "").trim();
  if (!activity) {
    throw new Error("fitness: `activity` is required (e.g. \"Run\", \"Yoga\").");
  }
  let intensity = null;
  if (input.intensity != null) {
    intensity = Number(input.intensity);
    if (!Number.isFinite(intensity) || intensity < 1 || intensity > 5) {
      throw new Error("fitness: `intensity` must be a number 1-5 when provided.");
    }
  }
  return {
    activity,                                                        // required
    durationMin: input.durationMin != null ? Number(input.durationMin) : null, // optional
    intensity,                                                       // 1-5, optional
    note: (input.note ?? "").trim(),                                 // optional
    date: input.date || todayISO()                                   // YYYY-MM-DD
  };
}

export const fitness = makeStore("fitness", prepare);
export default fitness;
