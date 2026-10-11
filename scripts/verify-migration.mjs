import fs from 'node:fs/promises';
const source=JSON.parse((await fs.readFile('exports/wordpress-public.json','utf8')).replace(/^\uFEFF/,''));
const assets=JSON.parse(await fs.readFile('exports/migration-assets.json','utf8'));
const base=process.env.VERIFY_URL||'http://localhost:3001';
const rows=[];
const paths=new Set([...source.posts,...source.pages].map(p=>new URL(p.link).pathname));
paths.add('/tools/');paths.add('/free-tools/');paths.add('/admin');paths.add('/sitemap.xml');paths.add('/robots.txt');
for(const p of [...source.posts,...source.pages])for(const term of p._embedded?.['wp:term']?.flat()||[])if(term.taxonomy==='category')paths.add(`/category/${term.slug}/`);
for(const media of assets.media){paths.add(media.url);paths.add(media.legacyPath);}
let queue=[...paths],cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<queue.length){const path=queue[cursor++];try{const r=await fetch(base+path,{signal:AbortSignal.timeout(15000)});rows.push({path,status:r.status});}catch(error){rows.push({path,error:error.message});}}}));
const failures=rows.filter(r=>r.status!==200);
const result={checkedAt:new Date().toISOString(),base,passed:rows.length-failures.length,total:rows.length,failures,rows};
await fs.writeFile('exports/route-verification.json',JSON.stringify(result,null,2));
console.log(`${result.passed}/${rows.length} routes passed`,JSON.stringify(failures));if(failures.length)process.exitCode=1;
