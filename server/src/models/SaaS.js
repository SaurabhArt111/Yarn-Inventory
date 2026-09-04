import mongoose from "mongoose";
const { Schema } = mongoose;
export const Company = mongoose.model(
  "Company",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
      },
      status: {
        type: String,
        enum: ["active", "suspended"],
        default: "active",
      },
    },
    { timestamps: true },
  ),
);
export const User = mongoose.model(
  "User",
  new Schema(
    {
      companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true },
      role: {
        type: String,
        enum: ["owner", "admin", "staff"],
        default: "staff",
      },
      status: { type: String, enum: ["active", "disabled"], default: "active" },
      refreshTokenHash: { type: String, default: null },
      lastLoginAt: { type: Date },
    },
    { timestamps: true },
  ),
);
User.schema.index({ companyId: 1, email: 1 }, { unique: true });
export const Master = mongoose.model(
  "Master",
  new Schema(
    {
      companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },
      type: {
        type: String,
        enum: ["quality", "party", "company"],
        required: true,
      },
      name: { type: String, required: true, trim: true },
    },
    { timestamps: true },
  ),
);
Master.schema.index({ companyId: 1, type: 1, name: 1 }, { unique: true });
export const StockEntry = mongoose.model(
  "StockEntry",
  new Schema(
    {
      companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },
      date: { type: Date, required: true },
      challanNo: { type: String, required: true, trim: true },
      quality: { type: Schema.Types.ObjectId, ref: "Master", required: true },
      party: { type: Schema.Types.ObjectId, ref: "Master", required: true },
      company: { type: Schema.Types.ObjectId, ref: "Master", required: true },
      box: { type: Number, min: 0, default: 0 },
      totalCones: { type: Number, min: 0, default: 0 },
      netWeight: { type: Number, min: 0, required: true },
      shadeNo: { type: String, required: true, trim: true },
      lotNo: { type: String, trim: true },
      remarks: { type: String, trim: true },
    },
    { timestamps: true },
  ),
);
export const Beam = mongoose.model(
  "Beam",
  new Schema(
    {
      companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },
      stockEntry: {
        type: Schema.Types.ObjectId,
        ref: "StockEntry",
        required: true,
      },
      sourceAllocations: [
        {
          stockEntry: {
            type: Schema.Types.ObjectId,
            ref: "StockEntry",
            required: true,
          },
          weight: { type: Number, min: 0, required: true },
        },
      ],
      date: { type: Date, required: true },
      beamNo: { type: String, required: true, trim: true },
      challanNo: { type: String, required: true, trim: true },
      quality: { type: Schema.Types.ObjectId, ref: "Master", required: true },
      party: { type: Schema.Types.ObjectId, ref: "Master", required: true },
      ends: { type: Number, min: 0, required: true },
      finalDenier: { type: Number, min: 0, required: true },
      meter: { type: Number, min: 0, required: true },
      beamWeight: { type: Number, min: 0, required: true },
      width: { type: Number, min: 0, default: 0 },
      pipes: { type: String, trim: true },
      remarks: { type: String, trim: true },
    },
    { timestamps: true },
  ),
);
Beam.schema.index({ companyId: 1, beamNo: 1 }, { unique: true });
export const AuditLog = mongoose.model(
  "AuditLog",
  new Schema(
    {
      companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      action: String,
      entity: String,
      entityId: Schema.Types.ObjectId,
      meta: Schema.Types.Mixed,
    },
    { timestamps: true },
  ),
);
