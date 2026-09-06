import { StockEntry } from '../models/StockEntry.js';
import { Quality } from '../models/Quality.js';
import { Party } from '../models/Party.js';
import { Company } from '../models/Company.js';
import { nextSequence, formatReference } from '../models/Counter.js';
import { runInTransaction, recordStockIn, getStockBalancesBulk } from './inventoryService.js';
import { ApiError } from '../utils/ApiError.js';

export async function createStockEntry({ tenantId, userId, input }) {
  const [quality, party, company] = await Promise.all([
    Quality.findOne({ _id: input.quality, tenant: tenantId }),
    Party.findOne({ _id: input.party, tenant: tenantId }),
    Company.findOne({ _id: input.company, tenant: tenantId }),
  ]);
  if (!quality) throw ApiError.badRequest('Selected quality does not exist');
  if (!party) throw ApiError.badRequest('Selected party does not exist');
  if (!company) throw ApiError.badRequest('Selected company does not exist');

  const shade = quality.shades.id(input.shadeId);
  if (!shade) throw ApiError.badRequest('Selected shade does not belong to the selected quality');

  return runInTransaction(async (session) => {
    const seq = await nextSequence(tenantId, 'stock', { session });
    const reference = formatReference('STK', seq);

    const [stockEntry] = await StockEntry.create(
      [
        {
          tenant: tenantId,
          reference,
          date: input.date,
          challanNo: input.challanNo,
          quality: quality._id,
          qualityName: quality.name,
          shadeId: shade._id,
          shadeNo: shade.name,
          party: party._id,
          partyName: party.name,
          company: company._id,
          companyName: company.name,
          box: input.box || '',
          totalCones: input.totalCones,
          netWeightKg: input.netWeightKg,
          lotNo: input.lotNo,
          remarks: input.remarks || '',
          createdBy: userId,
        },
      ],
      { session }
    );

    await recordStockIn({
      tenantId,
      stockEntryId: stockEntry._id,
      quantityKg: input.netWeightKg,
      quantityCones: input.totalCones,
      userId,
      session,
    });

    return stockEntry;
  });
}

export async function attachBalances(tenantId, stockEntries) {
  const ids = stockEntries.map((s) => s._id);
  const balances = await getStockBalancesBulk(tenantId, ids);
  return stockEntries.map((s) => {
    const balance = balances.get(String(s._id)) || {
      received: s.netWeightKg,
      consumed: 0,
      remaining: s.netWeightKg,
      receivedCones: s.totalCones,
      consumedCones: 0,
      remainingCones: s.totalCones,
    };
    return { ...s, balance };
  });
}
