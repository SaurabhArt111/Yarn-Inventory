import { AuditLog } from '../models/AuditLog.js';
import { catchAsync } from '../utils/catchAsync.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';

export const listAuditLogs = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = { tenant: req.tenantId };
  if (req.query.action) filter.action = { $regex: req.query.action, $options: 'i' };
  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.userId) filter.user = req.query.userId;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, meta: buildPageMeta({ page, limit, total }) });
});
