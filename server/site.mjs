import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createApp} from './app.mjs';
import {Post,Redirect,getSettings,publishedQuery} from './models.mjs';
import {escapeHtml} from './content.mjs';
import {render} from '../dist/server/entry-server.js';
const production=process.env.NODE_ENV==='production';
const siteUrl=(process.env.SITE_URL||'http://localhost:3000').replace(/\/$/,'');
if(!process.env.MONGODB_URI||!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<48)throw new Error('Configure MONGODB_URI and a SESSION_SECRET of at least 48 characters');
if(production&&!siteUrl.startsWith('https://'))throw new Error('Production requires HTTPS SITE_URL');
await mongoose.connect(process.env.MONGODB_URI);
const manifest=JSON.parse(await fs.readFile('dist/client/.vite/manifest.json','utf8'));
const asset=manifest['src/entry-client.jsx'];
const indexing=process.env.ALLOW_INDEXING==='true';
const xml=s=>escapeHtml(s);
const app=createApp({mongoUrl:process.env.MONGODB_URI,secret:process.env.SESSION_SECRET,siteUrl,production,uploadDir:path.resolve(process.env.UPLOAD_DIR||'uploads'),renderPage:async(req,res,next)=>{
 try{
  if(req.method!=='GET')return res.sendStatus(405);
  if(req.path==='/robots.txt')return res.type('text').send(indexing?`User-agent: *\nDisallow: /admin\nDisallow: /api\nDisallow: /search/\nSitemap: ${siteUrl}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
  if(req.path==='/sitemap.xml'){
   const posts=await Post.find({...publishedQuery(),noindex:false}).select('slug updatedAt').lean();
   return res.type('xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${xml(siteUrl)}/</loc></url>${posts.map(p=>`<url><loc>${xml(siteUrl+'/'+p.slug+'/')}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`).join('')}</urlset>`);
  }
  const settings=await getSettings();let data={settings,siteUrl,path:req.path,indexing};let status=200;
  if(req.path.startsWith('/admin')){data.view='admin';res.set('Cache-Control','no-store');}
  else if(req.path==='/'||['/blog/','/blog','/search/','/search'].includes(req.path)||req.path.startsWith('/category/')){
   data.view=req.path==='/'?'home':'listing';data.query=String(req.query.q||req.query.s||'').slice(0,100);
   const filter={...publishedQuery(),kind:'post'};
   if(data.query)filter.title={$regex:data.query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};
   if(req.path.startsWith('/category/')){
    const categorySlug=decodeURIComponent(req.path.split('/')[2]);
    filter.$or=[{categorySlugs:categorySlug},{category:{$regex:'^'+categorySlug.replace(/-/g,' ').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$',$options:'i'}}];
   }
   data.page=Math.max(1,parseInt(req.query.page)||1);data.total=await Post.countDocuments(filter);
   data.posts=await Post.find(filter).select('-content').sort({featured:-1,publishedAt:-1}).skip((data.page-1)*12).limit(12).lean();
  }else if(['/products/','/products','/shop/','/shop'].includes(req.path)){data.view='products';}
   else if(['/tools/','/tools','/free-tools/','/free-tools'].includes(req.path)){data.view='tools';}
  else{
   const slug=decodeURIComponent(req.path).replace(/^\/|\/$/g,'');
   let post;
   if(req.query.preview&&req.session.user){post=await Post.findById(String(req.query.preview)).lean();data.preview=true;res.set('Cache-Control','no-store');}
   else post=await Post.findOne({slug,...publishedQuery()}).lean();
   if(post){data.view='article';data.post=post;data.related=await Post.find({...publishedQuery(),kind:'post',_id:{$ne:post._id}}).select('-content').sort({publishedAt:-1}).limit(3).lean();}
   else{
    let redirect=await Redirect.findOne({from:req.path}).lean();
    if(redirect)return res.redirect(301,redirect.to);
    data.view='notfound';status=404;
   }
  }
  data=JSON.parse(JSON.stringify(data));
  const {html,title,description,canonical,jsonld}=render(data);
  const noindex=!indexing||data.view==='admin'||data.preview||data.post?.noindex||data.view==='notfound'||data.query;
  if(noindex)res.set('X-Robots-Tag','noindex, nofollow');
  const image=data.post?.featuredImage?(data.post.featuredImage.startsWith('/')?siteUrl+data.post.featuredImage:data.post.featuredImage):'';
  res.status(status).type('html').send(`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#27654b">${settings.adsensePublisherId && settings.adsenseEnabled !== false ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${escapeHtml(settings.adsensePublisherId)}" crossorigin="anonymous"></script>` : ''}<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${noindex?'noindex, nofollow':'index, follow'}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:type" content="${data.post?.kind==='post'?'article':'website'}">${image?`<meta property="og:image" content="${escapeHtml(image)}">`:''}<meta name="twitter:card" content="summary_large_image">${(asset.css||[]).map(f=>`<link rel="stylesheet" href="/${f}">`).join('')}${jsonld?`<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g,'\\u003c')}</script>`:''}</head><body><div id="root">${html}</div><script id="initial-data" type="application/json">${JSON.stringify(data).replace(/</g,'\\u003c')}</script><script type="module" src="/${asset.file}"></script></body></html>`);
 }catch(error){next(error);}
}});
export {app};
export async function close(){await app.locals.close();await mongoose.disconnect();}
