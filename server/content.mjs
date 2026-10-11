import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
export const safePath = z.string().max(250).regex(/^\/(?!\/)[a-zA-Z0-9\-_/]*$/);
const imageUrl = z.string().max(1500).refine(v=>!v || /^\/media\/[a-f0-9-]+\.webp$/.test(v) || /^https:\/\/[^\s<>"']+$/.test(v), 'Use an uploaded image or an HTTPS image URL');
export const postInput = z.object({
  title:z.string().trim().min(1).max(180),slug:z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/),
  kind:z.enum(['post','page']),content:z.string().max(500000),excerpt:z.string().max(500),status:z.enum(['draft','published','scheduled','archived']),
  category:z.string().max(80),tags:z.array(z.string().max(50)).max(20),featuredImage:imageUrl,imageAlt:z.string().max(250),
  seoTitle:z.string().max(120),metaDescription:z.string().max(320),focusKeyword:z.string().max(100),
  noindex:z.boolean(),featured:z.boolean(),author:z.string().max(100),publishedAt:z.string().nullable().optional(),version:z.number().int().min(1).optional()
});
const menu = z.array(z.object({label:z.string().min(1).max(60),url:safePath})).max(12);
export const settingsInput = z.object({siteName:z.string().min(1).max(60),tagline:z.string().max(100),heroEyebrow:z.string().max(100),heroTitle:z.string().min(1).max(180),heroDescription:z.string().max(500),heroButton:z.string().max(60),heroButtonUrl:safePath,accentColor:z.string().regex(/^#[0-9a-fA-F]{6}$/),logoUrl:imageUrl,footerText:z.string().max(300),contactEmail:z.union([z.literal(''),z.email()]),navigation:menu,footerLinks:menu,socialLinks:z.array(z.object({label:z.string().max(50),url:z.url().refine(s=>s.startsWith('https://'))})).max(8)});
export function cleanContent(html) {
 return sanitizeHtml(html,{allowedTags:[...sanitizeHtml.defaults.allowedTags,'img','h1','h2','figure','figcaption','details','summary'],allowedAttributes:{a:['href','title','rel','target'],img:['src','alt','width','height','loading'], '*':['id'],th:['colspan','rowspan'],td:['colspan','rowspan']},allowedSchemes:['https','http','mailto'],allowProtocolRelative:false,transformTags:{a:(tag,attrs)=>({tagName:'a',attribs:{...attrs,...(attrs.target==='_blank'?{rel:'noopener noreferrer'}:{})}})}});
}
export const reserved = new Set(['admin','api','assets','media','blog','search','free-tools','category','sitemap.xml','robots.txt']);
export const isReservedSlug = slug => reserved.has(slug.split('/')[0]) || slug === 'tools';
export function escapeHtml(s='') {return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
