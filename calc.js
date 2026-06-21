// calc.js
// ---------------------------------------------------------------------------
// The finance ENGINE. Pure functions only — NO Firebase, NO browser, NO state.
// This is a direct translation of the "Financial Freedom Planner" spreadsheet
// formulas into reusable code.
//
// Because nothing here touches Firebase, this file:
//   - can be unit-tested in plain Node,
//   - runs identically on web, Capacitor, and React Native,
//   - is the reference you'd port to Swift/Kotlin if you ever go native.
//
// The storage modules (cashflow.js, debt.js, assets.js, projection.js) fetch
// your saved inputs and hand them to these functions to get the numbers.
// ---------------------------------------------------------------------------

const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

// ===========================================================================
// CASHFLOW  (Cashflow tab)
// ===========================================================================
// gross income -> minus CPF -> net take-home -> minus expenses & debt = surplus
//
// incomeItems / expenseItems: arrays of objects that each have an `amount`.
// cpfRate:     employee CPF fraction of gross (spreadsheet uses ~0.20).
// debtPayment: total monthly debt payment (from the Debt tab).
export function computeCashflow({ incomeItems = [], expenseItems = [], cpfRate = 0.2, debtPayment = 0 } = {}) {
  const gross = sum(incomeItems.map((i) => num(i.amount)));
  const cpf = gross * num(cpfRate);
  const net = gross - cpf;                       // net take-home (cash in hand)
  const expenses = sum(expenseItems.map((e) => num(e.amount)));
  const debt = num(debtPayment);
  const surplus = net - expenses - debt;         // "your weapon"
  const savingsRate = net > 0 ? surplus / net : 0;
  return { gross, cpf, net, expenses, debtPayment: debt, surplus, savingsRate };
}

// ===========================================================================
// DEBT  (Debt tab)
// ===========================================================================
// debts: [{ name, balance, annualRate, minPayment, extraPayment }]
//   annualRate as a fraction, e.g. 0.48 for 48%/yr.
//
// Returns the "leak" (interest/yr), total monthly payment, a rough months-to-
// clear, and the payoff ORDER. The spreadsheet's rule is avalanche: highest
// interest rate first (the moneylender almost always wins).
export function computeDebtStats(debts = []) {
  const list = debts.map((d) => ({
    name: d.name,
    balance: num(d.balance),
    annualRate: num(d.annualRate),
    minPayment: num(d.minPayment),
    extraPayment: num(d.extraPayment)
  }));
  const totalBalance = sum(list.map((d) => d.balance));
  const annualInterest = sum(list.map((d) => d.balance * d.annualRate)); // the leak
  const totalMonthlyPayment = sum(list.map((d) => d.minPayment + d.extraPayment));
  const monthsToClearRough = totalMonthlyPayment > 0 ? totalBalance / totalMonthlyPayment : null;
  const payoffOrder = [...list].sort((a, b) => b.annualRate - a.annualRate).map((d) => d.name);
  return { totalBalance, annualInterest, totalMonthlyPayment, monthsToClearRough, payoffOrder };
}

// Realistic month-by-month AVALANCHE simulation: pay every minimum, then throw
// all spare budget at the highest-rate debt until it's gone, then the next.
// Returns months to debt-free and total interest actually paid.
export function simulatePayoff({ debts = [], monthlyBudget = 0, maxMonths = 1200 } = {}) {
  const bal = debts.map((d) => ({
    name: d.name,
    balance: num(d.balance),
    rate: num(d.annualRate) / 12, // monthly rate
    min: num(d.minPayment)
  }));
  const budget = num(monthlyBudget);
  const totalMin = sum(bal.map((d) => d.min));
  let totalInterest = 0;
  let month = 0;

  const outstanding = () => bal.some((d) => d.balance > 0.01);
  // If the budget can't cover the minimums, the debt never clears.
  const feasible = budget >= totalMin || budget >= sum(bal.map((d) => d.balance));

  while (outstanding() && month < maxMonths && feasible) {
    month++;
    for (const d of bal) {
      if (d.balance > 0) {
        const interest = d.balance * d.rate;
        d.balance += interest;
        totalInterest += interest;
      }
    }
    let spare = budget;
    for (const d of bal) {              // minimums first
      if (d.balance > 0 && spare > 0) {
        const pay = Math.min(d.min, d.balance, spare);
        d.balance -= pay;
        spare -= pay;
      }
    }
    const order = [...bal].filter((d) => d.balance > 0).sort((a, b) => b.rate - a.rate);
    for (const d of order) {           // avalanche the rest
      if (spare <= 0) break;
      const pay = Math.min(spare, d.balance);
      d.balance -= pay;
      spare -= pay;
    }
  }
  return {
    monthsToDebtFree: outstanding() ? null : month,
    totalInterestPaid: totalInterest,
    feasible
  };
}

// ===========================================================================
// ASSETS / NET WORTH  (Assets tab)
// ===========================================================================
// assets: [{ name, category, value, liquid }]
//   liquid: "Yes"/"Sellable"/true  -> counted as liquid; "No"/false -> locked.
const isLiquid = (v) => {
  if (v === true) return true;
  const s = String(v).toLowerCase();
  return s === "yes" || s === "sellable" || s === "liquid" || s === "true";
};

export function computeNetWorth(assets = []) {
  const total = sum(assets.map((a) => num(a.value)));
  const liquid = sum(assets.filter((a) => isLiquid(a.liquid)).map((a) => num(a.value)));
  const byCategory = {};
  for (const a of assets) {
    const k = a.category || "Other";
    byCategory[k] = (byCategory[k] || 0) + num(a.value);
  }
  return { total, liquid, locked: total - liquid, byCategory };
}

// ===========================================================================
// RSU VESTING  (Assets tab -> RSU tracker)
// ===========================================================================
// vests: [{ vestDate: "YYYY-MM-DD", shares }]
//   priceUsd: share price in USD, usdSgd: FX rate, asOf: valuation date.
// value per vest = shares * priceUsd * usdSgd
// status: Vested (already), Next 12mo (within a year), Future (later).
export function computeRSU({ vests = [], priceUsd = 0, usdSgd = 0, asOf = new Date() } = {}) {
  const today = asOf instanceof Date ? asOf : new Date(asOf);
  const in12 = new Date(today);
  in12.setFullYear(in12.getFullYear() + 1);
  const px = num(priceUsd) * num(usdSgd);

  let totalShares = 0, vestedShares = 0, next12Shares = 0;
  let vestedValue = 0, unvestedValue = 0, next12Value = 0;

  const rows = vests.map((v) => {
    const d = new Date(v.vestDate);
    const shares = num(v.shares);
    const value = shares * px;
    let status;
    if (d <= today) status = "Vested";
    else if (d <= in12) status = "Next 12mo";
    else status = "Future";

    totalShares += shares;
    if (status === "Vested") { vestedShares += shares; vestedValue += value; }
    else {
      unvestedValue += value;
      if (status === "Next 12mo") { next12Shares += shares; next12Value += value; }
    }
    return { vestDate: v.vestDate, shares, status, value };
  });

  return {
    rows,
    totalShares,
    vestedShares,
    unvestedShares: totalShares - vestedShares,
    next12Shares,
    vestedValue,
    unvestedValue,
    monthlyRsuNext12: next12Value / 12 // feeds the Cashflow tab as RSU income
  };
}

// ===========================================================================
// FIRE PROJECTION  (Retirement tab)
// ===========================================================================
// Compounds your annual surplus year by year until you hit your FI number.
//   FI number = annualExpenses * (1/swr), inflated to the target age.
//   First `yearsDebtClearing` years contribute 0 (debt is killed first).
//   Growth uses a mid-year convention: (start + contribution/2) * return,
//   which matches the spreadsheet exactly.
export function projectFI({
  currentAge,
  targetAge,
  annualReturn,
  annualExpenses,
  inflation = 0,
  swr = 0.04,
  yearsDebtClearing = 0,
  annualSurplus,
  startingAssets = 0,
  maxAge = null
} = {}) {
  const fiNumber = num(annualExpenses) * (1 / num(swr)) * Math.pow(1 + num(inflation), num(targetAge) - num(currentAge));
  const stop = maxAge || num(currentAge) + 28;
  const rows = [];
  let balance = num(startingAssets);
  let ageReachFI = null;

  for (let age = num(currentAge); age <= stop; age++) {
    const yearIndex = age - num(currentAge) + 1;
    const contribution = yearIndex <= num(yearsDebtClearing) ? 0 : num(annualSurplus);
    const growth = (balance + contribution / 2) * num(annualReturn);
    const endBal = balance + contribution + growth;
    const reached = endBal >= fiNumber;
    if (reached && ageReachFI === null) ageReachFI = age;
    rows.push({ age, year: yearIndex, start: balance, contribution, growth, end: endBal, reachedFI: reached });
    balance = endBal;
  }
  return { fiNumber, rows, ageReachFI };
}

export default {
  computeCashflow,
  computeDebtStats,
  simulatePayoff,
  computeNetWorth,
  computeRSU,
  projectFI
};
