import { Quality } from '../models/Quality.js';
import { StockEntry } from '../models/StockEntry.js';
import { Beam } from '../models/Beam.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from '../services/auditService.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';

export const listQualities = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { tenant: req.tenantId };
  if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search), $options: 'i' };
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Quality.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Quality.countDocuments(filter),
  ]);

  res.json({ items, meta: buildPageMeta({ page, limit, total }) });
});

// Lightweight list for searchable dropdowns -- no pagination metadata,
// active only, capped result size.
export const listQualitiesForSelect = catchAsync(async (req, res) => {
  const filter = { tenant: req.tenantId, status: 'active' };
  if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search), $options: 'i' };
  const items = await Quality.find(filter).sort({ name: 1 }).limit(50).select('name shades').lean();
  res.json({ items });
});

export const getQuality = catchAsync(async (req, res) => {
  const quality = await Quality.findOne({ _id: req.params.id, tenant: req.tenantId }).lean();
  if (!quality) throw ApiError.notFound('Quality not found');
  res.json({ item: quality });
});

export const createQuality = catchAsync(async (req, res) => {
  const { name, shades } = req.body;
  const quality = await Quality.create({
    tenant: req.tenantId,
    name,
    shades: (shades || []).map((s) => ({ name: s })),
    createdBy: req.user._id,
  });
  await recordAudit({ req, action: 'quality.created', entityType: 'Quality', entityId: quality._id, metadata: { name } });
  res.status(201).json({ item: quality });
});

export const updateQuality = catchAsync(async (req, res) => {
  const quality = await Quality.findOneAndUpdate(
    { _id: req.params.id, tenant: req.tenantId },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!quality) throw ApiError.notFound('Quality not found');
  await recordAudit({ req, action: 'quality.updated', entityType: 'Quality', entityId: quality._id, metadata: req.body });
  res.json({ item: quality });
});

export const deleteQuality = catchAsync(async (req, res) => {
  const inUse = await StockEntry.exists({ tenant: req.tenantId, quality: req.params.id });
  if (inUse) {
    throw ApiError.conflict('This quality has stock entries and cannot be deleted. Deactivate it instead.');
  }
  const quality = await Quality.findOneAndDelete({ _id: req.params.id, tenant: req.tenantId });
  if (!quality) throw ApiError.notFound('Quality not found');
  await recordAudit({ req, action: 'quality.deleted', entityType: 'Quality', entityId: quality._id });
  res.json({ success: true });
});

export const addShade = catchAsync(async (req, res) => {
  const quality = await Quality.findOne({ _id: req.params.id, tenant: req.tenantId });
  if (!quality) throw ApiError.notFound('Quality not found');
  const dupe = quality.shades.find((s) => s.name.toLowerCase() === req.body.name.toLowerCase());
  if (dupe) throw ApiError.conflict('This shade already exists for this quality');
  quality.shades.push({ name: req.body.name });
  await quality.save();
  await recordAudit({ req, action: 'quality.shade_added', entityType: 'Quality', entityId: quality._id, metadata: { shade: req.body.name } });
  res.status(201).json({ item: quality });
});

export const updateShade = catchAsync(async (req, res) => {
  const quality = await Quality.findOne({ _id: req.params.id, tenant: req.tenantId });
  if (!quality) throw ApiError.notFound('Quality not found');
  const shade = quality.shades.id(req.params.shadeId);
  if (!shade) throw ApiError.notFound('Shade not found');
  if (req.body.name) shade.name = req.body.name;
  if (req.body.status) shade.status = req.body.status;
  await quality.save();
  await recordAudit({ req, action: 'quality.shade_updated', entityType: 'Quality', entityId: quality._id, metadata: { shadeId: req.params.shadeId, ...req.body } });
  res.json({ item: quality });
});

export const deleteShade = catchAsync(async (req, res) => {
  const inUse = await StockEntry.exists({ tenant: req.tenantId, shadeId: req.params.shadeId });
  if (inUse) throw ApiError.conflict('This shade has stock entries and cannot be deleted. Deactivate it instead.');
  const quality = await Quality.findOne({ _id: req.params.id, tenant: req.tenantId });
  if (!quality) throw ApiError.notFound('Quality not found');
  quality.shades.id(req.params.shadeId)?.deleteOne();
  await quality.save();
  await recordAudit({ req, action: 'quality.shade_deleted', entityType: 'Quality', entityId: quality._id, metadata: { shadeId: req.params.shadeId } });
  res.json({ item: quality });
});

// Detail / drill-down (Section 23-24 of the brief).
export const qualityDetail = catchAsync(async (req, res) => {
  const quality = await Quality.findOne({ _id: req.params.id, tenant: req.tenantId }).lean();
  if (!quality) throw ApiError.notFound('Quality not found');

  const stockFilter = { tenant: req.tenantId, quality: quality._id };
  const [stockEntries, beams] = await Promise.all([
    StockEntry.find(stockFilter).sort({ date: -1 }).lean(),
    Beam.find({ tenant: req.tenantId, quality: quality._id, status: 'active' }).sort({ productionDate: -1 }).lean(),
  ]);

  const { getStockBalancesBulk } = await import('../services/inventoryService.js');
  const balances = await getStockBalancesBulk(req.tenantId, stockEntries.map((s) => s._id));
  let received = 0;
  let consumed = 0;
  let remaining = 0;
  let receivedCones = 0;
  let consumedCones = 0;
  let remainingCones = 0;
  for (const s of stockEntries) {
    const b = balances.get(String(s._id));
    received += b?.received || 0;
    consumed += b?.consumed || 0;
    remaining += b?.remaining || 0;
    receivedCones += b?.receivedCones || 0;
    consumedCones += b?.consumedCones || 0;
    remainingCones += b?.remainingCones || 0;
  }

  const parties = new Set(stockEntries.map((s) => String(s.party)));
  const companies = new Set(stockEntries.map((s) => String(s.company)));

  res.json({
    quality,
    summary: {
      totalReceivedKg: round2(received),
      totalConsumedKg: round2(consumed),
      remainingKg: round2(remaining),
      totalReceivedCones: Math.round(receivedCones),
      totalConsumedCones: Math.round(consumedCones),
      remainingCones: Math.round(remainingCones),
      totalBeams: beams.length,
      totalShades: quality.shades.length,
      totalParties: parties.size,
      totalCompanies: companies.size,
    },
    stockEntries: stockEntries.map((s) => ({ ...s, balance: balances.get(String(s._id)) })),
    beams,
  });
});

function round2(n) {
  return Math.round(n * 100) / 100;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
