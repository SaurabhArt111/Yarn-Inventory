import mongoose from 'mongoose';
import { StockEntry } from '../models/StockEntry.js';
import { Beam } from '../models/Beam.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { Quality } from '../models/Quality.js';

function oid(id) {
  return new mongoose.Types.ObjectId(id);
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function dateFilter({ from, to }) {
  const filter = {};
  if (from) filter.$gte = new Date(from);
  if (to) filter.$lte = new Date(to);
  return Object.keys(filter).length ? filter : undefined;
}

/**
 * Business-level overview: trends over time plus top qualities. All
 * numbers come from real aggregation over StockEntry / Beam / the
 * inventory ledger -- there is no decorative/fake data here.
 */
export async function getOverview(tenantId, { from, to } = {}) {
  const tenant = oid(tenantId);
  const dateMatch = dateFilter({ from, to });

  const stockMatch = { tenant, status: 'active' };
  if (dateMatch) stockMatch.date = dateMatch;

  const beamMatch = { tenant, status: 'active' };
  if (dateMatch) beamMatch.productionDate = dateMatch;

  const [stockReceivedOverTime, productionOverTime, consumptionOverTime, topQualities, ledgerTotals] =
    await Promise.all([
      StockEntry.aggregate([
        { $match: stockMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            weightKg: { $sum: '$netWeightKg' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Beam.aggregate([
        { $match: beamMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$productionDate' } },
            weightKg: { $sum: '$beamWeightKg' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      InventoryTransaction.aggregate([
        { $match: { tenant, type: 'beam_consumption', ...(dateMatch ? { createdAt: dateMatch } : {}) } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            weightKg: { $sum: { $abs: '$quantityKg' } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      StockEntry.aggregate([
        { $match: stockMatch },
        { $group: { _id: '$quality', name: { $first: '$qualityName' }, receivedKg: { $sum: '$netWeightKg' } } },
        { $sort: { receivedKg: -1 } },
        { $limit: 5 },
      ]),
      InventoryTransaction.aggregate([
        { $match: { tenant } },
        { $group: { _id: '$type', total: { $sum: '$quantityKg' } } },
      ]),
    ]);

  let received = 0;
  let consumed = 0;
  let adj = 0;
  for (const row of ledgerTotals) {
    if (row._id === 'stock_in') received += row.total;
    else if (row._id === 'beam_consumption') consumed += Math.abs(row.total);
    else adj += row.total;
  }

  return {
    stockReceivedOverTime: stockReceivedOverTime.map((r) => ({ date: r._id, weightKg: round2(r.weightKg), count: r.count })),
    productionOverTime: productionOverTime.map((r) => ({ date: r._id, weightKg: round2(r.weightKg), count: r.count })),
    consumptionOverTime: consumptionOverTime.map((r) => ({ date: r._id, weightKg: round2(r.weightKg) })),
    topQualities: topQualities.map((r) => ({ id: r._id, name: r.name, receivedKg: round2(r.receivedKg) })),
    remainingInventoryKg: round2(received - consumed + adj),
  };
}

const DIMENSION_FIELD = { quality: 'quality', party: 'party', company: 'company' };

/**
 * Shared drill-down analysis for a single quality / party / operational
 * company. Returns totals, related-dimension breakdowns, and full history
 * so the frontend can render both summary cards and detailed record lists.
 */
export async function analyzeDimension(tenantId, dimension, entityId) {
  const field = DIMENSION_FIELD[dimension];
  if (!field) throw new Error(`Unknown analysis dimension: ${dimension}`);

  const tenant = oid(tenantId);
  const match = { tenant, [field]: oid(entityId), status: 'active' };

  const [stockEntries, beams] = await Promise.all([
    StockEntry.find(match).sort({ date: -1 }).lean(),
    Beam.find(match).sort({ productionDate: -1 }).lean(),
  ]);

  const stockIds = stockEntries.map((s) => s._id);
  const { getStockBalancesBulk } = await import('./inventoryService.js');
  const balances = await getStockBalancesBulk(tenantId, stockIds);

  let totalStockKg = 0;
  let consumedKg = 0;
  let remainingKg = 0;
  for (const s of stockEntries) {
    const b = balances.get(String(s._id));
    totalStockKg += b?.received || 0;
    consumedKg += b?.consumed || 0;
    remainingKg += b?.remaining || 0;
  }

  const qualities = new Set(stockEntries.map((s) => String(s.quality)));
  const shades = new Set(stockEntries.map((s) => String(s.shadeId)));
  const parties = new Set(stockEntries.map((s) => String(s.party)));
  const companies = new Set(stockEntries.map((s) => String(s.company)));

  // Monthly trend of production weight for this dimension.
  const dateTrends = await Beam.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$productionDate' } },
        weightKg: { $sum: '$beamWeightKg' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    summary: {
      totalStockKg: round2(totalStockKg),
      consumedKg: round2(consumedKg),
      remainingKg: round2(remainingKg),
      totalBeams: beams.length,
      ...(dimension !== 'quality' ? { qualityCount: qualities.size } : { shadeCount: shades.size }),
      shadeCount: shades.size,
      partyCount: parties.size,
      companyCount: companies.size,
    },
    dateTrends: dateTrends.map((r) => ({ month: r._id, weightKg: round2(r.weightKg), count: r.count })),
    stockHistory: stockEntries.map((s) => ({ ...s, balance: balances.get(String(s._id)) })),
    productionHistory: beams,
  };
}

export async function listEntityOptionsForAnalysis(tenantId, dimension) {
  if (dimension === 'quality') {
    return Quality.find({ tenant: tenantId, status: 'active' }).sort({ name: 1 }).select('name').lean();
  }
  const Model = dimension === 'party' ? (await import('../models/Party.js')).Party : (await import('../models/Company.js')).Company;
  return Model.find({ tenant: tenantId, status: 'active' }).sort({ name: 1 }).select('name').lean();
}
