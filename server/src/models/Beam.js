import mongoose from 'mongoose';
const beamSchema=new mongoose.Schema({
 beamNo:{type:String,required:true,unique:true,trim:true},date:{type:Date,default:Date.now},challanNo:{type:String,required:true,trim:true},stockEntry:{type:mongoose.Schema.Types.ObjectId,ref:'StockEntry',required:true},quality:{type:mongoose.Schema.Types.ObjectId,ref:'Quality',required:true},party:{type:mongoose.Schema.Types.ObjectId,ref:'Party',required:true},ends:{type:Number,required:true,min:0},finalDenier:{type:Number,required:true,min:0},meter:{type:Number,required:true,min:0},beamWeight:{type:Number,required:true,min:0},width:{type:Number,default:0,min:0},pipes:{type:Number,default:0,min:0},remarks:{type:String,trim:true}}
,{timestamps:true});
beamSchema.index({quality:1});beamSchema.index({stockEntry:1});beamSchema.index({party:1});
export default mongoose.model('Beam',beamSchema);
