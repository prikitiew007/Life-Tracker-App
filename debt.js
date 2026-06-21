// debt.js
// ---------------------------------------------------------------------------
// Debt tab. Stores each debt; uses calc.js for the leak, payoff order, and a
// realistic avalanche payoff simulation.
//
//   await debt.add({ name:"Tuition loan", balance:12500, annualRate:0.045, minPayment:200 });
//   const s = await debt.stats();          // { totalBalance, annualInterest, payoffOrder, ... }
//   const p = await debt.simulate({ extra:1000 }); // months to debt-free + interest paid
// ---------------------------------------------------------------------------

import { makeStore } from "./_store.js";
import { computeDebtStats, simulatePayoff } from "./calc.js";

function prepare(input = {}) {
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("debt: `name` is required.");
  return {
    name,
    balance: Number(input.balance) || 0,
    annualRate: Number(input.annualRate) || 0,   // fraction, e.g. 0.48 = 48%/yr
    minPayment: Number(input.minPayment) || 0,
    extraPayment: Number(input.extraPayment) || 0,
    notes: (input.notes ?? "").trim()
  };
}

const store = makeStore("debt", prepare);

/** Summary stats across all debts (leak, payoff order, totals). */
store.stats = async function stats() {
  return computeDebtStats(await store.list({ max: 500 }));
};

/** Total monthly debt payment (min + extra). Feeds the cashflow surplus calc. */
store.totalMonthlyPayment = async function totalMonthlyPayment() {
  return (await store.stats()).totalMonthlyPayment;
};

/**
 * Simulate paying everything off with the avalanche method.
 * `monthlyBudget` overrides; otherwise budget = current total payment + `extra`.
 */
store.simulate = async function simulate({ monthlyBudget = null, extra = 0 } = {}) {
  const debts = await store.list({ max: 500 });
  const budget =
    monthlyBudget != null
      ? monthlyBudget
      : computeDebtStats(debts).totalMonthlyPayment + Number(extra || 0);
  return simulatePayoff({ debts, monthlyBudget: budget });
};

export const debt = store;
export default debt;
