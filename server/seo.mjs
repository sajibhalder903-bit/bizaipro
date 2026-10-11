import {Post,getSettings,publishedQuery} from './models.mjs';
import {seoChecklist,metadataKey,searchTitle} from '../shared/seo.mjs';
import {z} from 'zod';
const literal=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function seoRoutes(app,siteUrl) {
 app.get('/api/admin/seo/audit',async(req,res)=>{
  const page=Math.max(1,Math.min(100000,parseInt(req.query.page)||1)),filter={status:{$ne:'archived'}};
  if(['draft','published','scheduled'].includes(req.query.status))filter.status=req.query.status;
  const q=String(req.query.q||'').trim().slice(0,100);if(q)filter.title={$regex:literal(q),$options:'i'};
  const [posts,total,settings]=await Promise.all([Post.find(filter).sort({updatedAt:-1}).skip((page-1)*30).limit(30).lean(),Post.countDocuments(filter),getSettings()]);
  res.json({page,total,indexingEnabled:process.env.ALLOW_INDEXING==='true',items:posts.map(p=>({id:p._id,title:p.title,slug:p.slug,status:p.status,noindex:p.noindex,...seoChecklist(p,siteUrl,settings.siteName)}))});
 });
 app.post('/api/admin/seo/review',async(req,res)=>{
  const input=z.object({id:z.string().regex(/^[a-f\d]{24}$/i).optional(),title:z.string().max(180),seoTitle:z.string().max(120),metaDescription:z.string().max(320),focusKeyword:z.string().max(100)}).parse(req.body);
  const settings=await getSettings(),targetTitle=metadataKey(searchTitle(input,settings.siteName)),targetDescription=metadataKey(input.metaDescription),keyword=metadataKey(input.focusKeyword);
  const duplicates=[],similarTopics=[];
  const cursor=Post.find({status:{$ne:'archived'},...(input.id?{_id:{$ne:input.id}}:{})}).select('title seoTitle metaDescription focusKeyword slug status').lean().cursor();
  for await(const p of cursor){
   const fields=[];
   if(targetTitle&&metadataKey(searchTitle(p,settings.siteName))===targetTitle)fields.push('search title');
   if(targetDescription&&metadataKey(p.metaDescription)===targetDescription)fields.push('meta description');
   if(fields.length&&duplicates.length<20)duplicates.push({id:p._id,title:p.title,status:p.status,fields});
   if(keyword&&metadataKey(p.focusKeyword)===keyword&&similarTopics.length<10)similarTopics.push({id:p._id,title:p.title,status:p.status});
  }
  res.json({duplicates,similarTopics,indexingEnabled:process.env.ALLOW_INDEXING==='true'});
 });
 app.get('/api/admin/seo/links',async(req,res)=>{
  const q=String(req.query.q||'').trim().slice(0,100),filter={...publishedQuery(),noindex:false};
  if(q)filter.title={$regex:literal(q),$options:'i'};
  const rows=await Post.find(filter).select('title slug').sort({publishedAt:-1}).limit(10).lean();
  res.json(rows.map(p=>({id:p._id,title:p.title,url:`/${p.slug}/`})));
 });
}
