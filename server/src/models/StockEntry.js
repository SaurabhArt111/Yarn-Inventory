import mongoose from 'mongoose';
const stockEntrySchema=new mongoose.Schema({
 date:{type:Date,required:true},challanNo:{type:String,required:true,trim:true},quality:{type:mongoose.Schema.Types.ObjectId,ref:'Quality',required:true},party:{type:mongoose.Schema.Types.ObjectId,ref:'Party',required:true},company:{type:mongoose.Schema.Types.ObjectId,ref:'Company',required:true},box:{type:Number,default:0,min:0},totalCones:{type:Number,default:0,min:0},netWeight:{type:Number,required:true,min:0},shadeNo:{type:String,required:true,trim:true},lotNo:{type:String,trim:true},remarks:{type:String,trim:true}}, {timestamps:true});
stockEntrySchema.index({date:-1});stockEntrySchema.index({challanNo:1});stockEntrySchema.index({quality:1,shadeNo:1});
export default mongoose.model('StockEntry',stockEntrySchema);
