import express from 'express';import {Master} from '../models/SaaS.js';import {allow} from '../middleware/auth.js';
const r=express.Router();
r.get('/:type',async(req,res)=>{const type=req.params.type;if(!['quality','party','company'].includes(type))return res.status(400).json({message:'Invalid master type'});res.json(await Master.find({companyId:req.user.companyId,type}).sort({name:1}))});
r.post('/:type',allow('owner','admin'),async(req,res)=>{const type=req.params.type,name=(req.body.name||'').trim();if(!name)return res.status(400).json({message:'Name is required'});if(!['quality','party','company'].includes(type))return res.status(400).json({message:'Invalid master type'});try{res.status(201).json(await Master.create({companyId:req.user.companyId,type,name}))}catch(e){res.status(409).json({message:'This master value already exists'})}});
r.delete('/:id',allow('owner','admin'),async(req,res)=>{await Master.deleteOne({_id:req.params.id,companyId:req.user.companyId});res.json({ok:true})});
export default r;
