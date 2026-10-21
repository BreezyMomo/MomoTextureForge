import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {vfxPresets} from '../web/vfx-presets.js';
import {project,sanitizeTree} from '../web/tree-model.js';

const root=resolve('web'),out=resolve('test-results/presets');await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))throw Error('Invalid path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 for(const s of vfxPresets()){const p=project();p.root.children=[s.root];Object.assign(p.output,s.output);assert.deepEqual(sanitizeTree(p),p);}
 await page.goto(origin+'/authoring-render.html');
 const result=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{vfxPresets}=await import('./vfx-presets.js'),{project,sanitizeTree}=await import('./tree-model.js'),{encodePNG}=await import('./encoders.js');
  const renderer=new TreeRenderer(document.createElement('canvas')),report=[];
  const sheet=document.createElement('section');sheet.id='preset-sheet';sheet.style.cssText='display:grid;grid-template-columns:repeat(2,280px);gap:12px;padding:20px;width:max-content;background:#151920;color:#e8edf4;font:16px system-ui';document.body.replaceChildren(sheet);
  try{for(const s of vfxPresets()){
   const p=project();p.name=s.name;p.root.children=[s.root];Object.assign(p.output,s.output);const pixels=renderer.draw(p,320,320,{read:true,time:.3,quality:2});if(!pixels.every(Number.isFinite)||renderer.gl.getError())throw Error('GPU '+s.name);
   const copy=renderer.draw(sanitizeTree(JSON.parse(JSON.stringify(p))),320,320,{read:true,time:.3,quality:2});let difference=0,coverage=0,clear=0;for(let i=0;i<pixels.length;i++){difference+=Math.abs(pixels[i]-copy[i]);if(i%4===3){if(pixels[i]>.01)coverage++;else clear++;}}
   const png=await encodePNG(pixels,320,320),img=new Image();img.src=URL.createObjectURL(new Blob([png],{type:'image/png'}));await img.decode();img.width=img.height=280;img.style.cssText='background-color:#20262f;background-image:conic-gradient(#29313c 25%,transparent 0 50%,#29313c 0 75%,transparent 0);background-size:16px 16px;display:block';
   const card=document.createElement('article'),name=document.createElement('p');name.textContent=s.name;name.style.cssText='margin:8px 0;text-align:center';card.append(img,name);sheet.append(card);
   report.push({name:s.name,difference:difference/pixels.length,coverage:coverage/(320*320),clear:clear/(320*320)});
  }}finally{renderer.destroy();}return report;
 });
 for(const r of result){assert.ok(r.coverage>.002&&r.coverage<.85,r.name+' silhouette');assert.ok(r.clear>.1,r.name+' transparent area');assert.ok(r.difference<1e-6,r.name+' roundtrip');}
 await page.locator('#preset-sheet').screenshot({path:out+'/preview.png'});await writeFile(out+'/report.json',JSON.stringify(result,null,2));console.log({presets:result});
 await page.goto(origin+'/examples.html?category=presets');await page.waitForFunction(()=>document.querySelectorAll('#samples article[data-category="presets"]').length===2,null,{timeout:180000});
 await page.locator('article[data-category="presets"] img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
 assert.equal(await page.getByRole('combobox',{name:'示例分类'}).inputValue(),'presets');assert.equal(await page.locator('#samples article:visible').count(),2);
 const links=await page.locator('article[data-category="presets"] a').evaluateAll(links=>links.map(a=>a.href));
 for(const link of links){const p=sanitizeTree(JSON.parse(Buffer.from(new URL(link).hash.slice(6),'base64').toString('utf8')));assert.ok(vfxPresets().some(s=>s.name===p.name));}
 await page.close();const editor=await browser.newPage();try{const link=links.find(link=>JSON.parse(Buffer.from(new URL(link).hash.slice(6),'base64').toString('utf8')).name==='酸液飞溅');await editor.goto(link);await editor.waitForFunction(()=>document.querySelector('#render-status')?.textContent.includes('预览')&&!document.querySelector('#render-status')?.textContent.includes('加载'),null,{timeout:120000});assert.equal(await editor.locator('#preview-error').isVisible(),false);assert.equal(await editor.locator('#project-name').inputValue(),'酸液飞溅');const pending=editor.waitForEvent('download',{timeout:120000});await editor.locator('#export-now').click();await editor.locator('#confirm-export').click();const download=await pending;assert.equal(await download.failure(),null);const png=await readFile(await download.path());assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);await writeFile(out+'/acid-export.png',png);}finally{await editor.close();}
 assert.deepEqual(errors,[]);console.log({editablePresets:2,pngExport:true,errors});
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
