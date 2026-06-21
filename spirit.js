// spirit.js
// ---------------------------------------------------------------------------
// Reflection tracker — the non-denominational "spiritual" tracker.
//
// Deliberately neutral so it fits anyone: meditation, gratitude, reflection,
// breathwork, journaling. People of faith can log "Prayer" as a practice and
// write whatever they want in `note`. There is NO built-in scripture or
// religious content.
//
// USAGE (this is what your "Reflection" button calls):
//   import { spirit } from "./backend/spirit.js";
//   await spirit.add({ practice: "Meditation", minutes: 10, gratitude: "Quiet morning" });
//   const recent = await spirit.list();
// ---------------------------------------------------------------------------

import { makeStore, todayISO } from "./_store.js";

// Suggested practices for the UI to offer (free text is also allowed).
export const PRACTICES = ["Meditation", "Gratitude", "Reflection", "Breathwork", "Journaling", "Prayer", "Time in nature"];

function prepare(input = {}) {
  const practice = (input.practice ?? "").trim();
  if (!practice) {
    throw new Error('spirit: `practice` is required (e.g. "Meditation", "Gratitude").');
  }
  return {
    practice,                                   // required label
    minutes: input.minutes != null ? Number(input.minutes) : null, // optional
    gratitude: (input.gratitude ?? "").trim(),  // optional: what you're grateful for
    note: (input.note ?? "").trim(),            // optional free text (prayer, thoughts...)
    date: input.date || todayISO()              // YYYY-MM-DD
  };
}

export const spirit = makeStore("spirit", prepare);
export default spirit;
