import mongoose from 'mongoose';

// Immutable audit trail. Never stores credentials/passwords -- only
// who did what, to which entity, and when, plus lightweight metadata for
// context (e.g. before/after summary, request IP/user agent).
const auditLogSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, default: 'System' },

    action: { type: String, required: true, index: true }, // e.g. 'stock.created', 'beam.cancelled'
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ tenant: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
