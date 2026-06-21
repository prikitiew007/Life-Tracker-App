// assets.js
// ---------------------------------------------------------------------------
// Assets tab. Two things live here:
//   1. assets        -> what you own (cash, CPF, stocks...) for net worth
//   2. RSU vesting   -> your share vesting schedule, valued at price x FX
//
//   await assets.add({ name:"Cash savings", category:"Cash", value:200, liquid:"Yes" });
//   const nw = await assets.netWorth();      // { total, liquid, locked, byCategory }
//
//   await assets.addVest({ vestDate:"2026-07-15", shares:4 });
//   const rsu = await assets.rsuSummary();   // pulls price/FX from settings
// ---------------------------------------------------------------------------

import { makeStore } from "./_store.js";
import { computeNetWorth, computeRSU } from "./calc.js";
import { financeSettings } from "./settings.js";

// ---- Asset holdings ----
function prepareAsset(input = {}) {
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("assets: `name` is required.");
  return {
    name,
    category: (input.category ?? "Other").trim(),
    value: Number(input.value) || 0,
    liquid: input.liquid ?? "No",   // "Yes" / "No" / "Sellable"
    notes: (input.notes ?? "").trim()
  };
}
const store = makeStore("assets", prepareAsset);

/** Net worth across all assets. */
store.netWorth = async function netWorth() {
  return computeNetWorth(await store.list({ max: 500 }));
};

// ---- RSU vesting schedule (separate collection) ----
function prepareVest(input = {}) {
  if (!input.vestDate) throw new Error("assets: vest `vestDate` (YYYY-MM-DD) is required.");
  return {
    vestDate: input.vestDate,
    shares: Number(input.shares) || 0,
    notes: (input.notes ?? "").trim()
  };
}
const vestStore = makeStore("rsuVests", prepareVest);

store.addVest = (input) => vestStore.add(input);
store.listVests = (opts) => vestStore.list(opts);
store.removeVest = (id) => vestStore.remove(id);

/**
 * RSU valuation + vested/unvested/next-12-month breakdown.
 * priceUsd/usdSgd default to your settings; override for what-ifs.
 */
store.rsuSummary = async function rsuSummary({ priceUsd = null, usdSgd = null, asOf = new Date() } = {}) {
  const s = await financeSettings.get();
  const vests = await vestStore.list({ max: 500 });
  return computeRSU({
    vests,
    priceUsd: priceUsd != null ? priceUsd : s.rsuPriceUsd,
    usdSgd: usdSgd != null ? usdSgd : s.usdSgd,
    asOf
  });
};

export const assets = store;
export default assets;
