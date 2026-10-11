// Isolated browser smoke test; never connects to the production database.
import {MongoMemoryServer} from 'mongodb-memory-server';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import assert from 'node:assert/strict';
const mongo=await MongoMemoryServer.create();
Object.assign(process.env,{MONGODB_URI:mongo.getUri(),SESSION_SECRET:crypto.randomBytes(48).toString('hex'),NODE_ENV:'development',SITE_URL:'http://127.0.0.1:3017',ALLOW_INDEXING:'false'});
let appModule,server,browser;
try {
 appModule=await import('../server/site.mjs');
 const {User,Post}=await import('../server/models.mjs');
 const password=crypto.randomBytes(24).toString('hex');
 await User.create({email:'preview@example.com',name:'Preview Editor',role:'admin',passwordHash:await bcrypt.hash(password,4)});
 await Post.create({title:'A practical AI workflow for small businesses',slug:'ai-workflow',kind:'post',content:'<h2>Plan your workflow</h2><p>Start with a useful answer for your readers.</p>',status:'draft',author:'BizAIPro Editorial'});
 server=appModule.app.listen(3017,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3017/admin');
 await page.getByLabel('Email address').fill('preview@example.com');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'SEO overview',exact:true}).click();
 await page.getByRole('button',{name:'Improve',exact:true}).waitFor();
 await fs.mkdir('.local/seo-verification',{recursive:true});
 await page.screenshot({path:'.local/seo-verification/overview.png',fullPage:true});
 await page.getByRole('button',{name:'Improve',exact:true}).click();
 await page.getByRole('heading',{name:'SEO writing assistant'}).waitFor();
 await page.getByRole('button',{name:'Suggest description from content'}).click();
 assert.ok(await page.getByLabel(/^Meta description/).inputValue());
 await page.getByRole('button',{name:'Publish',exact:true}).click();
 await page.getByRole('dialog').waitFor();
 assert.match(await page.getByRole('dialog').innerText(),/Site-wide search indexing is disabled/);
 await page.screenshot({path:'.local/seo-verification/review-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'.local/seo-verification/review-mobile.png'});
 await page.getByRole('button',{name:'Back to editor'}).click();
 await page.getByRole('button',{name:'Publish',exact:true}).click();
 await page.getByRole('button',{name:'Confirm publish'}).click();
 await page.getByText('Published successfully.',{exact:false}).waitFor();
 assert.equal((await Post.findOne({slug:'ai-workflow'})).status,'published');
 assert.deepEqual(errors,[]);
 console.log('Browser checks passed: login, SEO audit, edit, summary, publish review, mobile layout capture, confirm publish. No browser errors.');
} finally {
 await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await appModule?.close();await mongo.stop();
}
