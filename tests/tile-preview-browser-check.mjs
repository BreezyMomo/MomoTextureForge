import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
const root=fileURLToPath(new URL('..',import.meta.url)),out=resolve(root,'test-results/tile-preview');await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname,file=path==='/built.html'?resolve(root,'site/index.html'):resolve(root,'web','.'+(path==='/'?'/index.html':path));if(path!=='/built.html'&&!file.startsWith(resolve(root,'web')+sep))throw Error();res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.glsl':'text/plain','.css':'text/css'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const p=project(),n=node('shape','Circle');n.name='平铺光点';n.params[0]=.35;n.transform.width=n.transform.height=.6;n.transform.x=.4;n.transform.y=.6;p.root.children=[n];p.canvas.ratio=4/3;p.output.width=128;p.output.height=96;
 const address='http://127.0.0.1:'+server.address().port+(process.argv.includes('--standalone')?'/built.html':'/');
 await page.goto(address+'#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.waitForFunction(()=>document.querySelector('#render-status')?.textContent.includes('预览'));
 await page.getByRole('button',{name:'选择 平铺光点',exact:true}).click();await page.locator('#show-guides').check();const draft=await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),presets=page.getByRole('combobox',{name:'平铺检查布局',exact:true}),toggle=page.getByRole('button',{name:'平铺检查',exact:true});
 assert.deepEqual(await presets.locator('option').allTextContents(),['2×2','3×3','4×4']);const results=[];
 const inspect=()=>page.locator('#tree-canvas').evaluate(c=>{const w=c.width,h=c.height,data=c.getContext('2d').getImageData(0,0,w,h).data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let components=0;for(let i=0;i<seen.length;i++){if(seen[i]||data[i*4+3]<128)continue;components++;let first=0,last=1;queue[0]=i;seen[i]=1;while(first<last){const a=queue[first++],x=a%w;for(const b of [x?a-1:-1,x<w-1?a+1:-1,a-w,a+w])if(b>=0&&b<seen.length&&!seen[b]&&data[b*4+3]>=128){seen[b]=1;queue[last++]=b;}}}return {w,h,components};});
 for(const size of [2,3,4]){await presets.selectOption(String(size));await page.waitForFunction(count=>document.querySelectorAll('#selection-guide polygon').length===count,size*size);assert.equal(await toggle.getAttribute('aria-pressed'),'true');const image=await inspect();assert.equal(image.components,size*size);assert.ok(Math.max(image.w,image.h)<=2048);results.push({size,...image});}
 await toggle.click();await page.waitForFunction(()=>document.querySelectorAll('#selection-guide polygon').length===1);assert.equal((await inspect()).components,1);assert.equal(await presets.inputValue(),'4');await toggle.click();await page.waitForFunction(()=>document.querySelectorAll('#selection-guide polygon').length===16);assert.equal((await inspect()).components,16);
 assert.equal(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),draft);
 await page.locator('#export-now').click();const downloaded=page.waitForEvent('download',{timeout:120000});await page.locator('#confirm-export').click();const file=await downloaded;assert.equal(await file.failure(),null);const png=await readFile(await file.path());assert.equal(png.readUInt32BE(16),128);assert.equal(png.readUInt32BE(20),96);assert.deepEqual(errors,[]);
 const report={presets:results,rememberedAfterToggle:true,projectUnchanged:true,exportSize:[128,96],errors};await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
