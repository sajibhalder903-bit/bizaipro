import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
const input=JSON.parse((await fs.readFile('exports/wordpress-public.json','utf8')).replace(/^\uFEFF/,''));
await fs.mkdir('exports/media',{recursive:true});
const output={checkedAt:new Date().toISOString(),pages:{},media:[],failures:[]};
const images=new Set();
const contents=[...input.posts,...input.pages];
let cursor=0;
async function worker(){while(cursor<contents.length){const p=contents[cursor++];try{
 const r=await fetch(p.link,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);const html=await r.text();
 const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>Object.fromEntries([...m[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(x=>[x[1].toLowerCase(),x[2]])));
 const robots=metas.find(m=>m.name?.toLowerCase()==='robots')?.content||'';
 output.pages[p.id]={title:html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'',description:metas.find(m=>m.name==='description')?.content||'',noindex:/\bnoindex\b/i.test(robots),robots};
 for(const match of p.content.rendered.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi))images.add(match[1]);
 const image=p._embedded?.['wp:featuredmedia']?.[0]?.source_url;if(image)images.add(image);
}catch(error){output.failures.push({url:p.link,error:error.message});}}}
await Promise.all(Array.from({length:4},worker));
for(const source of images){try{
 const url=new URL(source);if(url.hostname!=='bizaipro.com'||!url.pathname.startsWith('/wp-content/uploads/'))continue;
 const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);
 const raw=Buffer.from(await r.arrayBuffer());if(raw.length>20*1024*1024)throw new Error('Image exceeds 20 MB');
 const id=crypto.createHash('sha256').update(source).digest('hex').slice(0,32);
 const {data,info}=await sharp(raw,{limitInputPixels:40000000}).rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer({resolveWithObject:true});
 await fs.writeFile(`exports/media/${id}.webp`,data);
 output.media.push({source,legacyPath:url.pathname,url:`/media/${id}.webp`,file:`exports/media/${id}.webp`,bytes:info.size,width:info.width,height:info.height,name:url.pathname.split('/').pop()});
}catch(error){output.failures.push({url:source,error:error.message});}}
await fs.writeFile('exports/migration-assets.json',JSON.stringify(output,null,2));
console.log(`Verified ${Object.keys(output.pages).length} pages; copied ${output.media.length} images; failures ${output.failures.length}`);
if(output.failures.length)process.exitCode=1;
