import { parse as parseCsv } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { Quality } from '../models/Quality.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Extracts a flat list of candidate quality names from an uploaded
 * CSV/XLSX buffer. We accept either a single unlabeled column, or a
 * column literally named "name"/"quality"/"quality name" (case-insensitive)
 * so real-world exports from other systems still work.
 */
export async function extractNamesFromFile(buffer, originalName) {
  const isExcel = /\.xlsx?$/i.test(originalName || '');
  if (isExcel) return extractFromExcel(buffer);
  return extractFromCsv(buffer);
}

function pickNameColumn(headerRow) {
  const candidates = ['quality name', 'quality', 'name'];
  const lower = headerRow.map((h) => String(h || '').trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = lower.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return 0; // fall back to first column
}

function extractFromCsv(buffer) {
  const records = parseCsv(buffer, { skip_empty_lines: true, trim: true });
  if (!records.length) return [];
  const looksLikeHeader = /name|quality/i.test(records[0].join(' '));
  const dataRows = looksLikeHeader ? records.slice(1) : records;
  const colIdx = looksLikeHeader ? pickNameColumn(records[0]) : 0;
  return dataRows.map((row, i) => ({ row: i + (looksLikeHeader ? 2 : 1), name: (row[colIdx] || '').trim() }));
}

async function extractFromExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows = [];
  sheet.eachRow((row) => rows.push(row.values.slice(1).map((v) => (v == null ? '' : String(v).trim()))));
  if (!rows.length) return [];

  const looksLikeHeader = /name|quality/i.test(rows[0].join(' '));
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  const colIdx = looksLikeHeader ? pickNameColumn(rows[0]) : 0;
  return dataRows.map((row, i) => ({ row: i + (looksLikeHeader ? 2 : 1), name: (row[colIdx] || '').trim() }));
}

/**
 * Validates extracted rows against each other (duplicates within the file)
 * and against existing tenant data (already-existing qualities), producing
 * the preview/summary the UI shows before the user confirms the import.
 * Nothing is written to the database at this stage.
 */
export async function validateImportRows(tenantId, rawRows) {
  const existing = await Quality.find({ tenant: tenantId }).select('name').lean();
  const existingNames = new Set(existing.map((q) => q.name.trim().toLowerCase()));

  const seenInFile = new Set();
  const results = rawRows.map(({ row, name }) => {
    if (!name) {
      return { row, name, status: 'error', reason: 'Empty quality name' };
    }
    const key = name.toLowerCase();
    if (existingNames.has(key)) {
      return { row, name, status: 'duplicate', reason: 'Quality already exists in this workspace' };
    }
    if (seenInFile.has(key)) {
      return { row, name, status: 'duplicate', reason: 'Duplicate within the uploaded file' };
    }
    seenInFile.add(key);
    return { row, name, status: 'valid', reason: null };
  });

  const summary = {
    totalRows: results.length,
    validRows: results.filter((r) => r.status === 'valid').length,
    duplicateRows: results.filter((r) => r.status === 'duplicate').length,
    errorRows: results.filter((r) => r.status === 'error').length,
  };

  return { rows: results, summary };
}

/**
 * Re-validates (never trusts a stale client-held preview) then imports only
 * the rows that are still valid at confirmation time, inside a single
 * insertMany call. Returns exactly what was imported vs skipped so the UI
 * can show an accurate final summary rather than silently importing bad
 * data.
 */
export async function confirmImport(tenantId, userId, names) {
  if (!Array.isArray(names) || names.length === 0) {
    throw ApiError.badRequest('No valid rows were provided to import');
  }
  const { rows, summary } = await validateImportRows(tenantId, names.map((name, i) => ({ row: i + 1, name })));
  const toImport = rows.filter((r) => r.status === 'valid');

  if (toImport.length === 0) {
    return { imported: 0, skipped: rows.length, summary };
  }

  const docs = toImport.map((r) => ({ tenant: tenantId, name: r.name, shades: [], createdBy: userId }));
  const created = await Quality.insertMany(docs, { ordered: false });

  return { imported: created.length, skipped: rows.length - toImport.length, summary };
}
