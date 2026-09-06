import { Parser as CsvParser } from 'json2csv';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { StockEntry } from '../models/StockEntry.js';
import { Beam } from '../models/Beam.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { getStockBalancesBulk } from './inventoryService.js';

function oid(id) {
  return new mongoose.Types.ObjectId(id);
}

function buildDateMatch(from, to) {
  const m = {};
  if (from) m.$gte = new Date(from);
  if (to) m.$lte = new Date(to);
  return Object.keys(m).length ? m : undefined;
}

function commonFilters(tenantId, query) {
  const match = { tenant: oid(tenantId) };
  if (query.quality) match.quality = oid(query.quality);
  if (query.party) match.party = oid(query.party);
  if (query.company) match.company = oid(query.company);
  if (query.lotNo) match.lotNo = query.lotNo;
  return match;
}

export async function buildStockReportRows(tenantId, query) {
  const match = commonFilters(tenantId, query);
  match.status = 'active';
  const dateMatch = buildDateMatch(query.from, query.to);
  if (dateMatch) match.date = dateMatch;

  const entries = await StockEntry.find(match).sort({ date: -1 }).lean();
  const balances = await getStockBalancesBulk(tenantId, entries.map((e) => e._id));

  return entries.map((e) => {
    const b = balances.get(String(e._id));
    return {
      Reference: e.reference,
      Date: formatDate(e.date),
      'Challan No': e.challanNo,
      Quality: e.qualityName,
      Shade: e.shadeNo,
      Lot: e.lotNo,
      Party: e.partyName,
      Company: e.companyName,
      Box: e.box,
      'Total Cones': e.totalCones,
      'Net Weight (KG)': e.netWeightKg,
      'Consumed (KG)': b?.consumed ?? 0,
      'Remaining (KG)': b?.remaining ?? e.netWeightKg,
      'Consumed Cones': b?.consumedCones ?? 0,
      'Remaining Cones': b?.remainingCones ?? e.totalCones,
      Remarks: e.remarks,
    };
  });
}

export async function buildBeamReportRows(tenantId, query) {
  const match = commonFilters(tenantId, query);
  match.status = 'active';
  const dateMatch = buildDateMatch(query.from, query.to);
  if (dateMatch) match.productionDate = dateMatch;

  const beams = await Beam.find(match).sort({ productionDate: -1 }).lean();
  return beams.map((b) => ({
    'Beam No': b.reference,
    'Production Date': formatDate(b.productionDate),
    'Challan No': b.challanNo,
    Quality: b.qualityName,
    Shade: b.shadeNo,
    Lot: b.lotNo,
    Party: b.partyName,
    Company: b.companyName,
    Ends: b.ends,
    'Final Denier': b.finalDenier,
    Meter: b.meter,
    'Beam Weight (KG)': b.beamWeightKg,
    'Cones Used': b.consumedCones,
    Width: b.width,
    Pipes: b.pipes,
    Remarks: b.remarks,
  }));
}

export async function buildInventoryReportRows(tenantId, query) {
  const match = { tenant: oid(tenantId) };
  const dateMatch = buildDateMatch(query.from, query.to);
  if (dateMatch) match.createdAt = dateMatch;

  const movements = await InventoryTransaction.find(match)
    .sort({ createdAt: -1 })
    .populate('stockEntry', 'reference qualityName shadeNo lotNo')
    .lean();

  return movements.map((m) => ({
    Date: formatDate(m.createdAt),
    Type: m.type,
    'Stock Reference': m.stockEntry?.reference || '',
    Quality: m.stockEntry?.qualityName || '',
    Shade: m.stockEntry?.shadeNo || '',
    Lot: m.stockEntry?.lotNo || '',
    'Quantity (KG)': m.quantityKg,
    Note: m.note || '',
  }));
}

export async function buildPartyReportRows(tenantId, query) {
  return buildDimensionReportRows(tenantId, 'party', query, 'partyName', 'Party');
}
export async function buildCompanyReportRows(tenantId, query) {
  return buildDimensionReportRows(tenantId, 'company', query, 'companyName', 'Company');
}
export async function buildQualityReportRows(tenantId, query) {
  return buildDimensionReportRows(tenantId, 'quality', query, 'qualityName', 'Quality');
}

async function buildDimensionReportRows(tenantId, field, query, nameField, label) {
  const match = { tenant: oid(tenantId), status: 'active' };
  const dateMatch = buildDateMatch(query.from, query.to);
  if (dateMatch) match.date = dateMatch;

  const entries = await StockEntry.find(match).lean();
  const balances = await getStockBalancesBulk(tenantId, entries.map((e) => e._id));

  const byEntity = new Map();
  for (const e of entries) {
    const key = String(e[field]);
    if (!byEntity.has(key)) {
      byEntity.set(key, { name: e[nameField], received: 0, consumed: 0, remaining: 0, stockCount: 0 });
    }
    const agg = byEntity.get(key);
    const b = balances.get(String(e._id));
    agg.received += b?.received || 0;
    agg.consumed += b?.consumed || 0;
    agg.remaining += b?.remaining || 0;
    agg.stockCount += 1;
  }

  const beamMatch = { tenant: oid(tenantId), status: 'active' };
  if (dateMatch) beamMatch.productionDate = dateMatch;
  const beamCounts = await Beam.aggregate([
    { $match: beamMatch },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  const beamByEntity = new Map(beamCounts.map((r) => [String(r._id), r.count]));

  return Array.from(byEntity.entries()).map(([id, agg]) => ({
    [label]: agg.name,
    'Stock Entries': agg.stockCount,
    'Total Received (KG)': round2(agg.received),
    'Total Consumed (KG)': round2(agg.consumed),
    'Remaining (KG)': round2(agg.remaining),
    'Total Beams': beamByEntity.get(id) || 0,
  }));
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

export function rowsToCsv(rows) {
  if (!rows.length) return '';
  const parser = new CsvParser({ fields: Object.keys(rows[0]) });
  return parser.parse(rows);
}

export async function rowsToExcelBuffer(rows, sheetName = 'Report') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  if (rows.length) {
    sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: Math.max(14, key.length + 2) }));
    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true };
  }
  return workbook.xlsx.writeBuffer();
}
