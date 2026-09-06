import mongoose from 'mongoose';

const beamSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    reference: { type: String, required: true }, // e.g. B-000001 (Beam No.)

    // Every beam must reference its source stock entry -- this is the core
    // traceability requirement in the brief.
    sourceStockEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'StockEntry', required: true, index: true },

    productionDate: { type: Date, required: true },
    challanNo: { type: String, trim: true, default: '' },

    quality: { type: mongoose.Schema.Types.ObjectId, ref: 'Quality', required: true, index: true },
    qualityName: { type: String, required: true },
    shadeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    shadeNo: { type: String, required: true },

    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true, index: true },
    partyName: { type: String, required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    companyName: { type: String, required: true },

    lotNo: { type: String, required: true, trim: true },

    // Inputs to the beam weight formula -- always re-validated & the
    // resulting weight always re-calculated server-side.
    ends: { type: Number, required: true, min: 1 },
    finalDenier: { type: Number, required: true, min: 0.01 },
    meter: { type: Number, required: true, min: 0.01 },
    beamWeightKg: { type: Number, required: true, min: 0 }, // authoritative, backend-calculated
    // Number of cones physically consumed from the source stock entry to
    // produce this beam. Tracked as its own inventory dimension (parallel
    // to weight) so remaining cone count stays accurate at the stock and
    // quality level, not just remaining weight.
    consumedCones: { type: Number, required: true, min: 1 },

    width: { type: String, trim: true, default: '' },
    // Pipes are free text by design (e.g. "4 Pipes", "P1,P2,P3", "2.5 inch").
    pipes: { type: String, trim: true, default: '', maxlength: 200 },
    remarks: { type: String, trim: true, default: '', maxlength: 500 },

    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    cancelledReason: { type: String, trim: true, default: '' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

beamSchema.index({ tenant: 1, reference: 1 }, { unique: true });
beamSchema.index({ tenant: 1, productionDate: -1 });
beamSchema.index({ tenant: 1, lotNo: 1 });

export const Beam = mongoose.model('Beam', beamSchema);
