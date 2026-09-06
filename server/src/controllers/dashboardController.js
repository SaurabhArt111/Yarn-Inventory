import { Quality } from '../models/Quality.js';
import { Party } from '../models/Party.js';
import { Company } from '../models/Company.js';
import { StockEntry } from '../models/StockEntry.js';
import { Beam } from '../models/Beam.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { catchAsync } from '../utils/catchAsync.js';
import mongoose from 'mongoose';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const getDashboard = catchAsync(async (req, res) => {
  const tenant = new mongoose.Types.ObjectId(req.tenantId);
  const today = startOfToday();

  const [
    totalQualities,
    totalParties,
    totalCompanies,
    totalBeams,
    ledgerAgg,
    todayStockAgg,
    todayBeamsAgg,
  ] = await Promise.all([
    Quality.countDocuments({ tenant, status: 'active' }),
    Party.countDocuments({ tenant, status: 'active' }),
    Company.countDocuments({ tenant, status: 'active' }),
    Beam.countDocuments({ tenant, status: 'active' }),
    InventoryTransaction.aggregate([
      { $match: { tenant } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$quantityKg' },
        },
      },
    ]),
    StockEntry.aggregate([
      { $match: { tenant, date: { $gte: today }, status: 'active' } },
      { $group: { _id: null, weight: { $sum: '$netWeightKg' }, count: { $sum: 1 } } },
    ]),
    Beam.aggregate([
      { $match: { tenant, productionDate: { $gte: today }, status: 'active' } },
      { $group: { _id: null, weight: { $sum: '$beamWeightKg' }, count: { $sum: 1 } } },
    ]),
  ]);

  let totalStockWeight = 0;
  let totalConsumedWeight = 0;
  let netAdjustments = 0;
  for (const row of ledgerAgg) {
    if (row._id === 'stock_in') totalStockWeight += row.total;
    else if (row._id === 'beam_consumption') totalConsumedWeight += Math.abs(row.total);
    else netAdjustments += row.total;
  }
  const remainingInventory = round2(totalStockWeight - totalConsumedWeight + netAdjustments);

  res.json({
    kpis: {
      totalQualities,
      totalParties,
      totalCompanies,
      totalStockWeightKg: round2(totalStockWeight),
      totalConsumedWeightKg: round2(totalConsumedWeight),
      remainingInventoryKg: remainingInventory,
      totalBeams,
      todaysStock: {
        weightKg: round2(todayStockAgg[0]?.weight || 0),
        count: todayStockAgg[0]?.count || 0,
      },
      todaysProduction: {
        weightKg: round2(todayBeamsAgg[0]?.weight || 0),
        count: todayBeamsAgg[0]?.count || 0,
      },
    },
  });
});

// Section 23: quality summary cards on the dashboard.
export const getQualitySummaries = catchAsync(async (req, res) => {
  const tenant = new mongoose.Types.ObjectId(req.tenantId);

  const qualities = await Quality.find({ tenant, status: 'active' }).sort({ name: 1 }).lean();

  const stockAgg = await StockEntry.aggregate([
    { $match: { tenant, status: 'active' } },
    {
      $group: {
        _id: '$quality',
        totalReceivedKg: { $sum: '$netWeightKg' },
        totalReceivedCones: { $sum: '$totalCones' },
        stockCount: { $sum: 1 },
      },
    },
  ]);
  const consumedAgg = await InventoryTransaction.aggregate([
    { $match: { tenant, type: 'beam_consumption' } },
    {
      $lookup: {
        from: 'stockentries',
        localField: 'stockEntry',
        foreignField: '_id',
        as: 'stock',
      },
    },
    { $unwind: '$stock' },
    {
      $group: {
        _id: '$stock.quality',
        consumedKg: { $sum: { $abs: '$quantityKg' } },
        consumedCones: { $sum: { $abs: '$quantityCones' } },
      },
    },
  ]);
  const beamAgg = await Beam.aggregate([
    { $match: { tenant, status: 'active' } },
    { $group: { _id: '$quality', beamCount: { $sum: 1 } } },
  ]);

  const stockById = new Map(stockAgg.map((r) => [String(r._id), r]));
  const consumedById = new Map(consumedAgg.map((r) => [String(r._id), r]));
  const beamById = new Map(beamAgg.map((r) => [String(r._id), r]));

  const items = qualities.map((q) => {
    const stock = stockById.get(String(q._id));
    const consumed = consumedById.get(String(q._id));
    const beams = beamById.get(String(q._id));
    const received = round2(stock?.totalReceivedKg || 0);
    const consumedKg = round2(consumed?.consumedKg || 0);
    const receivedCones = Math.round(stock?.totalReceivedCones || 0);
    const consumedCones = Math.round(consumed?.consumedCones || 0);
    return {
      id: q._id,
      name: q.name,
      stockEntryCount: stock?.stockCount || 0,
      totalReceivedKg: received,
      consumedKg,
      remainingKg: round2(received - consumedKg),
      totalReceivedCones: receivedCones,
      consumedCones,
      remainingCones: receivedCones - consumedCones,
      beamCount: beams?.beamCount || 0,
      shadeCount: q.shades.length,
    };
  });

  res.json({ items });
});

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
