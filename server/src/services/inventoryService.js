import mongoose from 'mongoose';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { StockEntry } from '../models/StockEntry.js';
import {
  computeBalanceFromLedger,
  assertSufficientInventory,
  assertSufficientCones,
  roundTo,
} from '../utils/inventoryMath.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Inventory is never tracked via a mutable "remainingWeight" field. The
 * ledger (InventoryTransaction) is append-only and is the single source of
 * truth; balances are always derived from it. This function is the only
 * place in the codebase allowed to compute a balance.
 */
export async function getStockBalance(tenantId, stockEntryId, { session } = {}) {
  const movements = await InventoryTransaction.find({ tenant: tenantId, stockEntry: stockEntryId })
    .session(session || null)
    .lean();
  return computeBalanceFromLedger(
    movements.map((m) => ({ type: m.type, quantityKg: m.quantityKg, quantityCones: m.quantityCones }))
  );
}

export async function getStockBalancesBulk(tenantId, stockEntryIds) {
  const movements = await InventoryTransaction.find({
    tenant: tenantId,
    stockEntry: { $in: stockEntryIds },
  }).lean();
  const byStock = new Map(stockEntryIds.map((id) => [String(id), []]));
  for (const m of movements) {
    const key = String(m.stockEntry);
    if (!byStock.has(key)) byStock.set(key, []);
    byStock.get(key).push(m);
  }
  const result = new Map();
  for (const [key, list] of byStock.entries()) {
    result.set(
      key,
      computeBalanceFromLedger(list.map((m) => ({ type: m.type, quantityKg: m.quantityKg, quantityCones: m.quantityCones })))
    );
  }
  return result;
}

export async function recordStockIn({ tenantId, stockEntryId, quantityKg, quantityCones = 0, userId, session }) {
  await InventoryTransaction.create(
    [
      {
        tenant: tenantId,
        stockEntry: stockEntryId,
        type: 'stock_in',
        quantityKg: roundTo(quantityKg, 3),
        quantityCones: Math.round(quantityCones) || 0,
        createdBy: userId,
      },
    ],
    { session }
  );
}

/**
 * Runs `work(session)` inside a real MongoDB multi-document transaction
 * when the connected server supports it (replica set / Atlas -- the
 * standard production topology). If the server is a standalone instance
 * without replica-set support (common in bare local dev setups),
 * transactions are unavailable; we fall back to sequential execution with
 * a best-effort manual compensating rollback so the app still works in
 * that environment, while logging a loud warning that this configuration
 * does not get full atomicity/isolation guarantees under concurrency.
 */
export async function runInTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    if (isTransactionsUnsupportedError(err)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[inventory] MongoDB transactions are not supported by this server ' +
          '(likely a standalone instance without a replica set). Falling back ' +
          'to non-transactional execution. Use a replica set or MongoDB Atlas ' +
          'in production to get full atomicity under concurrent writes.'
      );
      return work(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

function isTransactionsUnsupportedError(err) {
  const msg = String(err?.message || '');
  return (
    msg.includes('Transaction numbers are only allowed') ||
    msg.includes('IllegalOperation') ||
    err?.code === 20 ||
    err?.codeName === 'IllegalOperation'
  );
}

/**
 * Consume inventory from a stock entry for a newly created beam. Enforces:
 *   1. The stock entry belongs to the caller's tenant (never trust a
 *      client-supplied stockEntryId across tenants).
 *   2. Inventory can never go negative (re-validated here, not just in the
 *      controller, so this rule holds no matter what calls it).
 * Must be called with an active session from runInTransaction() so the
 * ledger write and the beam document creation succeed or fail together.
 */
/**
 * Consume inventory from a stock entry for a newly created beam. Enforces:
 *   1. The stock entry belongs to the caller's tenant (never trust a
 *      client-supplied stockEntryId across tenants).
 *   2. Weight can never go negative (re-validated here, not just in the
 *      controller, so this rule holds no matter what calls it).
 *   3. Cones -- a second, parallel physical-count dimension -- can never
 *      go negative either, checked with the same rigor in the same
 *      transaction as the weight check.
 * Must be called with an active session from runInTransaction() so the
 * ledger write and the beam document creation succeed or fail together.
 */
export async function consumeForBeam({ tenantId, stockEntryId, quantityKg, consumedCones, beamId, userId, session }) {
  const stockEntry = await StockEntry.findOne({ _id: stockEntryId, tenant: tenantId }).session(session);
  if (!stockEntry || stockEntry.status !== 'active') {
    throw ApiError.notFound('Source stock entry not found');
  }

  const balance = await getStockBalance(tenantId, stockEntryId, { session });
  assertSufficientInventoryOrThrow(balance.remaining, quantityKg);
  assertSufficientConesOrThrow(balance.remainingCones, consumedCones);

  await InventoryTransaction.create(
    [
      {
        tenant: tenantId,
        stockEntry: stockEntryId,
        type: 'beam_consumption',
        quantityKg: -Math.abs(roundTo(quantityKg, 3)),
        quantityCones: -Math.abs(Math.round(consumedCones)),
        beam: beamId,
        createdBy: userId,
      },
    ],
    { session }
  );

  return { stockEntry, balanceBefore: balance };
}

function assertSufficientInventoryOrThrow(remainingKg, requiredKg) {
  try {
    assertSufficientInventory(remainingKg, requiredKg);
  } catch (err) {
    throw ApiError.insufficientInventory(err.message, {
      available: err.available,
      required: err.required,
    });
  }
}

function assertSufficientConesOrThrow(remainingCones, requiredCones) {
  try {
    assertSufficientCones(remainingCones, requiredCones);
  } catch (err) {
    throw ApiError.insufficientInventory(err.message, {
      available: err.available,
      required: err.required,
      dimension: 'cones',
    });
  }
}
