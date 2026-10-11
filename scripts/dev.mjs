import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {MongoMemoryServer} from 'mongodb-memory-server';
const dbPath=path.resolve('.local',process.env.LOCAL_DB_NAME||'database');
await fs.mkdir(dbPath,{recursive:true});
const mongo=await MongoMemoryServer.create({instance:{dbPath,dbName:'bizaipro',storageEngine:'wiredTiger'}});
const port=process.env.LOCAL_PORT||'3000';
const env={...process.env,NODE_ENV:'development',MONGODB_URI:mongo.getUri(process.env.LOCAL_DB_NAME||'bizaipro'),SITE_URL:`http://localhost:${port}`,PORT:port,ALLOW_INDEXING:'false',SESSION_SECRET:process.env.SESSION_SECRET||crypto.randomBytes(48).toString('hex')};
await fs.writeFile('.local/runtime.json',JSON.stringify({MONGODB_URI:env.MONGODB_URI},null,2));
if(process.env.LOCAL_ADMIN_EMAIL&&process.env.LOCAL_ADMIN_PASSWORD){const p=spawn(process.execPath,['scripts/create-admin.mjs'],{env:{...env,ADMIN_EMAIL:process.env.LOCAL_ADMIN_EMAIL,ADMIN_PASSWORD:process.env.LOCAL_ADMIN_PASSWORD,ADMIN_NAME:'Alton'},stdio:'inherit'});await new Promise(r=>p.on('exit',r));}
if(process.env.IMPORT_WORDPRESS==='true'){const p=spawn(process.execPath,['scripts/import-wordpress.mjs'],{env,stdio:'inherit'});await new Promise((resolve,reject)=>p.on('exit',code=>code?reject(new Error('Import failed')):resolve()));}
const child=spawn(process.execPath,['server/index.mjs'],{env,stdio:'inherit'});
const stop=async()=>{child.kill();await mongo.stop({doCleanup:false,force:false});process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);child.on('exit',stop);
