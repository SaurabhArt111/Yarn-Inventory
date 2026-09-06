import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import * as analyticsService from '../services/analyticsService.js';

export const overview = catchAsync(async (req, res) => {
  const data = await analyticsService.getOverview(req.tenantId, { from: req.query.from, to: req.query.to });
  res.json(data);
});

export const qualityOptions = catchAsync(async (req, res) => {
  const items = await analyticsService.listEntityOptionsForAnalysis(req.tenantId, 'quality');
  res.json({ items });
});
export const partyOptions = catchAsync(async (req, res) => {
  const items = await analyticsService.listEntityOptionsForAnalysis(req.tenantId, 'party');
  res.json({ items });
});
export const companyOptions = catchAsync(async (req, res) => {
  const items = await analyticsService.listEntityOptionsForAnalysis(req.tenantId, 'company');
  res.json({ items });
});

export const analyzeQuality = catchAsync(async (req, res) => {
  if (!req.params.id) throw ApiError.badRequest('A quality id is required');
  const data = await analyticsService.analyzeDimension(req.tenantId, 'quality', req.params.id);
  res.json(data);
});
export const analyzeParty = catchAsync(async (req, res) => {
  if (!req.params.id) throw ApiError.badRequest('A party id is required');
  const data = await analyticsService.analyzeDimension(req.tenantId, 'party', req.params.id);
  res.json(data);
});
export const analyzeCompany = catchAsync(async (req, res) => {
  if (!req.params.id) throw ApiError.badRequest('A company id is required');
  const data = await analyticsService.analyzeDimension(req.tenantId, 'company', req.params.id);
  res.json(data);
});
