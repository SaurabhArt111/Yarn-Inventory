import { Company } from '../models/Company.js';
import { StockEntry } from '../models/StockEntry.js';
import { createMasterController } from './masterFactory.js';

export const companyController = createMasterController(Company, {
  label: 'Company',
  usageCheck: (tenantId, id) => StockEntry.exists({ tenant: tenantId, company: id }),
});
