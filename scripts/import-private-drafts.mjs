import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {Post} from '../server/models.mjs';
import {cleanContent,isReservedSlug} from '../server/content.mjs';
dotenv.config({path:'.env.production.local',quiet:true});
const rows=JSON.parse((await fs.readFile('.local/wordpress-full-normalized.json','utf8')).replace(/^\uFEFF/,''));
const drafts=rows.filter(x=>['post','page'].includes(x.type)&&['draft','pending','private'].includes(x.status));
const report={source:drafts.length,imported:[],existing:[]};
await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:15000});
try{
 for(const row of drafts){
  const wpId=Number(row.wpId);
  if(await Post.exists({wpId})){report.existing.push(wpId);continue;}
  let slug=row.slug||`wordpress-draft-${wpId}`;
  if(isReservedSlug(slug)||await Post.exists({slug}))slug=`wordpress-draft-${wpId}`;
  const meta=row.meta||{};
  await Post.create({wpId,slug,title:row.title||`WordPress draft ${wpId}`,kind:row.type,
   content:cleanContent(row.content||''),excerpt:row.excerpt||'',status:'draft',noindex:true,
   seoTitle:meta.rank_math_title||'',metaDescription:meta.rank_math_description||'',
   focusKeyword:meta.rank_math_focus_keyword||'',author:'BizAIPro Editorial'});
  report.imported.push(wpId);
 }
 const ids=drafts.map(x=>Number(x.wpId));
 report.verifiedPrivate=await Post.countDocuments({wpId:{$in:ids},status:'draft',noindex:true});
 if(report.verifiedPrivate!==drafts.length)throw new Error('Draft privacy/count verification failed');
 await fs.writeFile('.local/private-draft-migration-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({source:report.source,imported:report.imported.length,existing:report.existing.length,verifiedPrivate:report.verifiedPrivate}));
}finally{await mongoose.disconnect();}
