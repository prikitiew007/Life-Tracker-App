// cashflow.js
// ---------------------------------------------------------------------------
// Cashflow tab. Stores monthly income & expense lines, then computes the
// monthly summary (net take-home, surplus, savings rate) via calc.js.
//
// Each entry belongs to a month ("YYYY-MM"), so you build up a history.
//   await cashflow.add({ month:"2026-01", kind:"income",  category:"Base salary", amount:5949 });
//   await cashflow.add({ month:"2026-01", kind:"expense", category:"Food",        amount:400 });
//   const jan = await cashflow.summary("2026-01");  // pulls CPF from settings, debt from debt.js
// ---------------------------------------------------------------------------

import { makeStore, todayISO } from "./_store.js";
import { computeCashflow } from "./calc.js";
import { financeSettings } from "./settings.js";
import { debt } from "./debt.js";

const KINDS = ["income", "expense"];

function prepare(input = {}) {
  const kind = String(input.kind || "").toLowerCase();
  if (!KINDS.includes(kind)) throw new Error('cashflow: `kind` must be "income" or "expense".');
  const amount = Number(input.amount);
  if (!Number.isFinite(amount)) throw new Error("cashflow: `amount` must be a number.");
  return {
    kind,
    amount,
    category: (input.category ?? "").trim(),
    note: (input.note ?? "").trim(),
    month: input.month || todayISO().slice(0, 7) // YYYY-MM
  };
}

const store = makeStore("cashflow", prepare);

/**
 * Monthly summary for one "YYYY-MM".
 * By default cpfRate comes from settings and debtPayment from the Debt tab,
 * but you can override either for "what-if" calculations.
 */
store.summary = async function summary(month, { cpfRate = null, debtPayment = null } = {}) {
  const all = await store.list({ max: 2000 });
  const rows = all.filter((e) => e.month === month);
  const incomeItems = rows.filter((r) => r.kind === "income");
  const expenseItems = rows.filter((r) => r.kind === "expense");

  const rate = cpfRate != null ? cpfRate : (await financeSettings.get()).cpfRate;
  const debtPay = debtPayment != null ? debtPayment : await debt.totalMonthlyPayment();

  return {
    month,
    incomeItems,
    expenseItems,
    ...computeCashflow({ incomeItems, expenseItems, cpfRate: rate, debtPayment: debtPay })
  };
};

export const cashflow = store;
export default cashflow;
