import express from 'express';import StockEntry from '../models/StockEntry.js';import Beam from '../models/Beam.js';import {Quality,Party,Company} from '../models/Master.js';
const router=express.Router();
router.get('/',async(req,res)=>{try{
 const [qualities,parties,companies,stocks,beams]=await Promise.all([Quality.countDocuments({active:true}),Party.countDocuments({active:true}),Company.countDocuments({active:true}),StockEntry.aggregate([{$group:{_id:null,total:{$sum:'$netWeight'}}}]),Beam.aggregate([{$group:{_id:null,total:{$sum:'$beamWeight'}}}])]);
 const inventory=await StockEntry.aggregate([{$group:{_id:'$quality',stockWeight:{$sum:'$netWeight'}}},{$lookup:{from:'beams',localField:'_id',foreignField:'quality',as:'beams'}},{$project:{_id:0,quality:'$_id',stockWeight:1,usedWeight:{$sum:'$beams.beamWeight'},beamCount:{$size:'$beams'}}}]);
 const cards=await Promise.all(inventory.map(async x=>{const q=await Quality.findById(x.quality).lean();return {...x,qualityName:q?.name||'Unknown',remainingWeight:x.stockWeight-x.usedWeight};}));
 res.json({counts:{qualities,parties,companies,stockWeight:stocks[0]?.total||0,beamWeight:beams[0]?.total||0},products:cards.sort((a,b)=>b.remainingWeight-a.remainingWeight)});
}catch(e){res.status(500).json({message:e.message})}});
router.get('/quality/:id',async(req,res)=>{try{const quality=await Quality.findById(req.params.id);if(!quality)return res.status(404).json({message:'Quality not found'});const stock=await StockEntry.find({quality:req.params.id}).populate('party company quality').sort({date:-1});const beams=await Beam.find({quality:req.params.id}).populate('party stockEntry quality').sort({date:-1});const totalStock=stock.reduce((s,x)=>s+x.netWeight,0),used=beams.reduce((s,x)=>s+x.beamWeight,0);res.json({quality,summary:{stockWeight:totalStock,usedWeight:used,remainingWeight:totalStock-used,beamCount:beams.length},stock,beams});}catch(e){res.status(500).json({message:e.message})}});
export default router;
