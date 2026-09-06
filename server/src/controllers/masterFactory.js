import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from '../services/auditService.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Party and Company are structurally identical simple masters (name +
 * status + free-form meta). This factory produces a consistent, fully
 * tenant-scoped CRUD controller for each so the two don't drift apart, and
 * the pattern is easy to extend for new master types later.
 *
 * @param {import('mongoose').Model} Model
 * @param {{ label: string, usageCheck?: (tenantId, id) => Promise<boolean> }} opts
 */
export function createMasterController(Model, { label, usageCheck } = {}) {
  const entityType = Model.modelName;

  const list = catchAsync(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { tenant: req.tenantId };
    if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search), $options: 'i' };
    if (req.query.status) filter.status = req.query.status;

    const [items, total] = await Promise.all([
      Model.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Model.countDocuments(filter),
    ]);
    res.json({ items, meta: buildPageMeta({ page, limit, total }) });
  });

  const listForSelect = catchAsync(async (req, res) => {
    const filter = { tenant: req.tenantId, status: 'active' };
    if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search), $options: 'i' };
    const items = await Model.find(filter).sort({ name: 1 }).limit(50).select('name').lean();
    res.json({ items });
  });

  const getOne = catchAsync(async (req, res) => {
    const item = await Model.findOne({ _id: req.params.id, tenant: req.tenantId }).lean();
    if (!item) throw ApiError.notFound(`${label} not found`);
    res.json({ item });
  });

  const create = catchAsync(async (req, res) => {
    const item = await Model.create({ ...req.body, tenant: req.tenantId, createdBy: req.user._id });
    await recordAudit({ req, action: `${entityType.toLowerCase()}.created`, entityType, entityId: item._id, metadata: { name: item.name } });
    res.status(201).json({ item });
  });

  const update = catchAsync(async (req, res) => {
    const item = await Model.findOneAndUpdate(
      { _id: req.params.id, tenant: req.tenantId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!item) throw ApiError.notFound(`${label} not found`);
    await recordAudit({ req, action: `${entityType.toLowerCase()}.updated`, entityType, entityId: item._id, metadata: req.body });
    res.json({ item });
  });

  const remove = catchAsync(async (req, res) => {
    if (usageCheck) {
      const inUse = await usageCheck(req.tenantId, req.params.id);
      if (inUse) {
        throw ApiError.conflict(`This ${label.toLowerCase()} has related records and cannot be deleted. Deactivate it instead.`);
      }
    }
    const item = await Model.findOneAndDelete({ _id: req.params.id, tenant: req.tenantId });
    if (!item) throw ApiError.notFound(`${label} not found`);
    await recordAudit({ req, action: `${entityType.toLowerCase()}.deleted`, entityType, entityId: item._id });
    res.json({ success: true });
  });

  return { list, listForSelect, getOne, create, update, remove };
}
