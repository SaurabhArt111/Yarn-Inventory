import express from 'express';import {StockEntry,Beam,Master} from '../models/SaaS.js';import {allow} from '../middleware/auth.js';
const r=express.Router();
const populate='quality party company';
r.get('/',async(req,res)=>res.json(await StockEntry.find({companyId:req.user.companyId}).populate(populate).sort({date:-1,createdAt:-1})));
r.post('/',allow('owner','admin','staff'),async(req,res)=>{try{const {date,challanNo,quality,party,company,box,totalCones,netWeight,shadeNo,lotNo,remarks}=req.body;if(!date||!challanNo||!quality||!party||!company||!shadeNo||netWeight===undefined)return res.status(400).json({message:'Please complete all required stock fields'});const ids=await Master.find({_id:{$in:[quality,party,company]},companyId:req.user.companyId});if(ids.length!==3)return res.status(400).json({message:'Invalid master selection'});res.status(201).json(await StockEntry.create({companyId:req.user.companyId,date,challanNo,quality,party,company,box:Number(box||0),totalCones:Number(totalCones||0),netWeight:Number(netWeight),shadeNo,lotNo,remarks}))}catch(e){res.status(500).json({message:'Could not create stock entry',detail:e.message})}});
r.get('/:id',async(req,res)=>{const x=await StockEntry.findOne({_id:req.params.id,companyId:req.user.companyId}).populate(populate);if(!x)return res.status(404).json({message:'Stock entry not found'});res.json(x)});
export default r;
