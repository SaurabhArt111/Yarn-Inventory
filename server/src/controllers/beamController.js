import { Beam } from '../models/Beam.js';
import { StockEntry } from '../models/StockEntry.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from '../services/auditService.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';
import * as beamService from '../services/beamService.js';
import { getStockBalance } from '../services/inventoryService.js';
import { calculateBeamWeightKg } from '../utils/inventoryMath.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const listBeams = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { tenant: req.tenantId };
  if (req.query.quality) filter.quality = req.query.quality;
  if (req.query.shadeId) filter.shadeId = req.query.shadeId;
  if (req.query.party) filter.party = req.query.party;
  if (req.query.company) filter.company = req.query.company;
  if (req.query.lotNo) filter.lotNo = { $regex: escapeRegex(req.query.lotNo), $options: 'i' };
  if (req.query.search) {
    filter.$or = [
      { reference: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { lotNo: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { qualityName: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { partyName: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { challanNo: { $regex: escapeRegex(req.query.search), $options: 'i' } },
    ];
  }
  if (req.query.from || req.query.to) {
    filter.productionDate = {};
    if (req.query.from) filter.productionDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.productionDate.$lte = new Date(req.query.to);
  }

  const sortBy = req.query.sortBy || 'productionDate';
  const sortDir = req.query.sortDir === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    Beam.find(filter).sort({ [sortBy]: sortDir }).skip(skip).limit(limit).lean(),
    Beam.countDocuments(filter),
  ]);

  res.json({ items, meta: buildPageMeta({ page, limit, total }) });
});

export const getBeam = catchAsync(async (req, res) => {
  const beam = await Beam.findOne({ _id: req.params.id, tenant: req.tenantId }).lean();
  if (!beam) throw ApiError.notFound('Beam not found');

  const sourceStock = await StockEntry.findOne({ _id: beam.sourceStockEntry, tenant: req.tenantId }).lean();
  const balanceNow = sourceStock ? await getStockBalance(req.tenantId, sourceStock._id) : null;

  // Reconstruct "consumed before / remaining after" this specific beam by
  // replaying the ledger up to and excluding/including this beam's entry --
  // gives full point-in-time traceability, not just the current balance.
  const { InventoryTransaction } = await import('../models/InventoryTransaction.js');
  const { computeBalanceFromLedger } = await import('../utils/inventoryMath.js');
  const movements = await InventoryTransaction.find({ tenant: req.tenantId, stockEntry: beam.sourceStockEntry })
    .sort({ createdAt: 1 })
    .lean();

  let before = [];
  let consumedBefore = 0;
  let remainingAfter = null;
  let consumedConesBefore = 0;
  let remainingConesAfter = null;
  for (const m of movements) {
    if (String(m.beam) === String(beam._id) && m.type === 'beam_consumption') {
      const bal = computeBalanceFromLedger(before);
      consumedBefore = bal.consumed;
      consumedConesBefore = bal.consumedCones;
      const balAfter = computeBalanceFromLedger([...before, m]);
      remainingAfter = balAfter.remaining;
      remainingConesAfter = balAfter.remainingCones;
      break;
    }
    before.push(m);
  }

  res.json({
    item: beam,
    traceability: {
      sourceStockEntry: sourceStock,
      sourceStockOriginalWeightKg: sourceStock?.netWeightKg ?? null,
      sourceStockOriginalCones: sourceStock?.totalCones ?? null,
      sourceStockConsumedBeforeThisBeamKg: consumedBefore,
      sourceStockConsumedBeforeThisBeamCones: consumedConesBefore,
      sourceStockRemainingAfterThisBeamKg: remainingAfter,
      sourceStockRemainingAfterThisBeamCones: remainingConesAfter,
      sourceStockCurrentRemainingKg: balanceNow?.remaining ?? null,
      sourceStockCurrentRemainingCones: balanceNow?.remainingCones ?? null,
    },
  });
});

// Live-calculation preview endpoint -- lets the frontend show
// "Calculated Beam Weight" using the exact backend formula (rather than
// duplicating the formula client-side and risking drift), without creating
// anything. Still, the real create endpoint recalculates independently.
export const previewBeamWeight = catchAsync(async (req, res, next) => {
  try {
    const { ends, meter, finalDenier } = req.query;
    const beamWeightKg = calculateBeamWeightKg({
      ends: Number(ends),
      meter: Number(meter),
      finalDenier: Number(finalDenier),
    });
    res.json({ beamWeightKg });
  } catch (err) {
    next(ApiError.badRequest(err.message));
  }
});

export const createBeam = catchAsync(async (req, res) => {
  const { beam, balanceBefore } = await beamService.createBeam({
    tenantId: req.tenantId,
    userId: req.user._id,
    input: req.body,
  });
  await beamService.attachAuditForBeamCreation(req, beam);
  res.status(201).json({ item: beam, balanceBefore });
});

export const updateBeam = catchAsync(async (req, res) => {
  const beam = await Beam.findOneAndUpdate(
    { _id: req.params.id, tenant: req.tenantId, status: 'active' },
    { $set: { ...req.body, updatedBy: req.user._id } },
    { new: true, runValidators: true }
  );
  if (!beam) throw ApiError.notFound('Beam not found');
  await recordAudit({ req, action: 'beam.updated', entityType: 'Beam', entityId: beam._id, metadata: req.body });
  res.json({ item: beam });
});

export const cancelBeam = catchAsync(async (req, res) => {
  const beam = await beamService.cancelBeam({
    tenantId: req.tenantId,
    userId: req.user._id,
    beamId: req.params.id,
    reason: req.body.reason,
  });
  await recordAudit({ req, action: 'beam.cancelled', entityType: 'Beam', entityId: beam._id, metadata: { reason: req.body.reason } });
  res.json({ item: beam });
});
