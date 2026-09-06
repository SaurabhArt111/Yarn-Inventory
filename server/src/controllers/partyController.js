import { Party } from '../models/Party.js';
import { StockEntry } from '../models/StockEntry.js';
import { createMasterController } from './masterFactory.js';

export const partyController = createMasterController(Party, {
  label: 'Party',
  usageCheck: (tenantId, id) => StockEntry.exists({ tenant: tenantId, party: id }),
});
