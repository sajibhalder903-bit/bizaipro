export function plain(html = '') { return String(html).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&[^;\s]+;/g,' ').replace(/\s+/g,' ').trim(); }
export function searchTitle(post, siteName='BizAIPro') { return post.seoTitle?.trim() || (post.title ? `${post.title} | ${siteName}` : ''); }
export function seoChecklist(post, siteUrl='https://bizaipro.com', siteName='BizAIPro') {
 const html=post.content||'', text=plain(html), keyword=(post.focusKeyword||'').trim().toLocaleLowerCase();
 const title=searchTitle(post,siteName), description=post.metaDescription?.trim()||'', words=text.split(/\s+/u).filter(Boolean).length;
 const headings=[...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m=>({level:Number(m[1]),text:plain(m[2])}));
 const images=[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
 const missingAlt=images.filter(tag=>! /\balt\s*=\s*(?:"[^"]*"|'[^']*')/i.test(tag)).length;
 let internalLinks=0,externalLinks=0;
 for(const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
  try {const url=new URL(m[1],siteUrl);if(!/^https?:$/.test(url.protocol)||m[1].startsWith('#'))continue;if(url.origin===new URL(siteUrl).origin)internalLinks++;else externalLinks++;}catch{}
 }
 const checks=[
  ['title','Use a concise, descriptive search title',!!title&&title.length<=65,'Preview the actual title below. Around 30–65 characters is an editorial guide, not a Google limit.'],
  ['description','Write a unique meta description',!!description&&description.length<=170,'Summarize this page for readers. Around 120–170 characters is a preview guide, not a ranking rule.'],
  ['keyword','Identify the topic in the search title',!!keyword&&title.toLocaleLowerCase().includes(keyword),'Choose a focus phrase and use it naturally; exact matches are optional.'],
  ['intro','Introduce the topic early',!!keyword&&text.slice(0,700).toLocaleLowerCase().includes(keyword),'Make the opening answer the reader’s intent. Avoid repeating keywords unnaturally.'],
  ['headings','Organize the article with subheadings',headings.some(h=>h.level===2),'Use H2 sections and H3 subsections where they help readers.'],
  ['hierarchy','Keep a clear heading hierarchy',!headings.some((h,i)=>h.level===1||h.level>(i?headings[i-1].level:1)+1),'The page title is already H1. Start body sections with H2; avoid skipped levels.'],
  ['image','Describe the featured image',!!post.featuredImage&&!!post.imageAlt?.trim(),'Choose a relevant cover and describe what it shows.'],
  ['inlineAlt','Set alt attributes on body images',missingAlt===0,`${missingAlt} body image(s) lack alt attributes. Describe informative images; alt="" is valid for decorative images.`],
  ['links','Link to relevant pages on your site',internalLinks>0,'Use the link finder and add a contextual link where it helps the reader.'],
  ['slug','Use a readable URL',!!post.slug&&post.slug.length<=80&&!/\s/.test(post.slug),'Keep the URL descriptive. Changing an existing URL creates a redirect.'],
  ['body','Include meaningful body content',words>0,'Answer the question fully. There is no universal minimum word count.'],
  ['author','Identify the author',!!post.author?.trim(),'Use an accurate author or editorial team name.'],
  ['indexing','Allow search indexing when intended',!post.noindex,'This page is set to noindex. Keep that setting for content you intentionally want excluded.']
 ].map(([id,label,passed,help])=>({id,label,passed,help}));
 return {checks,score:Math.round(checks.filter(c=>c.passed).length/checks.length*100),words,headings,images:images.length,missingAlt,internalLinks,externalLinks,readingMinutes:Math.max(1,Math.ceil(words/220))};
}
export function descriptionSuggestion(post) {const text=plain(post.excerpt||post.content);return text.length<=160?text:text.slice(0,157).replace(/\s+\S*$/,'')+'…';}
export function metadataKey(value='') {return value.trim().replace(/\s+/g,' ').toLocaleLowerCase();}
