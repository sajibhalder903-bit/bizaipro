import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {MongoMemoryServer} from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {createApp} from '../server/app.mjs';
import {User,Post,Revision,Redirect,defaults,publishedQuery} from '../server/models.mjs';
import {cleanContent,isReservedSlug} from '../server/content.mjs';
import {calculate} from '../shared/calculators.mjs';
let mongo,app,agent,csrf,uploadDir;
const base={title:'A useful business workflow',slug:'test-workflow',kind:'post',content:'<h2>Start here</h2><p>Useful content.</p>',excerpt:'A practical guide.',status:'draft',category:'Guides',tags:[],featuredImage:'',imageAlt:'',seoTitle:'',metaDescription:'',focusKeyword:'',noindex:true,featured:false,author:'Test Editor'};
before(async()=>{
 mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri());
 await Promise.all([Post.init(),User.init(),Redirect.init()]);
 uploadDir=await fs.mkdtemp(path.join(os.tmpdir(),'bizaipro-test-'));
 app=createApp({mongoUrl:mongo.getUri(),secret:'a'.repeat(64),siteUrl:'http://localhost:3000',uploadDir});
 await User.create({email:'test@example.com',name:'Test',passwordHash:await bcrypt.hash('test-password-for-suite',4),role:'admin'});
 agent=request.agent(app);const session=await agent.get('/api/auth/session');csrf=session.body.csrf;
});
after(async()=>{await app.locals.close();await mongoose.disconnect();await mongo.stop();await fs.rm(uploadDir,{recursive:true,force:true});});
const write=(method,url,body)=>agent[method](url).set('X-CSRF-Token',csrf).set('Origin','http://localhost:3000').send(body);
test('unauthenticated CMS requests and CSRF attacks are rejected',async()=>{
 assert.equal((await request(app).get('/api/admin/posts')).status,401);
 assert.equal((await agent.post('/api/auth/login').send({})).status,403);
 assert.equal((await agent.post('/api/auth/login').set('X-CSRF-Token','é'.repeat(64)).send({})).status,403);
 assert.equal((await agent.post('/api/auth/login').set('X-CSRF-Token',csrf).set('Origin','https://attacker.example').send({})).status,403);
});
test('login rotates token and authenticates subsequent requests',async()=>{
 const bad=await write('post','/api/auth/login',{email:'test@example.com',password:'wrong'});assert.equal(bad.status,401);
 const login=await write('post','/api/auth/login',{email:'test@example.com',password:'test-password-for-suite'});assert.equal(login.status,200);assert.notEqual(login.body.csrf,csrf);csrf=login.body.csrf;
 assert.equal((await agent.get('/api/admin/dashboard')).status,200);
});
test('save, publish, revisions, URL redirects and stale edit protection',async()=>{
 const created=await write('post','/api/admin/posts',base);assert.equal(created.status,200);const id=created.body._id;
 const update={...base,slug:'renamed-workflow',status:'published',version:1};
 const saved=await write('put',`/api/admin/posts/${id}`,update);assert.equal(saved.status,200);assert.equal(saved.body.version,2);
 assert.equal(await Post.countDocuments({...publishedQuery(),_id:id}),1);
 assert.equal(await Revision.countDocuments({postId:id}),1);
 assert.equal((await Redirect.findOne({from:'/test-workflow/'})).to,'/renamed-workflow/');
 assert.equal((await write('put',`/api/admin/posts/${id}`,update)).status,409);
 assert.equal((await write('post','/api/admin/posts',{...base,slug:'renamed-workflow'})).status,409);
});
test('drafts and scheduled content stay private until publication',async()=>{
 const scheduled=await write('post','/api/admin/posts',{...base,slug:'scheduled-post',status:'scheduled',publishedAt:new Date(Date.now()+86400000).toISOString()});assert.equal(scheduled.status,200);
 assert.equal(await Post.countDocuments({...publishedQuery(),_id:scheduled.body._id}),0);
 assert.equal((await write('post','/api/admin/posts',{...base,slug:'bad-schedule',status:'scheduled'})).status,400);
});
test('reserved application paths and script content are controlled',async()=>{
 for(const slug of ['admin/settings','api/health','assets/file','tools'])assert.equal((await write('post','/api/admin/posts',{...base,slug})).status,400);
 assert.equal(isReservedSlug('tools/roas-calculator'),false);
 const safe=cleanContent('<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a>');assert.doesNotMatch(safe,/script|onerror|javascript/);
});
test('image upload converts to WebP and rejects non-images',async()=>{
 const input=await sharp({create:{width:8,height:8,channels:3,background:'#27654b'}}).png().toBuffer();
 const result=await agent.post('/api/admin/media').set('X-CSRF-Token',csrf).attach('image',input,'test.png');assert.equal(result.status,201);assert.match(result.body.url,/\.webp$/);
 const served=await request(app).get(result.body.url);assert.equal(served.status,200);assert.match(served.headers['content-type'],/image\/webp/);
 assert.equal((await agent.post('/api/admin/media').set('X-CSRF-Token',csrf).attach('image',Buffer.from('not an image'),'bad.png')).status,400);
});
test('settings and backups persist; redirect loops fail',async()=>{
 assert.equal((await write('put','/api/admin/settings',{...defaults,heroTitle:'Updated homepage'})).status,200);
 assert.equal((await agent.get('/api/admin/settings')).body.heroTitle,'Updated homepage');
 assert.equal((await write('post','/api/admin/redirects',{from:'/old/',to:'/new/'})).status,200);
 assert.equal((await write('post','/api/admin/redirects',{from:'/new/',to:'/old/'})).status,400);
 const backup=await agent.get('/api/admin/export');assert.equal(backup.status,200);assert.ok(backup.body.posts.length>=2);
});
test('calculator math handles normal and invalid denominators',()=>{
 assert.equal(calculate('roas-calculator',[100,400]),'4 × ROAS');
 assert.throws(()=>calculate('roas-calculator',[0,400]));
});
test('SEO endpoints require authentication, isolate drafts, and find duplicate metadata',async()=>{
 assert.equal((await request(app).get('/api/admin/seo/audit')).status,401);
 assert.equal((await agent.post('/api/admin/seo/review').send({})).status,403);
 const published=await write('post','/api/admin/posts',{...base,slug:'seo-published',title:'Distinct SEO Test',seoTitle:'Shared search title',metaDescription:'A unique test description.',focusKeyword:'seo testing',status:'published',noindex:false});
 assert.equal(published.status,200);
 const draft=await write('post','/api/admin/posts',{...base,slug:'seo-private',title:'Distinct SEO Private',seoTitle:'Shared search title',metaDescription:'A unique test description.',focusKeyword:'seo testing'});
 assert.equal(draft.status,200);
 const review=await write('post','/api/admin/seo/review',{id:published.body._id,title:published.body.title,seoTitle:'Shared search title',metaDescription:'A unique test description.',focusKeyword:'seo testing'});
 assert.equal(review.status,200);assert.equal(review.body.duplicates.length,1);assert.equal(review.body.duplicates[0].id,draft.body._id);assert.deepEqual(review.body.duplicates[0].fields,['search title','meta description']);
 assert.equal(review.body.similarTopics.length,1);
 const links=await agent.get('/api/admin/seo/links?q=Distinct');assert.equal(links.status,200);assert.equal(links.body.length,1);assert.equal(links.body[0].url,'/seo-published/');
 const audit=await agent.get('/api/admin/seo/audit?status=draft&q=Distinct');assert.equal(audit.body.total,1);assert.equal(audit.body.items[0].id,draft.body._id);assert.ok(audit.body.items[0].checks.length>9);
 const literal=await agent.get('/api/admin/seo/links?q=%5B');assert.equal(literal.status,200);assert.equal(literal.body.length,0);
});
test('logout invalidates the authenticated session',async()=>{
 assert.equal((await write('post','/api/auth/logout',{})).status,200);
 assert.equal((await agent.get('/api/admin/posts')).status,401);
});
