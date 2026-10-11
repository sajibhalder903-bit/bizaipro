import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import multer from 'multer';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { z } from 'zod';
import {Post,User,Media,Revision,Audit,Redirect,Setting,Lead,getSettings,publishedQuery} from './models.mjs';
import {seoRoutes} from './seo.mjs';
import {postInput,settingsInput,cleanContent,isReservedSlug,safePath} from './content.mjs';

export function createApp({mongoUrl,secret,siteUrl,production=false,uploadDir,renderPage}) {
 const app=express();
 app.disable('x-powered-by');
 app.set('trust proxy',Number(process.env.TRUST_PROXY||0));
 app.use(helmet({
  contentSecurityPolicy:{
   directives:{
    defaultSrc:["'self'"],
    scriptSrc:["'self'","'unsafe-inline'","https://pagead2.googlesyndication.com","https://*.googlesyndication.com","https://*.google.com","https://adservice.google.com","https://*.doubleclick.net"],
    styleSrc:["'self'","'unsafe-inline'"],
    imgSrc:["'self'",'https:','data:','blob:'],
    connectSrc:["'self'","https://pagead2.googlesyndication.com","https://*.google.com","https://*.googlesyndication.com","https://*.doubleclick.net","https://api.pwnedpasswords.com"],
    objectSrc:["'none'"],
    frameSrc:["'self'","https://googleads.g.doubleclick.net","https://*.googlesyndication.com","https://*.google.com"],
    upgradeInsecureRequests:production?[]:null
   }
  }
 }));
 app.use(compression());
 app.use(express.json({limit:'1mb'}));
 app.use('/assets',express.static(path.resolve('dist/client/assets'),{immutable:true,maxAge:'1y'}));
 app.get(['/media/:filename','/wp-content/uploads/*path'],async(req,res,next)=>{
  const media=await Media.findOne(req.path.startsWith('/media/')?{url:req.path}:{legacyPath:req.path}).select('+data');
  if(!media?.data)return next();
  res.set({'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}).type('webp').send(Buffer.from(media.data));
 });
 app.use('/media',express.static(uploadDir,{maxAge:'1y',immutable:true,setHeaders:r=>r.setHeader('X-Content-Type-Options','nosniff')}));
 const sessionStore=MongoStore.create({mongoUrl,collectionName:'sessions',ttl:86400});
 app.locals.close=()=>sessionStore.close();
 app.use(session({name:'bizaipro.sid',secret,resave:false,saveUninitialized:false,store:sessionStore,cookie:{httpOnly:true,sameSite:'strict',secure:production,maxAge:86400000}}));
 app.use('/api',rateLimit({windowMs:60000,limit:240,standardHeaders:'draft-8',legacyHeaders:false}));
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.get('/api/health',(_req,res)=>res.status(mongoose.connection.readyState===1?200:503).json({ok:mongoose.connection.readyState===1}));
 app.get('/api/auth/session',(req,res)=>{req.session.csrf ||= crypto.randomBytes(32).toString('hex');res.json({user:req.session.user||null,csrf:req.session.csrf});});
 const leadLimit=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-8',legacyHeaders:false});
 app.post('/api/leads',leadLimit,async(req,res)=>{
  try{
   const email=String(req.body.email||'').trim().toLowerCase();
   if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Please enter a valid work email.'});
   const lead=await Lead.create({
    name:String(req.body.name||'').slice(0,100),
    email,
    phone:String(req.body.phone||'').slice(0,50),
    website:String(req.body.website||'').slice(0,200),
    service:String(req.body.service||'Growth Audit').slice(0,100),
    budget:String(req.body.budget||'$1,000 - $5,000').slice(0,100),
    notes:String(req.body.notes||'').slice(0,1000),
    source:String(req.body.source||'calculator').slice(0,100)
   });
   res.status(201).json({ok:true,id:lead.id,message:'Thank you! Your Growth Audit request has been received. Our team will review your website and contact you shortly.'});
  }catch{res.status(500).json({error:'Unable to save request. Please try again.'});}
 });
 app.use('/api',(req,res,next)=>{
  if(['GET','HEAD','OPTIONS'].includes(req.method)||req.path==='/leads')return next();
  const token=req.get('X-CSRF-Token'),expected=req.session.csrf;
  if(req.get('Origin') && req.get('Origin')!==new URL(siteUrl).origin)return res.status(403).json({error:'Request origin is not allowed'});
  if(!token||!expected||Buffer.byteLength(token)!==Buffer.byteLength(expected)||!crypto.timingSafeEqual(Buffer.from(token),Buffer.from(expected)))return res.status(403).json({error:'Session expired. Reload and try again.'});
  next();
 });
 const auth=(req,res,next)=>req.session.user?next():res.status(401).json({error:'Sign in to continue'});
 const admin=(req,res,next)=>req.session.user?.role==='admin'?next():res.status(403).json({error:'Administrator access required'});
 const log=(req,action,target)=>Audit.create({actor:req.session.user.email,action,target:String(target)});
 const loginLimit=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many sign-in attempts. Try again in 15 minutes.'}});
 app.post('/api/auth/login',loginLimit,async(req,res)=>{
  const {email,password}=z.object({email:z.email(),password:z.string().min(1).max(128)}).parse(req.body);
  const user=await User.findOne({email:email.toLowerCase()});
  const valid=await bcrypt.compare(password,user?.passwordHash||'$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  if(!user||!valid)return res.status(401).json({error:'Email or password is incorrect'});
  await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
  req.session.user={id:user.id,email:user.email,name:user.name,role:user.role};req.session.csrf=crypto.randomBytes(32).toString('hex');
  await log(req,'auth.login',user.id);res.json({user:req.session.user,csrf:req.session.csrf});
 });
 app.post('/api/auth/logout',auth,async(req,res)=>{await new Promise((resolve,reject)=>req.session.destroy(e=>e?reject(e):resolve()));res.clearCookie('bizaipro.sid');res.json({ok:true});});
 app.use('/api/admin',auth);
 seoRoutes(app,siteUrl);
 app.get('/api/admin/dashboard',async(_req,res)=>{
  const [posts,pages,drafts,published,media,activity]=await Promise.all([Post.countDocuments({kind:'post',status:{$ne:'archived'}}),Post.countDocuments({kind:'page',status:{$ne:'archived'}}),Post.countDocuments({status:'draft'}),Post.countDocuments(publishedQuery()),Media.countDocuments(),Audit.find().sort({createdAt:-1}).limit(8).lean()]);
  res.json({posts,pages,drafts,published,media,activity});
 });
 app.get('/api/admin/posts',async(req,res)=>{
  const filter={};if(['post','page'].includes(req.query.kind))filter.kind=req.query.kind;
  if(req.query.q)filter.title={$regex:String(req.query.q).slice(0,100).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};
  const page=Math.max(1,Number(req.query.page)||1);
  const [items,total]=await Promise.all([Post.find(filter).select('-content').sort({updatedAt:-1}).skip((page-1)*30).limit(30).lean(),Post.countDocuments(filter)]);res.json({items,total,page});
 });
 app.get('/api/admin/posts/:id',async(req,res)=>{const post=await Post.findById(req.params.id).lean();if(!post)return res.status(404).json({error:'Content not found'});res.json(post);});
 async function savePost(req,res) {
  const input=postInput.parse(req.body);
  if(isReservedSlug(input.slug))return res.status(400).json({error:'This URL is reserved for the application'});
  input.content=cleanContent(input.content);
  const existing=req.params.id?await Post.findById(req.params.id):null;
  if(req.params.id&&!existing)return res.status(404).json({error:'Content not found'});
  if(existing&&existing.version!==input.version)return res.status(409).json({error:'This content changed in another session. Reload before saving.'});
  if(input.status==='published'&&!input.publishedAt)input.publishedAt=new Date().toISOString();
  if(input.status==='scheduled'&&(!input.publishedAt||new Date(input.publishedAt)<=new Date()))return res.status(400).json({error:'Choose a future publication time'});
  if(input.publishedAt&&Number.isNaN(new Date(input.publishedAt).valueOf()))return res.status(400).json({error:'Invalid publication date'});
  if(input.status==='published'&&new Date(input.publishedAt)>new Date())return res.status(400).json({error:'Use Scheduled for future publication'});
  if(input.status==='published'&&!input.content.trim())return res.status(400).json({error:'Add content before publishing'});
  const conflict=await Post.exists({slug:input.slug,...(existing?{_id:{$ne:existing._id}}:{})});
  if(conflict)return res.status(409).json({error:'That URL is already used by another post or page'});
  let post;
  if(existing){
   const snapshot=existing.toObject();
   post=await Post.findOneAndUpdate({_id:existing._id,version:input.version},{$set:{...input,version:input.version+1}},{new:true});
   if(!post)return res.status(409).json({error:'This content changed in another session. Reload before saving.'});
   await Revision.create({postId:existing._id,snapshot,editor:req.session.user.email});
   if(existing.slug!==input.slug)await Redirect.updateOne({from:`/${existing.slug}/`},{$set:{to:`/${input.slug}/`}},{upsert:true});
  }else post=await Post.create({...input,version:1});
  await log(req,`content.${input.status}`,post.id);res.json(post);
 }
 app.post('/api/admin/posts',savePost);app.put('/api/admin/posts/:id',savePost);
 app.get('/api/admin/posts/:id/revisions',async(req,res)=>res.json(await Revision.find({postId:req.params.id}).sort({createdAt:-1}).limit(20).lean()));
 app.get('/api/admin/settings',async(_req,res)=>res.json(await getSettings()));
 app.put('/api/admin/settings',admin,async(req,res)=>{const value=settingsInput.parse(req.body);await Setting.updateOne({key:'site'},{$set:{value}},{upsert:true});await log(req,'settings.update','site');res.json(value);});
 app.get('/api/admin/media',async(_req,res)=>res.json(await Media.find().sort({createdAt:-1}).limit(200).lean()));
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1}});
 app.post('/api/admin/media',upload.single('image'),async(req,res)=>{
  if(!req.file)return res.status(400).json({error:'Choose an image'});
  const id=crypto.randomUUID();
  try{
   const {data,info}=await sharp(req.file.buffer,{limitInputPixels:40000000,animated:false}).rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer({resolveWithObject:true});
   if(data.length>8*1024*1024)throw new Error('Converted image too large');
   const media=await Media.create({url:`/media/${id}.webp`,data,alt:String(req.body.alt||'').slice(0,250),name:req.file.originalname.slice(0,200),bytes:info.size,width:info.width,height:info.height});
   await log(req,'media.upload',media.id);const result=media.toObject();delete result.data;res.status(201).json(result);
  }catch{res.status(400).json({error:'Use a valid JPEG, PNG, WebP or AVIF image under 8 MB'});}
 });
 app.patch('/api/admin/media/:id',async(req,res)=>{const {alt}=z.object({alt:z.string().max(250)}).parse(req.body);const media=await Media.findByIdAndUpdate(req.params.id,{$set:{alt}},{new:true});if(!media)return res.status(404).json({error:'Image not found'});res.json(media);});
 app.get('/api/admin/redirects',admin,async(_req,res)=>res.json(await Redirect.find().sort({createdAt:-1}).lean()));
 app.post('/api/admin/redirects',admin,async(req,res)=>{
  const {from,to}=z.object({from:safePath,to:safePath}).parse(req.body);
  if(from===to||from==='/'||/^\/(admin|api|assets|media)(\/|$)/.test(from))return res.status(400).json({error:'Invalid redirect source'});
  let next=to;const visited=new Set([from]);
  for(let i=0;i<20;i++){if(visited.has(next))return res.status(400).json({error:'Redirect would create a loop'});visited.add(next);const row=await Redirect.findOne({from:next}).lean();if(!row)break;next=row.to;}
  const result=await Redirect.findOneAndUpdate({from},{$set:{to}},{upsert:true,new:true});await log(req,'redirect.save',from);res.json(result);
 });
 app.get('/api/admin/leads',async(_req,res)=>res.json(await Lead.find().sort({createdAt:-1}).limit(200).lean()));
 app.patch('/api/admin/leads/:id',async(req,res)=>{const {status}=req.body;const lead=await Lead.findByIdAndUpdate(req.params.id,{$set:{status}},{new:true});if(!lead)return res.status(404).json({error:'Lead not found'});res.json(lead);});
 app.delete('/api/admin/leads/:id',admin,async(req,res)=>{await Lead.findByIdAndDelete(req.params.id);res.json({ok:true});});
 app.get('/api/admin/export',admin,async(req,res)=>{
  const [posts,settings,media,redirects]=await Promise.all([Post.find().lean(),getSettings(),Media.find().lean(),Redirect.find().lean()]);
  await log(req,'backup.export','content');res.attachment(`bizaipro-content-${new Date().toISOString().slice(0,10)}.json`).json({schemaVersion:1,exportedAt:new Date(),posts,settings,media,redirects});
 });
 app.use('/api',(_req,res)=>res.status(404).json({error:'Endpoint not found'}));
 if(renderPage)app.use(renderPage);
 app.use((error,_req,res,_next)=>{
  if(error instanceof z.ZodError)return res.status(400).json({error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});
  if(error.code===11000)return res.status(409).json({error:'That value is already in use'});
  if(error.name==='CastError')return res.status(400).json({error:'Invalid identifier'});
  if(error.code==='LIMIT_FILE_SIZE')return res.status(413).json({error:'Images must be smaller than 8 MB'});
  console.error(error.name,error.message);res.status(500).json({error:'Something went wrong. Please try again.'});
 });
 return app;
}
