import mongoose from 'mongoose';

// Generates sequential, human-readable, per-tenant reference numbers
// (STK-000001, B-000001, ...) via atomic findOneAndUpdate increments so
// concurrent creates never collide, without relying on the client.
const counterSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  key: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.index({ tenant: 1, key: 1 }, { unique: true });

const Counter = mongoose.model('Counter', counterSchema);

export async function nextSequence(tenantId, key, { session } = {}) {
  const doc = await Counter.findOneAndUpdate(
    { tenant: tenantId, key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return doc.seq;
}

export function formatReference(prefix, seq, width = 6) {
  return `${prefix}-${String(seq).padStart(width, '0')}`;
}
