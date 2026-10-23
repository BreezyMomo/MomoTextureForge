import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {decodeZIP} from '../web/resource-zip.js';
import {project,node} from '../web/tree-model.js';
const built=process.argv.includes('--built'),root=resolve('web'),out=resolve('test-results/shader-reference');await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname,file=built?resolve('site/index.html'):resolve(root,'.'+(path==='/'?'/index.html':path));if(!built&&!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',built?'text/html':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.glsl':'text/plain','.css':'text/css'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port,fixture=project();fixture.root.children=[node('shape','HeartLeafTeardrop')];
 const sketch=fixture.root.children[0].postEffects.sketch;Object.assign(sketch,{enabled:true,fillStyle:3,hatchGap:18,hatchWidth:2,fillColor:'#3498db',roughness:2.4});
 await page.goto(origin+'/#tree='+Buffer.from(JSON.stringify(fixture)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 const initial=await page.evaluate(()=>({draft:localStorage.getItem('momo-texture-tree:draft:v1'),hash:location.hash,undo:document.querySelector('#undo').disabled}));
 assert.equal(await page.locator('#shader-workbench,.shader-workbench').count(),0);
 await page.locator('#node-tree .tree-node-name').first().click();await page.locator('#inspector-tabs').getByRole('button',{name:'合成',exact:true}).click();
 const effects=page.locator('#inspector [data-module="modules.imageFilters"]');if(await effects.getAttribute('open')===null)await effects.locator(':scope>summary .inspector-module-title').click();
 const button=effects.getByRole('button',{name:'下载填充 Shader 参考包',exact:true});await button.waitFor();
 const downloading=page.waitForEvent('download',{timeout:120000});await button.click();const download=await downloading,bytes=await readFile(await download.path()),files=await decodeZIP(bytes);
 for(const name of ['handdrawn-fill.hlsl','HanddrawnFillURP.shader','mask.png','editor-preview.png','reference-preview.png','README.en.md'])assert.ok(files.has(name),name);
 const manifest=JSON.parse(new TextDecoder().decode(files.get('parameters.json')));assert.equal(manifest.parameters.style,2);assert.equal(manifest.parameters.gap,18);assert.equal(manifest.parameters.inkColor,'#3498db');assert.equal(manifest.parameters.roughness,.24);
 assert.equal(manifest.sourceEffect.values.roughness,2.4);assert.equal(manifest.sourceEffect.conversion,'approximate-fill-only');assert.equal(manifest.input.channel,'red');assert.equal(manifest.target.engineCompilation,'not-run');assert.ok(!JSON.stringify(manifest).includes('children'));
 for(const name of ['mask.png','reference-preview.png','editor-preview.png'])assert.deepEqual([...files.get(name).subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.notDeepEqual(files.get('reference-preview.png'),files.get('editor-preview.png'));
 const stats=await page.evaluate(async entries=>{const result={};for(const [name,bytes]of entries){const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'})),c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();const data=ctx.getImageData(0,0,c.width,c.height).data;let white=0,black=0,clear=0,covered=0;for(let i=0;i<data.length;i+=4){if(data[i]>200)white++;if(data[i]<10)black++;if(data[i+3]===0)clear++;if(data[i+3]>20)covered++;}result[name]={white,black,clear,covered};}return result;},['mask.png','reference-preview.png'].map(name=>[name,[...files.get(name)]]));
 assert.ok(stats['mask.png'].white>100);assert.ok(stats['mask.png'].black>100);assert.equal(stats['mask.png'].clear,0);assert.ok(stats['reference-preview.png'].covered>100);assert.ok(stats['reference-preview.png'].clear>100);
 assert.deepEqual(await page.evaluate(()=>({draft:localStorage.getItem('momo-texture-tree:draft:v1'),hash:location.hash,undo:document.querySelector('#undo').disabled})),initial);
 await page.locator('#language-settings').selectOption('en');const english=effects.getByRole('button',{name:'Download fill shader reference',exact:true});await english.waitFor();assert.equal(await page.locator('.shader-workbench').count(),0);
 await page.setViewportSize({width:768,height:1000});assert.equal(await english.count(),1);
 // Unsupported styles report the limitation rather than silently substituting a fill.
 const style=effects.locator('[data-effect="sketch"] select').first();await style.selectOption('0');await english.click();await page.waitForFunction(()=>document.querySelector('#tree-toast')?.textContent.includes('no shader reference'));
 if(!built){
  const gpu=await page.evaluate(async maskBytes=>{const {ShaderReferenceRenderer}=await import('./shader-reference-renderer.js'),{shaderDefaults,SHADER_FIELDS}=await import('./shader-reference.js');const bitmap=await createImageBitmap(new Blob([new Uint8Array(maskBytes)],{type:'image/png'})),mask=document.createElement('canvas');mask.width=bitmap.width;mask.height=bitmap.height;mask.getContext('2d').drawImage(bitmap,0,0);bitmap.close();const r=new ShaderReferenceRenderer(document.createElement('canvas'));r.setMask(mask);let count=0;try{for(let style=0;style<6;style++)for(const s of SHADER_FIELDS)for(const value of [s.min,s.max]){r.draw({...shaderDefaults(),style,[s.key]:value},.7,64);count++;}return {count};}finally{r.dispose();}},[...files.get('mask.png')]);assert.equal(gpu.count,132);
 }
 await writeFile(out+(built?'/built.zip':'/source.zip'),bytes);assert.deepEqual(errors,[]);console.log({built,export:true,effectParameters:true,comparisonImages:true,projectPreserved:true,english:true,unsupported:true,noWorkbench:true,errors});
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
