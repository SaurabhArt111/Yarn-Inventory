import mongoose from 'mongoose';

const partySchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    // Kept flexible (not a rigid schema) so future fields (GSTIN, contact,
    // address, credit terms, etc.) can be added without a migration.
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

partySchema.index({ tenant: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Party = mongoose.model('Party', partySchema);
