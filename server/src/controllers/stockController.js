import { StockEntry } from '../models/StockEntry.js';
import { Beam } from '../models/Beam.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from '../services/auditService.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';
import * as stockService from '../services/stockService.js';
import { getStockBalance, getStockBalancesBulk } from '../services/inventoryService.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const listStockEntries = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { tenant: req.tenantId };
  if (req.query.quality) filter.quality = req.query.quality;
  if (req.query.party) filter.party = req.query.party;
  if (req.query.company) filter.company = req.query.company;
  if (req.query.lotNo) filter.lotNo = { $regex: escapeRegex(req.query.lotNo), $options: 'i' };
  if (req.query.search) {
    filter.$or = [
      { reference: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { challanNo: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { lotNo: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { qualityName: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { partyName: { $regex: escapeRegex(req.query.search), $options: 'i' } },
    ];
  }
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }

  const sortBy = req.query.sortBy || 'date';
  const sortDir = req.query.sortDir === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    StockEntry.find(filter).sort({ [sortBy]: sortDir }).skip(skip).limit(limit).lean(),
    StockEntry.countDocuments(filter),
  ]);

  const withBalances = await stockService.attachBalances(req.tenantId, items);
  res.json({ items: withBalances, meta: buildPageMeta({ page, limit, total }) });
});

export const getStockEntry = catchAsync(async (req, res) => {
  const stockEntry = await StockEntry.findOne({ _id: req.params.id, tenant: req.tenantId }).lean();
  if (!stockEntry) throw ApiError.notFound('Stock entry not found');

  const [balance, beams] = await Promise.all([
    getStockBalance(req.tenantId, stockEntry._id),
    Beam.find({ tenant: req.tenantId, sourceStockEntry: stockEntry._id }).sort({ createdAt: -1 }).lean(),
  ]);

  res.json({ item: { ...stockEntry, balance }, beams });
});

export const createStockEntry = catchAsync(async (req, res) => {
  const stockEntry = await stockService.createStockEntry({
    tenantId: req.tenantId,
    userId: req.user._id,
    input: req.body,
  });
  await recordAudit({
    req,
    action: 'stock.created',
    entityType: 'StockEntry',
    entityId: stockEntry._id,
    metadata: { reference: stockEntry.reference, netWeightKg: stockEntry.netWeightKg },
  });
  res.status(201).json({ item: stockEntry });
});

export const updateStockEntry = catchAsync(async (req, res) => {
  const stockEntry = await StockEntry.findOneAndUpdate(
    { _id: req.params.id, tenant: req.tenantId },
    { $set: { ...req.body, updatedBy: req.user._id } },
    { new: true, runValidators: true }
  );
  if (!stockEntry) throw ApiError.notFound('Stock entry not found');
  await recordAudit({ req, action: 'stock.updated', entityType: 'StockEntry', entityId: stockEntry._id, metadata: req.body });
  res.json({ item: stockEntry });
});

export const cancelStockEntry = catchAsync(async (req, res) => {
  const beamCount = await Beam.countDocuments({ tenant: req.tenantId, sourceStockEntry: req.params.id, status: 'active' });
  if (beamCount > 0) {
    throw ApiError.conflict('This stock entry has active beams produced from it and cannot be deleted/cancelled.');
  }
  const stockEntry = await StockEntry.findOneAndUpdate(
    { _id: req.params.id, tenant: req.tenantId },
    { $set: { status: 'cancelled', updatedBy: req.user._id } },
    { new: true }
  );
  if (!stockEntry) throw ApiError.notFound('Stock entry not found');
  await recordAudit({ req, action: 'stock.cancelled', entityType: 'StockEntry', entityId: stockEntry._id });
  res.json({ item: stockEntry });
});

// Lightweight list for the beam-production "select source stock" dropdown --
// only entries that still have remaining inventory.
export const listAvailableStock = catchAsync(async (req, res) => {
  const filter = { tenant: req.tenantId, status: 'active' };
  if (req.query.quality) filter.quality = req.query.quality;
  if (req.query.search) {
    filter.$or = [
      { reference: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { lotNo: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { qualityName: { $regex: escapeRegex(req.query.search), $options: 'i' } },
    ];
  }
  const items = await StockEntry.find(filter).sort({ date: -1 }).limit(100).lean();
  const balances = await getStockBalancesBulk(req.tenantId, items.map((s) => s._id));
  const available = items
    .map((s) => ({ ...s, balance: balances.get(String(s._id)) }))
    .filter((s) => (s.balance?.remaining || 0) > 0.001);
  res.json({ items: available });
});
