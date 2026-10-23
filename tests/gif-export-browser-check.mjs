import {decodeZIP} from '../web/resource-zip.js';
// Real editor exports, workers, downloads and decoding. No UI screenshots.
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import omggif from 'omggif';
import {project,node} from '../web/tree-model.js';
const built=process.argv.includes('--built'),offline=process.argv.includes('--file');
const root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const directory=new URL('../test-results/gif/',import.meta.url);await mkdir(directory,{recursive:true});
const address=offline?pathToFileURL(fileURLToPath(new URL('../dist/MomoTextureForge.html',import.meta.url))).href:`http://127.0.0.1:${server.address().port}/`;
const p=project(),shape=node('shape','Circle');p.name='gif-browser';p.canvas.ratio=2;
shape.transform.width=.35;shape.transform.height=.5;shape.color.mode='own';shape.color.fill='solid';shape.color.high='#ff0000';
shape.tracks['transform.x']={mode:'absolute',ease:'linear',keys:[[0,.2],[1,.8]]};
const group=node('group');group.children=[shape];
Object.assign(group.postEffects.tricolor,{enabled:true,shadow:'#00ff00',midtone:'#00ff00',highlight:'#00ff00'});
p.root.children=[group];Object.assign(p.output,{width:64,height:32,fps:10,seconds:.3,exportSeconds:.9,depth:16});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const errors=[],downloads=[],report={built,offline};
try{
 const context=await browser.newContext({viewport:{width:1400,height:1100},acceptDownloads:true});
 await context.addInitScript(()=>localStorage.setItem('momo-texture-language:v1',JSON.stringify(['en','zh-CN'])));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d));
 await page.goto(address+'#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await page.locator('#export-now').click();
 // Labels are selected from the semantic catalog, independent of test OS language.
 await page.locator('#language-settings').selectOption('en');
 const select=page.locator('#global-controls select').first();await select.selectOption('gif');
 assert.equal(await page.locator('#global-controls select[aria-label="PNG precision"]').count(),0);
 assert.equal(await page.getByRole('combobox',{name:'GIF color limit',exact:true}).inputValue(),'256');
 assert.equal(await select.locator('option[value="atlas-preview"]').count(),0);
 for(const format of ['gif','frames','atlas','atlas-exr','batch-atlas']){await select.selectOption(format);assert.equal(await page.locator('.tree-export-preview').count(),1);}
 await select.selectOption('gif');const initialDownloads=downloads.length;await page.locator('#generate-export-preview').click();await page.waitForFunction(()=>document.querySelector('.tree-export-preview img')?.naturalWidth>0);assert.equal(downloads.length,initialDownloads);assert.equal(await select.inputValue(),'gif');
 await page.getByRole('combobox',{name:'GIF color limit',exact:true}).selectOption('32');assert.ok((await page.locator('.tree-export-preview [role=status]').innerText()).includes('Settings changed'));await page.locator('#generate-export-preview').click();await page.waitForFunction(()=>!document.querySelector('.tree-export-preview [role=status]')?.textContent.includes('Settings changed'));
 const confirm=page.locator('#confirm-export');
 async function downloadBytes(name){const wait=page.waitForEvent('download');await confirm.click();const item=await wait,file=new URL(name,directory);await item.saveAs(fileURLToPath(file));await page.waitForFunction(()=>!document.querySelector('#confirm-export').disabled);return new Uint8Array(await readFile(file));}
 async function download(name){return new omggif.GifReader(await downloadBytes(name));}
 const gif=await download((offline?'file':built?'built':'source')+'-transparent.gif');
 assert.equal(gif.width,64);assert.equal(gif.height,32);assert.equal(gif.numFrames(),9);assert.equal(gif.loopCount(),0);
 const centers=[];for(let frame=0;frame<9;frame++){const rgba=new Uint8Array(64*32*4);gif.decodeAndBlitFrameRGBA(frame,rgba);let sum=0,count=0;for(let i=0;i<64*32;i++)if(rgba[i*4+3]){sum+=i%64;count++;assert.ok(rgba[i*4+1]>200&&rgba[i*4]<20,'Group post-processing must be exported');}assert.ok(count>0&&count<64*32);centers.push(sum/count);assert.equal(gif.frameInfo(frame).disposal,2);}
 assert.ok(centers[1]>centers[0]+5&&centers[2]>centers[1]+5,'Keyframed object must advance in each exported frame');for(let i=3;i<9;i++)assert.ok(Math.abs(centers[i]-centers[i%3])<.01,'Export must keep the cycle speed across three loops');report.centers=centers;
 assert.equal(await page.locator('#play-duration').inputValue(),'0.3');assert.equal(await page.getByRole('spinbutton',{name:'Export duration (seconds)',exact:true}).inputValue(),'0.9');
 await page.getByRole('checkbox',{name:'Repeat GIF playback',exact:true}).uncheck();
 await page.getByRole('combobox',{name:'GIF palette',exact:true}).selectOption('local');
 await page.getByRole('checkbox',{name:'Transparent background',exact:true}).uncheck();
 const opaque=await download((offline?'file':built?'built':'source')+'-opaque-once.gif');assert.equal(opaque.loopCount(),null);assert.equal(opaque.frameInfo(0).transparent_index,null);
 // Cancel a live animation and verify that a subsequent worker can export normally.
 await page.getByRole('spinbutton',{name:'Pixel width',exact:true}).fill('512');await page.getByRole('spinbutton',{name:'Pixel width',exact:true}).press('Tab');
 const beforeCancel=downloads.length;await confirm.click();const cancel=page.getByRole('button',{name:'Cancel export',exact:true});await cancel.click();await page.waitForFunction(()=>!document.querySelector('#confirm-export').disabled);await page.waitForTimeout(150);const count=downloads.length;assert.equal(count,beforeCancel,'Canceled GIF must not download');
 await page.getByRole('spinbutton',{name:'Pixel width',exact:true}).fill('64');await page.getByRole('spinbutton',{name:'Pixel width',exact:true}).press('Tab');
 await download((offline?'file':built?'built':'source')+'-after-cancel.gif');assert.equal(downloads.length,count+1);
 // PNG sequence and atlas must sample the same repeated cycle as GIF.
 await page.getByRole('checkbox',{name:'Transparent background',exact:true}).check();
 await select.selectOption('frames');await page.getByRole('combobox',{name:'PNG precision',exact:true}).selectOption('8');
 await page.locator('#generate-export-preview').click();await page.waitForFunction(()=>document.querySelector('.tree-export-preview canvas')&&document.querySelector('.export-preview-overview img')?.naturalWidth>0);
 const module=page.locator('.tree-export-preview');await module.getByRole('button',{name:'Pause',exact:true}).click();await module.getByRole('slider',{name:'Preview frame',exact:true}).evaluate(e=>{e.value='4';e.dispatchEvent(new Event('input'));});assert.equal(await module.locator('output').innerText(),'Frame 5 / 9');
 const files=await decodeZIP(await downloadBytes((offline?'file':built?'built':'source')+'-frames.zip'));assert.equal(files.size,9);
 const pngCenters=async(bytes,atlas=false)=>page.evaluate(async({bytes,atlas})=>{
  const image=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'})),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);image.close();
  const centers=[];for(let frame=0;frame<(atlas?9:1);frame++){const rgba=ctx.getImageData(atlas?(frame%3)*64:0,atlas?Math.floor(frame/3)*32:0,64,32).data;let sum=0,count=0;for(let i=0;i<64*32;i++)if(rgba[i*4+3]>=128){sum+=i%64;count++;}centers.push(sum/count);}return centers;
 },{bytes:[...bytes],atlas});
 const frameCenters=[];for(const bytes of files.values())frameCenters.push((await pngCenters(bytes))[0]);
 for(let i=0;i<9;i++)assert.ok(Math.abs(frameCenters[i]-centers[i])<.01,'PNG frame timing must match GIF');
 await select.selectOption('atlas');await page.getByRole('spinbutton',{name:'Atlas columns',exact:true}).fill('3');await page.getByRole('spinbutton',{name:'Atlas columns',exact:true}).press('Tab');
 const atlas=await downloadBytes((offline?'file':built?'built':'source')+'-atlas.png');const atlasCenters=await pngCenters(atlas,true);
 for(let i=0;i<9;i++)assert.ok(Math.abs(atlasCenters[i]-centers[i])<.01,'Atlas frame timing must match GIF');
 report.sequenceFrames=files.size;report.atlasFrames=atlasCenters.length;
 // Changing either duration leaves the other intact and survives reload.
 const cycle=page.locator('#global-controls').getByRole('spinbutton',{name:'Animation cycle (seconds, 0→1)',exact:true}),duration=page.getByRole('spinbutton',{name:'Export duration (seconds)',exact:true});
 await cycle.fill('0.6');await cycle.press('Tab');assert.equal(await duration.inputValue(),'0.9');assert.equal(await page.locator('#play-duration').inputValue(),'0.6');
 await duration.fill('0.5');await duration.press('Tab');assert.equal(await cycle.inputValue(),'0.6');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')));assert.equal(saved.output.seconds,.6);assert.equal(saved.output.exportSeconds,.5);
 // An oversized delivery atlas must still produce a visible, scaled preview.
 const previewProject=structuredClone(p);previewProject.canvas.ratio=1;Object.assign(previewProject.output,{width:512,height:512,seconds:3,exportSeconds:3,fps:30,columns:8,depth:8});
 await page.goto(address+'#tree='+Buffer.from(JSON.stringify(previewProject)).toString('base64'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#export-now').click();await page.locator('#global-controls select').first().selectOption('atlas');
 assert.equal(await page.locator('#confirm-export').innerText(),'Start export');const beforePreview=downloads.length;await page.locator('#generate-export-preview').click();await page.locator('.export-preview-overview').waitFor();await page.locator('.export-preview-overview summary').click();
 const image=page.locator('.export-preview-overview img');await image.waitFor();await page.waitForFunction(()=>document.querySelector('.export-preview-overview img')?.naturalWidth>0);
 assert.deepEqual(await image.evaluate(e=>[e.naturalWidth,e.naturalHeight]),[1024,1536]);

 assert.equal(await page.locator('#global-controls input:disabled,#global-controls select:disabled').count(),0);assert.equal(downloads.length,beforePreview);
 assert.equal(await page.getByRole('spinbutton',{name:'Pixel width',exact:true}).inputValue(),'512');
 await page.locator('#language-settings').selectOption('zh-CN');assert.equal(await page.locator('#generate-export-preview').innerText(),'更新预览');report.atlasPreview=[1024,1536];
 assert.deepEqual(errors,[]);report.pass=true;report.downloads=downloads.length;report.errors=errors;
 await writeFile(new URL((offline?'file':built?'built':'source')+'-report.json',directory),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
