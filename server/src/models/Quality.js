import mongoose from 'mongoose';

// A Quality is a single master name (e.g. "30D Polyester"). Shades are
// managed as their own sub-documents so they can be added/renamed/retired
// independently while remaining associated with their parent quality --
// we deliberately never duplicate a Quality record per shade.
const shadeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

const qualitySchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    shades: { type: [shadeSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

qualitySchema.index({ tenant: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Quality = mongoose.model('Quality', qualitySchema);
