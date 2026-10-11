import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {startServer} from '../server/startup.mjs';

test('server listens while database initializes and serves the app only after readiness',async()=>{
 let resolveApplication,closed=false;
 const pending=new Promise(resolve=>{resolveApplication=resolve;});
 const instance=startServer({loadApplication:()=>pending,port:0,host:'127.0.0.1',signals:false});
 try{
  await once(instance.server,'listening');
  const url=`http://127.0.0.1:${instance.server.address().port}`;
  const starting=await fetch(url);
  assert.equal(starting.status,503);
  assert.equal(starting.headers.get('cache-control'),'no-store');
  await starting.text();
  resolveApplication({app:(_req,res)=>res.end('ready'),close:async()=>{closed=true;}});
  await instance.ready;
  const live=await fetch(url);
  assert.equal(live.status,200);
  assert.equal(await live.text(),'ready');
 }finally{await instance.close();}
 assert.equal(closed,true);
});
