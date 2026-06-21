// projection.js
// ---------------------------------------------------------------------------
// Retirement / FIRE tab. This is PURE projection (math), so there's nothing to
// store — it reads your assumptions from settings and computes the year-by-year
// path to financial freedom.
//
//   const p = await projection.run();      // uses your saved settings
//   p.fiNumber     -> what you need invested to be free
//   p.ageReachFI   -> the honest answer (your sheet: 36)
//   p.rows         -> [{ age, contribution, growth, end, reachedFI }, ...]
//
// You can also pass overrides for what-if scenarios:
//   await projection.run({ annualReturn:0.05, annualSurplus:60000 });
// ---------------------------------------------------------------------------

import { projectFI } from "./calc.js";
import { financeSettings } from "./settings.js";

export const projection = {
  /** Run the projection from saved settings, with optional overrides. */
  async run(overrides = {}) {
    const s = await financeSettings.get();
    const params = {
      currentAge: s.currentAge,
      targetAge: s.targetAge,
      annualReturn: s.annualReturn,
      annualExpenses: s.annualExpenses ?? overrides.annualExpenses ?? 0,
      inflation: s.inflation,
      swr: s.swr,
      yearsDebtClearing: s.yearsDebtClearing,
      annualSurplus: s.annualSurplus ?? overrides.annualSurplus ?? 0,
      startingAssets: s.startingAssets,
      ...overrides
    };
    if (params.currentAge == null || params.targetAge == null) {
      throw new Error("projection: set currentAge and targetAge in settings first.");
    }
    return projectFI(params);
  },

  /** Direct access to the pure function for fully manual inputs. */
  compute: projectFI
};

export default projection;
