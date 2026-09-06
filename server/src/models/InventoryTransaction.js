import mongoose from 'mongoose';

// Append-only inventory ledger. Every movement against a stock entry is
// recorded here (never mutated or deleted), so remaining inventory can
// always be recomputed independently of any cached/derived field, and the
// design already supports future adjustment/return/transfer/reversal types
// without a schema change.
const inventoryTransactionSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    stockEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'StockEntry', required: true, index: true },

    type: {
      type: String,
      enum: ['stock_in', 'beam_consumption', 'adjustment', 'reversal', 'return', 'transfer'],
      required: true,
    },
    // Positive for inflows (stock_in, return, positive adjustment),
    // negative for outflows (beam_consumption, negative adjustment).
    quantityKg: { type: Number, required: true },
    // Parallel physical-count dimension: cones received / consumed. Same
    // sign convention as quantityKg. Defaults to 0 so older/weight-only
    // movement types remain valid.
    quantityCones: { type: Number, default: 0 },

    // Present when the movement is tied to a beam (beam_consumption or a
    // reversal of one), enabling full bi-directional traceability.
    beam: { type: mongoose.Schema.Types.ObjectId, ref: 'Beam', default: null },

    note: { type: String, trim: true, default: '', maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ tenant: 1, stockEntry: 1, createdAt: 1 });

export const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
