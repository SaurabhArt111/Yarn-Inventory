import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBeamWeightKg,
  computeBalanceFromLedger,
  assertSufficientInventory,
  assertSufficientCones,
} from '../src/utils/inventoryMath.js';

describe('calculateBeamWeightKg', () => {
  test('matches the spec example exactly: 20000 x 2400 x 30 / 9,000,000 = 160', () => {
    const result = calculateBeamWeightKg({ ends: 20000, meter: 2400, finalDenier: 30 });
    assert.equal(result, 160);
  });

  test('rounds to 3 decimal places', () => {
    const result = calculateBeamWeightKg({ ends: 12345, meter: 1000, finalDenier: 40 });
    // 12345 * 1000 * 40 / 9,000,000 = 54.8666...
    assert.equal(result, 54.867);
  });

  test('rejects zero or negative inputs', () => {
    assert.throws(() => calculateBeamWeightKg({ ends: 0, meter: 100, finalDenier: 30 }));
    assert.throws(() => calculateBeamWeightKg({ ends: 100, meter: -5, finalDenier: 30 }));
  });

  test('rejects non-numeric inputs', () => {
    assert.throws(() => calculateBeamWeightKg({ ends: '20000', meter: 2400, finalDenier: 30 }));
    assert.throws(() => calculateBeamWeightKg({ ends: 20000, meter: NaN, finalDenier: 30 }));
  });
});

describe('computeBalanceFromLedger', () => {
  test('single stock-in with no consumption', () => {
    const balance = computeBalanceFromLedger([{ type: 'stock_in', quantityKg: 500 }]);
    assert.deepEqual(balance, {
      received: 500,
      consumed: 0,
      adjustments: 0,
      remaining: 500,
      receivedCones: 0,
      consumedCones: 0,
      remainingCones: 0,
    });
  });

  test('stock-in followed by multiple beam consumptions (spec example)', () => {
    const balance = computeBalanceFromLedger([
      { type: 'stock_in', quantityKg: 500 },
      { type: 'beam_consumption', quantityKg: -160 },
      { type: 'beam_consumption', quantityKg: -150 },
      { type: 'beam_consumption', quantityKg: -120 },
    ]);
    assert.equal(balance.remaining, 70);
    assert.equal(balance.consumed, 430);
  });

  test('adjustments are reflected in the running balance', () => {
    const balance = computeBalanceFromLedger([
      { type: 'stock_in', quantityKg: 500 },
      { type: 'beam_consumption', quantityKg: -160 },
      { type: 'beam_consumption', quantityKg: -140 },
      { type: 'adjustment', quantityKg: -10 },
    ]);
    assert.equal(balance.remaining, 190);
  });
});

describe('computeBalanceFromLedger - cones', () => {
  test('tracks cones received and consumed alongside weight', () => {
    const balance = computeBalanceFromLedger([
      { type: 'stock_in', quantityKg: 500, quantityCones: 100 },
      { type: 'beam_consumption', quantityKg: -160, quantityCones: -32 },
      { type: 'beam_consumption', quantityKg: -150, quantityCones: -30 },
    ]);
    assert.equal(balance.receivedCones, 100);
    assert.equal(balance.consumedCones, 62);
    assert.equal(balance.remainingCones, 38);
  });

  test('defaults quantityCones to 0 for movements that omit it (backward compatible)', () => {
    const balance = computeBalanceFromLedger([{ type: 'stock_in', quantityKg: 500 }]);
    assert.equal(balance.remainingCones, 0);
  });
});

describe('assertSufficientCones', () => {
  test('allows consumption when enough cones remain', () => {
    assert.doesNotThrow(() => assertSufficientCones(38, 30));
  });

  test('allows exact exhaustion', () => {
    assert.doesNotThrow(() => assertSufficientCones(30, 30));
  });

  test('rejects consuming more cones than remain', () => {
    assert.throws(() => assertSufficientCones(10, 12), /Insufficient cones/);
  });
});

describe('assertSufficientInventory', () => {
  test('allows consumption when inventory is sufficient', () => {
    assert.doesNotThrow(() => assertSufficientInventory(340, 160));
  });

  test('allows consumption that exactly exhausts inventory', () => {
    assert.doesNotThrow(() => assertSufficientInventory(160, 160));
  });

  test('rejects over-consumption (spec example: 100 available, 120 required)', () => {
    assert.throws(() => assertSufficientInventory(100, 120), /Insufficient inventory/);
  });

  test('never allows inventory to go negative even by a small margin', () => {
    assert.throws(() => assertSufficientInventory(0, 0.5));
  });

  test('tolerates floating point noise below the epsilon', () => {
    assert.doesNotThrow(() => assertSufficientInventory(160.0000001, 160));
  });
});
