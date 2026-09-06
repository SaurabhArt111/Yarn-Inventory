import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    businessType: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },

    // Architected so subscriptions/billing/usage-limits can be layered on
    // later without a schema rewrite (Section 47 of the brief).
    plan: {
      tier: { type: String, enum: ['free', 'starter', 'growth', 'enterprise'], default: 'free' },
      status: { type: String, enum: ['active', 'trialing', 'past_due', 'canceled'], default: 'active' },
      trialEndsAt: { type: Date, default: null },
    },
    settings: {
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      weightUnit: { type: String, default: 'KG' },
    },
  },
  { timestamps: true }
);

export const Tenant = mongoose.model('Tenant', tenantSchema);
