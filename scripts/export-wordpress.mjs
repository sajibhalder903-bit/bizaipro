import fs from 'node:fs/promises';
const base=process.env.WORDPRESS_URL||'https://bizaipro.com';
const output={exportedAt:new Date().toISOString(),source:base,posts:[],pages:[],categories:[],media:[]};
for(const type of ['posts','pages','categories','media']){
 for(let page=1,total=1;page<=total;page++){
  const r=await fetch(`${base}/wp-json/wp/v2/${type}?per_page=100&page=${page}&_embed`);
  if(!r.ok)throw new Error(`WordPress ${type}: HTTP ${r.status}`);
  total=Number(r.headers.get('x-wp-totalpages')||1);output[type].push(...await r.json());
 }
}
await fs.mkdir('exports',{recursive:true});await fs.writeFile('exports/wordpress-public.json',JSON.stringify(output,null,2));
console.log(`Exported ${output.posts.length} posts and ${output.pages.length} pages. Public export does not include drafts or private content.`);
