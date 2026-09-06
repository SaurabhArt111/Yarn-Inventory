// Pure business-logic functions with zero database/framework dependencies.
// Keeping these isolated means the most safety-critical rules in the whole
// system (beam weight formula, over-consumption prevention) can be unit
// tested directly, and are guaranteed to be evaluated identically wherever
// they're called from (API controllers, seed scripts, reports).

export const BEAM_WEIGHT_DIVISOR = 9_000_000;

/**
 * Beam Weight (KG) = (Ends x Meter x Final Denier) / 9,000,000
 * This MUST be recalculated on the backend for every beam creation/edit;
 * any frontend-supplied value is for UX display only and is never trusted.
 */
export function calculateBeamWeightKg({ ends, meter, finalDenier }) {
  for (const [label, value] of Object.entries({ ends, meter, finalDenier })) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid value for "${label}": must be a positive number`);
    }
  }
  const raw = (ends * meter * finalDenier) / BEAM_WEIGHT_DIVISOR;
  return roundTo(raw, 3);
}

export function roundTo(value, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Given the ledger of movements for a stock entry (positive = stock in,
 * negative = consumption/adjustment), compute consumed and remaining.
 * This is the single source of truth for balances; nothing should ever
 * derive balance by mutating a `remainingWeight` field directly.
 *
 * Cones are tracked as a second, parallel physical count alongside weight
 * (a stock entry arrives as N cones totalling X KG; each beam consumes some
 * number of cones as well as some KG). `quantityCones` on a movement is
 * optional and defaults to 0 so existing weight-only movements still work.
 */
export function computeBalanceFromLedger(movements) {
  let received = 0;
  let consumed = 0;
  let adjustments = 0;
  let receivedCones = 0;
  let consumedCones = 0;
  let adjustmentCones = 0;

  for (const m of movements) {
    const cones = Number(m.quantityCones) || 0;
    if (m.type === 'stock_in') {
      received += m.quantityKg;
      receivedCones += cones;
    } else if (m.type === 'beam_consumption') {
      consumed += Math.abs(m.quantityKg);
      consumedCones += Math.abs(cones);
    } else if (m.type === 'adjustment' || m.type === 'reversal') {
      adjustments += m.quantityKg;
      adjustmentCones += cones;
    }
  }

  const remaining = roundTo(received - consumed + adjustments, 3);
  const remainingCones = Math.round(receivedCones - consumedCones + adjustmentCones);

  return {
    received: roundTo(received, 3),
    consumed: roundTo(consumed, 3),
    adjustments: roundTo(adjustments, 3),
    remaining,
    receivedCones: Math.round(receivedCones),
    consumedCones: Math.round(consumedCones),
    remainingCones,
  };
}

/**
 * Guard used before any beam is created: inventory must never go negative.
 * A small epsilon absorbs floating point rounding noise (e.g. 0.0000001kg)
 * without allowing genuine over-consumption.
 */
const EPSILON_KG = 0.001;

export function assertSufficientInventory(remainingKg, requiredKg) {
  if (requiredKg - remainingKg > EPSILON_KG) {
    const err = new Error(
      `Insufficient inventory: available ${roundTo(remainingKg, 3)} KG, required ${roundTo(
        requiredKg,
        3
      )} KG`
    );
    err.code = 'INSUFFICIENT_INVENTORY';
    err.available = roundTo(remainingKg, 3);
    err.required = roundTo(requiredKg, 3);
    throw err;
  }
  return true;
}

/**
 * Cones are a whole-number physical count, tracked as a second inventory
 * dimension alongside weight. The same non-negotiable rule applies: cone
 * count can never go negative, so this must be checked with the same rigor
 * as the weight guard above, inside the same atomic transaction.
 */
export function assertSufficientCones(remainingCones, requiredCones) {
  const remaining = Math.round(remainingCones);
  const required = Math.round(requiredCones);
  if (required - remaining > 0) {
    const err = new Error(`Insufficient cones: available ${remaining}, required ${required}`);
    err.code = 'INSUFFICIENT_CONES';
    err.available = remaining;
    err.required = required;
    throw err;
  }
  return true;
}
