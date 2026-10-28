import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=resolve('web'),server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://local').pathname;
  const standalone=path==='/standalone',file=standalone?resolve('dist/MomoTextureForge.html'):resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!standalone&&!file.startsWith(root+sep))throw Error('Invalid path');
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.glsl':'text/plain','.css':'text/css'})[extname(file)]??'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 await mkdir('test-results/startup',{recursive:true});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 let releaseAssets,releaseEditor;
 const assetsGate=new Promise(r=>releaseAssets=r),editorGate=new Promise(r=>releaseEditor=r);
 await page.route('**/resource-assets.js',async route=>{await assetsGate;await route.continue();});
 await page.route('**/tree-app.js',async route=>{await editorGate;await route.continue();});
 await page.goto(origin,{waitUntil:'commit'});
 await page.locator('#startup-status').filter({hasText:'正在读取图形与本地资源'}).waitFor();
 assert.equal(await page.locator('#startup-screen').getAttribute('aria-busy'),'true');
 await page.screenshot({path:'test-results/startup/loading.png',animations:'disabled'});
 releaseAssets();
 await page.locator('#startup-status').filter({hasText:'正在准备编辑器'}).waitFor();
 releaseEditor();
 await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await page.locator('#startup-screen').waitFor({state:'detached'});
 await page.locator('#open-graphics-library').click();
 await page.getByRole('dialog').waitFor();
 assert.deepEqual(errors,[]);
 await page.close();

 for(const path of ['/','/standalone']){
  // Force WebGL startup to fail after the editor has replaced the initial body.
  const failure=await browser.newPage({viewport:{width:1440,height:900}});
  await failure.addInitScript(()=>{
   localStorage.setItem('startup-preserve-check','kept');
   if(sessionStorage.getItem('startup-retry-ok'))return;
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};
  });
  await failure.goto(origin+path);
  await failure.waitForFunction(()=>document.documentElement.dataset.ready==='error');
  await failure.getByText('画布暂时未能打开',{exact:true}).waitFor();
  assert.equal(await failure.locator('#startup-screen').getAttribute('aria-busy'),'false');
  assert.ok((await failure.locator('#startup-error-detail').textContent()).length>0);
  assert.equal(await failure.evaluate(()=>localStorage.getItem('startup-preserve-check')),'kept');
  await failure.getByText('查看错误信息',{exact:true}).click();
  await failure.screenshot({path:'test-results/startup/error'+(path==='/'?'':'-standalone')+'.png',animations:'disabled'});
  await failure.evaluate(()=>sessionStorage.setItem('startup-retry-ok','1'));
  await failure.getByRole('button',{name:'重新加载',exact:true}).click();
  await failure.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  await failure.locator('#startup-screen').waitFor({state:'detached'});
  assert.equal(await failure.locator('#open-graphics-library').count(),1);
  await failure.close();
 }
 for(const view of ['examples','validate']){
  const page=await browser.newPage();
  await page.goto(origin+'/standalone?view='+view);
  await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  await page.locator('#startup-screen').waitFor({state:'detached'});
  assert.match(await page.title(),view==='examples'?/图形示例/:/浏览器验证/);
  await page.close();
 }
 console.log('Startup passed: visible stages, editor ready, source/standalone WebGL failure and retry, standalone views.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
