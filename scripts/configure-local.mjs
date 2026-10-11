import express from 'express';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const app=express(),token=crypto.randomBytes(32).toString('hex');
app.use(express.urlencoded({extended:false,limit:'16kb'}));
app.use((_req,res,next)=>{res.set({'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"});next();});
app.get('/',(_req,res)=>res.type('html').send(`<!doctype html><html lang="bn"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>BizAIPro database setup</title><style>body{font:18px system-ui;background:#f3f6f0;color:#223c2d;max-width:720px;margin:60px auto;padding:24px}form{background:white;padding:30px;border-radius:16px}input{display:block;box-sizing:border-box;width:100%;padding:14px;margin:12px 0 24px}button{padding:15px 24px;background:#27654b;color:white;border:0;border-radius:8px;font:inherit}p{line-height:1.7}</style><h1>BizAIPro — database connection</h1><p>Atlas → Connect → Drivers থেকে connection string copy করুন। <code>&lt;db_password&gt;</code> অংশে আপনার database password বসান। নিচে Save করলে এটি শুধু এই কম্পিউটারের private configuration file-এ রাখা হবে।</p><form method="post" action="/save"><input type="hidden" name="token" value="${token}"><label>MongoDB connection string<input type="password" name="uri" autocomplete="off" required placeholder="mongodb+srv://..."></label><button>Save connection locally</button></form><p>Saved file: mern/.env.production.local<br>এই form database user বা password পরিবর্তন করে না।</p></html>`));
app.post('/save',async(req,res)=>{
 if(req.body.token!==token||req.get('Origin')!=='http://localhost:3002')return res.sendStatus(403);
 const uri=String(req.body.uri||'').trim();
 if(!/^mongodb(?:\+srv)?:\/\//.test(uri)||/[\r\n<>]/.test(uri))return res.status(400).send('Use the complete connection string with your password in place of the placeholder. Go back and try again.');
 try{const url=new URL(uri);if(!url.username||!url.password)return res.status(400).send('Database username and password are required.');url.pathname='/bizaipro';
 await fs.writeFile('.env.production.local',`MONGODB_URI=${JSON.stringify(url.toString())}\n`,{mode:0o600});res.type('html').send('<h1>Connection saved locally.</h1><p>এখন chat-এ “connection saved” লিখুন। Password পাঠানোর দরকার নেই।</p>');
 }catch{res.status(400).send('Invalid connection string. Go back and check it.');}
});
app.listen(3002,'127.0.0.1',()=>console.log('Private local setup: http://localhost:3002'));
