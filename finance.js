// finance.js
// ---------------------------------------------------------------------------
// Personal finance tracker.
//
// One entry = one transaction. Required fields are `amount` (a positive number)
// and `type` ("income" or "expense"). Category, account and notes are optional.
//
// USAGE (this is what your "Finance" button calls):
//   import { finance } from "./backend/finance.js";
//   await finance.add({ amount: 12.50, type: "expense", category: "Food" });
//   const recent = await finance.list();
//   const total  = await finance.balance(); // income minus expenses
// ---------------------------------------------------------------------------

import { makeStore, todayISO } from "./_store.js";

const TYPES = ["income", "expense"];

function prepare(input = {}) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("finance: `amount` is required and must be a positive number.");
  }
  const type = String(input.type || "").toLowerCase();
  if (!TYPES.includes(type)) {
    throw new Error('finance: `type` is required and must be "income" or "expense".');
  }
  return {
    amount,                                          // positive number, required
    type,                                            // "income" | "expense", required
    category: (input.category ?? "").trim(),         // e.g. "Food", optional
    account: (input.account ?? "").trim(),           // e.g. "Cash", optional
    note: (input.note ?? "").trim(),                 // optional
    date: input.date || todayISO()                   // YYYY-MM-DD
  };
}

const store = makeStore("finance", prepare);

// Finance gets one extra convenience method on top of the standard CRUD.
store.balance = async function balance({ max = 1000 } = {}) {
  const entries = await store.list({ max });
  return entries.reduce(
    (sum, e) => sum + (e.type === "income" ? e.amount : -e.amount),
    0
  );
};

export const finance = store;
export default finance;
