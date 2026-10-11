import http from 'node:http';

export function startServer({loadApplication,port=3000,host='0.0.0.0',signals=true}) {
 let application;
 const server=http.createServer((req,res)=>{
  if(application)return application.app(req,res);
  res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Retry-After':'5','X-Robots-Tag':'noindex'});
  res.end('The website is starting. Please try again shortly.');
 });
 server.listen(port,host);
 const ready=Promise.resolve().then(loadApplication).then(value=>{
  application=value;
  console.log('BizAIPro application ready');
  return value;
 });
 const close=async()=>{
  await new Promise(resolve=>server.close(resolve));
  await application?.close?.();
 };
 if(signals){
  ready.catch(error=>{console.error('Application startup failed:',error.name);server.close(()=>process.exit(1));});
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>close().then(()=>process.exit(0)));
 }
 return {server,ready,close};
}
