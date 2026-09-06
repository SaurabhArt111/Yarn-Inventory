import { Beam } from '../models/Beam.js';
import { StockEntry } from '../models/StockEntry.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { nextSequence, formatReference } from '../models/Counter.js';
import { calculateBeamWeightKg, assertSufficientCones } from '../utils/inventoryMath.js';
import { runInTransaction, consumeForBeam, getStockBalance } from './inventoryService.js';
import { recordAudit } from './auditService.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Creates a beam and consumes inventory from its source stock entry as a
 * single atomic unit of work (Section 19 of the brief):
 *   1. Recalculate beam weight server-side (never trust the client value).
 *   2. Load + validate the source stock entry belongs to this tenant.
 *   3. Verify sufficient available inventory (fresh read inside the
 *      transaction, so two concurrent requests can't both succeed against
 *      the same limited balance).
 *   4. Create the beam document.
 *   5. Record the consumption in the inventory ledger.
 *   6. Commit together, or roll back together on any failure.
 */
export async function createBeam({ tenantId, userId, input }) {
  const stockEntry = await StockEntry.findOne({ _id: input.sourceStockEntry, tenant: tenantId });
  if (!stockEntry || stockEntry.status !== 'active') {
    throw ApiError.notFound('Source stock entry not found');
  }

  // Backend-authoritative recalculation -- any clientCalculatedWeightKg is
  // discarded entirely and never persisted.
  const beamWeightKg = calculateBeamWeightKg({
    ends: input.ends,
    meter: input.meter,
    finalDenier: input.finalDenier,
  });

  const result = await runInTransaction(async (session) => {
    const { balanceBefore } = await consumeForBeamPreCheck({
      tenantId,
      stockEntryId: stockEntry._id,
      quantityKg: beamWeightKg,
      consumedCones: input.consumedCones,
      session,
    });

    const seq = await nextSequence(tenantId, 'beam', { session });
    const reference = formatReference('B', seq);

    const [beam] = await Beam.create(
      [
        {
          tenant: tenantId,
          reference,
          sourceStockEntry: stockEntry._id,
          productionDate: input.productionDate,
          challanNo: input.challanNo || stockEntry.challanNo,
          quality: stockEntry.quality,
          qualityName: stockEntry.qualityName,
          shadeId: stockEntry.shadeId,
          shadeNo: stockEntry.shadeNo,
          party: stockEntry.party,
          partyName: stockEntry.partyName,
          company: stockEntry.company,
          companyName: stockEntry.companyName,
          lotNo: input.lotNo || stockEntry.lotNo,
          ends: input.ends,
          finalDenier: input.finalDenier,
          meter: input.meter,
          beamWeightKg,
          consumedCones: input.consumedCones,
          width: input.width || '',
          pipes: input.pipes || '',
          remarks: input.remarks || '',
          createdBy: userId,
        },
      ],
      { session }
    );

    await consumeForBeam({
      tenantId,
      stockEntryId: stockEntry._id,
      quantityKg: beamWeightKg,
      consumedCones: input.consumedCones,
      beamId: beam._id,
      userId,
      session,
    });

    return { beam, balanceBefore };
  });

  return result;
}

// Pre-flight balance check performed before creating the beam document, so
// we fail fast with a clear error and never persist a beam that can't
// legitimately consume inventory. consumeForBeam() re-validates again right
// before writing the ledger entry, closing the race window between the two
// reads to the width of a single transaction.
async function consumeForBeamPreCheck({ tenantId, stockEntryId, quantityKg, consumedCones, session }) {
  const balanceBefore = await getStockBalance(tenantId, stockEntryId, { session });
  if (quantityKg - balanceBefore.remaining > 0.001) {
    throw ApiError.insufficientInventory(
      `Insufficient inventory: available ${balanceBefore.remaining} KG, required ${quantityKg} KG`,
      { available: balanceBefore.remaining, required: quantityKg }
    );
  }
  try {
    assertSufficientCones(balanceBefore.remainingCones, consumedCones);
  } catch (err) {
    throw ApiError.insufficientInventory(err.message, {
      available: err.available,
      required: err.required,
      dimension: 'cones',
    });
  }
  return { balanceBefore };
}

export async function cancelBeam({ tenantId, userId, beamId, reason }) {
  const beam = await Beam.findOne({ _id: beamId, tenant: tenantId });
  if (!beam) throw ApiError.notFound('Beam not found');
  if (beam.status === 'cancelled') throw ApiError.conflict('Beam is already cancelled');

  await runInTransaction(async (session) => {
    beam.status = 'cancelled';
    beam.cancelledReason = reason;
    beam.updatedBy = userId;
    await beam.save({ session });

    // Reverse the consumption by recording a positive ledger entry rather
    // than deleting the original beam_consumption row -- history is never
    // rewritten, only appended to.
    await InventoryTransaction.create(
      [
        {
          tenant: tenantId,
          stockEntry: beam.sourceStockEntry,
          type: 'reversal',
          quantityKg: Math.abs(beam.beamWeightKg),
          quantityCones: Math.abs(beam.consumedCones || 0),
          beam: beam._id,
          note: `Reversal for cancelled beam ${beam.reference}: ${reason}`,
          createdBy: userId,
        },
      ],
      { session }
    );
  });

  return beam;
}

export function attachAuditForBeamCreation(req, beam) {
  return recordAudit({
    req,
    action: 'beam.created',
    entityType: 'Beam',
    entityId: beam._id,
    metadata: {
      reference: beam.reference,
      beamWeightKg: beam.beamWeightKg,
      consumedCones: beam.consumedCones,
      sourceStockEntry: beam.sourceStockEntry,
    },
  });
}
