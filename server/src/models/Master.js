import mongoose from 'mongoose';

const qualitySchema = new mongoose.Schema({ name:{type:String,required:true,trim:true,unique:true}, active:{type:Boolean,default:true} },{timestamps:true});
const partySchema = new mongoose.Schema({ name:{type:String,required:true,trim:true,unique:true}, active:{type:Boolean,default:true} },{timestamps:true});
const companySchema = new mongoose.Schema({ name:{type:String,required:true,trim:true,unique:true}, active:{type:Boolean,default:true} },{timestamps:true});
export const Quality=mongoose.model('Quality',qualitySchema);
export const Party=mongoose.model('Party',partySchema);
export const Company=mongoose.model('Company',companySchema);
