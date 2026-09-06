import mongoose from 'mongoose';

// "Operational Company" -- the manufacturing/operational entity associated
// with stock and production records (distinct from the Tenant, which is
// the SaaS workspace/business account itself).
const companySchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

companySchema.index({ tenant: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Company = mongoose.model('Company', companySchema);
