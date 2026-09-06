import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from '../services/auditService.js';
import * as importService from '../services/importService.js';

// Step 1-5: upload + parse + validate + return a preview/summary. Nothing
// is written to the database here.
export const previewQualityImport = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file was uploaded');
  const rawRows = await importService.extractNamesFromFile(req.file.buffer, req.file.originalname);
  if (!rawRows.length) throw ApiError.badRequest('No rows were found in the uploaded file');
  const { rows, summary } = await importService.validateImportRows(req.tenantId, rawRows);
  res.json({ rows, summary });
});

// Step 6-7: explicit confirmation required; only rows still valid at
// confirmation time are imported (never silently import bad data).
export const confirmQualityImport = catchAsync(async (req, res) => {
  const { names } = req.body;
  const result = await importService.confirmImport(req.tenantId, req.user._id, names);
  await recordAudit({
    req,
    action: 'quality.imported',
    entityType: 'Quality',
    metadata: { imported: result.imported, skipped: result.skipped },
  });
  res.status(201).json(result);
});
