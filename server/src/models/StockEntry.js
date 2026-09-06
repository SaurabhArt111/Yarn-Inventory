import mongoose from 'mongoose';

// A stock entry is the original receipt of yarn. It never stores a mutable
// "remainingWeight" field -- remaining/consumed balances are always derived
// from the InventoryTransaction ledger (see services/inventoryService.js),
// so history, adjustments and reversals stay fully reconstructable.
const stockEntrySchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    reference: { type: String, required: true }, // e.g. STK-000001

    date: { type: Date, required: true },
    challanNo: { type: String, required: true, trim: true, maxlength: 60 },

    quality: { type: mongoose.Schema.Types.ObjectId, ref: 'Quality', required: true, index: true },
    qualityName: { type: String, required: true }, // snapshot for historical integrity
    shadeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    shadeNo: { type: String, required: true, trim: true }, // snapshot of shade name

    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true, index: true },
    partyName: { type: String, required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    companyName: { type: String, required: true },

    box: { type: String, trim: true, default: '' },
    totalCones: { type: Number, required: true, min: 0 },
    netWeightKg: { type: Number, required: true, min: 0.001 },
    lotNo: { type: String, required: true, trim: true, maxlength: 60 },
    remarks: { type: String, trim: true, default: '', maxlength: 500 },

    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

stockEntrySchema.index({ tenant: 1, reference: 1 }, { unique: true });
stockEntrySchema.index({ tenant: 1, date: -1 });
stockEntrySchema.index({ tenant: 1, lotNo: 1 });
stockEntrySchema.index({ tenant: 1, challanNo: 1 });

export const StockEntry = mongoose.model('StockEntry', stockEntrySchema);
