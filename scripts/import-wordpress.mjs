import 'dotenv/config';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import {Post,Setting,Media,defaults} from '../server/models.mjs';
import {cleanContent} from '../server/content.mjs';
import {plain} from '../shared/seo.mjs';
const input=JSON.parse((await fs.readFile(process.argv[2]||'exports/wordpress-public.json','utf8')).replace(/^\uFEFF/,''));
await mongoose.connect(process.env.MONGODB_URI);
const report={imported:[],existing:[],systemPages:[],review:[]};
const assets=JSON.parse(await fs.readFile('exports/migration-assets.json','utf8').catch(()=>'{}'));
for(const media of assets.media||[]){const {file,source,...metadata}=media;await Media.updateOne({url:media.url},{$setOnInsert:{...metadata,data:await fs.readFile(file)}},{upsert:true});}
const decode=s=>s.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&rsquo;/g,"'").replace(/&nbsp;/g,' ');
for(const [kind,items] of [['post',input.posts],['page',input.pages]])for(const wp of items){
 const url=new URL(wp.link),slug=url.pathname.replace(/^\/|\/$/g,'');
 if(['','blog','tools','free-tools'].includes(slug)){report.systemPages.push({wpId:wp.id,path:url.pathname,reason:'React homepage, journal or tool directory replaces the WordPress template. Original HTML remains in export.'});continue;}
 const terms=wp._embedded?.['wp:term']?.flat().filter(t=>t.taxonomy==='category')||[];
 const sourceSeo=assets.pages?.[wp.id];
 if(await Post.exists({slug})){await Post.updateOne({slug,wpId:wp.id},{$set:{categorySlugs:terms.map(t=>t.slug),...(sourceSeo?{noindex:sourceSeo.noindex}: {})}});report.existing.push(slug);continue;}
 const metadata=wp.yoast_head_json||{};
 let html=wp.content?.rendered||'';
 if(['pdf-organizer','ai-roi-calculator'].includes(slug))html=html.replace(/<form\b[\s\S]*?<\/form>/gi,'');
 html=html.replace(/https?:\/\/(?:www\.)?bizaipro\.com(\/[^"'\s<>]*)/g,(match,p)=>p.startsWith('/wp-content/')?match:p);
 const image=wp._embedded?.['wp:featuredmedia']?.[0];
 for(const media of assets.media||[])html=html.replaceAll(media.source,media.url);
 const categories=wp._embedded?.['wp:term']?.flat().filter(t=>t.taxonomy==='category').map(t=>t.name)||[];
 const author=wp._embedded?.author?.[0]?.name||'BizAIPro Editorial';
 await Post.create({title:decode(plain(wp.title.rendered)),slug,kind,content:cleanContent(html),excerpt:decode(plain(wp.excerpt?.rendered||'')).slice(0,350),status:'published',publishedAt:new Date(wp.date_gmt+'Z'),category:decode(categories[0]|| (slug.startsWith('tools/')?'Free Tools':'Resources')),categorySlugs:terms.map(t=>t.slug),author,featuredImage:assets.media?.find(m=>m.source===image?.source_url)?.url||image?.source_url||'',imageAlt:decode(image?.alt_text||''),seoTitle:decode(sourceSeo?.title||metadata.title||''),metaDescription:decode(sourceSeo?.description||metadata.description||''),noindex:sourceSeo?sourceSeo.noindex:true,wpId:wp.id,sourceUrl:wp.link,createdAt:new Date(wp.date_gmt+'Z'),updatedAt:new Date(wp.modified_gmt+'Z')});
 report.imported.push({slug,wpId:wp.id});
 if(/\[[\w-]+[^\]]*\]/.test(html)||(!html.trim()&&!slug.startsWith('tools/')))report.review.push({slug,reason:'WordPress dynamic content or shortcode requires parity review'});
}
await Setting.updateOne({key:'site'},{$setOnInsert:{value:defaults}},{upsert:true});
await fs.writeFile('exports/migration-report.json',JSON.stringify(report,null,2));console.log(`Imported ${report.imported.length}; already present ${report.existing.length}; application templates ${report.systemPages.length}; review ${report.review.length}`);await mongoose.disconnect();
