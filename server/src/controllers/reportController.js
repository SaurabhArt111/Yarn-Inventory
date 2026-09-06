import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from '../services/auditService.js';
import * as reportService from '../services/reportService.js';
import { hasPermission } from '../utils/permissionCheck.js';
import { PERMISSIONS } from '../constants/permissions.js';

const BUILDERS = {
  stock: reportService.buildStockReportRows,
  beams: reportService.buildBeamReportRows,
  inventory: reportService.buildInventoryReportRows,
  parties: reportService.buildPartyReportRows,
  companies: reportService.buildCompanyReportRows,
  qualities: reportService.buildQualityReportRows,
};

function makeReportHandler(type) {
  return catchAsync(async (req, res) => {
    const builder = BUILDERS[type];
    const format = (req.query.format || 'json').toLowerCase();

    if (format !== 'json' && !hasPermission(req.permissions, PERMISSIONS.REPORTS_EXPORT)) {
      throw ApiError.forbidden('You do not have permission to export reports');
    }

    const rows = await builder(req.tenantId, req.query);

    if (format === 'csv') {
      const csv = reportService.rowsToCsv(rows);
      await recordAudit({ req, action: 'report.exported', entityType: 'Report', metadata: { type, format, rows: rows.length } });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
      return res.send(csv);
    }

    if (format === 'xlsx' || format === 'excel') {
      const buffer = await reportService.rowsToExcelBuffer(rows, type);
      await recordAudit({ req, action: 'report.exported', entityType: 'Report', metadata: { type, format, rows: rows.length } });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
      return res.send(Buffer.from(buffer));
    }

    if (format !== 'json') throw ApiError.badRequest('Unsupported format. Use json, csv or xlsx.');
    res.json({ rows, count: rows.length });
  });
}

export const stockReport = makeReportHandler('stock');
export const beamReport = makeReportHandler('beams');
export const inventoryReport = makeReportHandler('inventory');
export const partyReport = makeReportHandler('parties');
export const companyReport = makeReportHandler('companies');
export const qualityReport = makeReportHandler('qualities');
