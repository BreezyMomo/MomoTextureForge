import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {project} from '../web/tree-model.js';
import {curveValue} from '../web/channel-curves.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(url==='/'?'/index.html':url));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const errors=[],report={};
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}});page.on('pageerror',e=>errors.push(e.message));const address='http://127.0.0.1:'+server.address().port;
 if(!built){
  await page.goto(address);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  report.pixels=await page.evaluate(async()=>{
   const {TreeRenderer}=await import('/tree-renderer.js'),{project,node}=await import('/tree-model.js'),{curveValue}=await import('/channel-curves.js');const r=new TreeRenderer(document.createElement('canvas')),p=project(),a=p.root.children[0];
   const at=(pixels,x=32,y=32)=>Array.from(pixels.slice((y*64+x)*4,(y*64+x)*4+4)),draw=(stream=false,time=0)=>r.draw(p,64,64,{read:true,stream,quality:1,time});
   a.color={mode:'own',fill:'solid',low:'#ffffff',high:'#804020'};const original=at(draw());
   a.curves.enabled=true;a.curves.red=[[0,0],[1,.5]];const red=at(draw());a.curves.alpha=[[0,0],[1,.4]];const alpha=at(draw());const stream=at(draw(true));
   p.output.mode='rgba';p.output.channels=[10,11,12,8];const canvasRGBA=at(draw()),canvasRGBAStream=at(draw(true));p.output.channels=[12,11,10,8];const swappedRGBA=at(draw());p.output.channels=[0,2,3,8];
   a.curves.enabled=false;const g=node('group'),b=node();g.children=[a];g.transform.x=.3;g.opacity=.5;p.root.children=[g,b];b.color={mode:'own',fill:'solid',low:'#ffffff',high:'#ffffff'};
   p.output.mode='rgba';p.output.channelSources=[{nodeId:a.id,component:'red'},{nodeId:g.id,component:'alpha'},{nodeId:'deleted',component:'height'},null];p.output.channels[3]=6;
   const packed=at(draw(),20),packedStream=at(draw(true),20),right=at(draw(),55);
   const oldSources=p.output.channelSources;p.output.channelSources=[{nodeId:a.id,component:'colorRed'},{nodeId:a.id,component:'colorGreen'},{nodeId:a.id,component:'colorBlue'},{nodeId:a.id,component:'alpha'}];const nodeRGBA=at(draw(),20),nodeRGBAStream=at(draw(true),20);p.output.channelSources=oldSources;
   a.enabled=false;const hidden=at(draw(),20);a.enabled=true;a.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,0],[1,1]]};const animated0=at(draw(false,0),20),animated1=at(draw(false,1),20);
   // Original candidate selection must survive per-node packing, including a
   // cache miss during the isolated pass (a cached full root skips layout work).
   delete a.tracks.opacity;g.opacity=1;g.transform.x=.5;g.children=[a,b];g.arrange[0]=1;g.arrange[1]=2;g.arrange[2]=2;p.root.children=[g];g.instanceContent='cycle-child';
   p.output.channelSources=[{nodeId:a.id,component:'alpha'},{nodeId:b.id,component:'alpha'},null,null];p.output.channels=[0,0,5,8];
   r.draw({...p,output:{...p.output,mode:'color'}},64,64,{read:true,quality:1});r.layoutCache?.clear();const layout=draw();let layoutError=0;for(let i=0;i<layout.length;i+=4)layoutError=Math.max(layoutError,Math.abs(layout[i]+layout[i+1]-layout[i+3]));
   const layoutStream=draw(true);let streamError=0;for(let i=0;i<layout.length;i++)streamError=Math.max(streamError,Math.abs(layout[i]-layoutStream[i]));
   // An instance can be visible at its offset even when the child's global
   // clock is outside its interval. Packing must not reject that source early.
   g.instancePhase=.3;a.timing.start=.5;a.timing.end=1;a.timing.outside='hide';g.instanceContent='all';p.output.channelSources[1]=null;p.output.channels[1]=5;
   const phasePixels=draw(false,0);let phasedMax=0;for(let i=0;i<phasePixels.length;i+=4)phasedMax=Math.max(phasedMax,phasePixels[i]);
   g.instancePhase=0;a.timing.start=0;a.timing.outside='hold';p.output.channelSources[1]={nodeId:b.id,component:'alpha'};
   // Hidden sources remain zero even if an ancestor Alpha curve fills blanks.
   g.curves.enabled=true;g.curves.alpha=[[0,.25],[1,1]];a.enabled=false;const hiddenUnderCurve=at(draw(),20);
   // Identity color curves must not clamp HDR colors when only Alpha is edited.
   const q=project(),c=q.root.children[0];c.color={mode:'own',fill:'solid',low:'#ffffff',high:'#ffffff'};const c2=node(),hdrGroup=node('group');c2.color={...c.color};c2.blend='add';hdrGroup.children=[c,c2];hdrGroup.curves.enabled=true;hdrGroup.curves.alpha=[[0,0],[1,.5]];q.root.children=[hdrGroup];const hdr=at(r.draw(q,64,64,{read:true,quality:1}));
   const smoothProject=project(),smoothNode=smoothProject.root.children[0];smoothNode.curves.enabled=true;
   const shapes=[[[0,0],[.25,.12],[.75,.88],[1,1]],[[0,.2],[.1,.8],[.35,.1],[.8,.9],[1,.3]],Array.from({length:16},(_,i)=>[i/15,(i/15)**2])];let smoothError=0,smoothStreamError=0;
   for(const points of shapes){smoothNode.curves.red=points;for(const gray of [0,16,32,64,96,160,224,240,255]){
    const hex='#'+gray.toString(16).padStart(2,'0').repeat(3);smoothNode.color={mode:'own',fill:'solid',low:hex,high:hex};
    const pixels=at(r.draw(smoothProject,64,64,{read:true,quality:1})),streamPixels=at(r.draw(smoothProject,64,64,{read:true,stream:true,quality:1}));
    smoothError=Math.max(smoothError,Math.abs(pixels[0]-curveValue(points,gray/255)));smoothStreamError=Math.max(smoothStreamError,Math.abs(pixels[0]-streamPixels[0]));
   }}
   r.destroy();return {original,red,alpha,stream,canvasRGBA,canvasRGBAStream,swappedRGBA,nodeRGBA,nodeRGBAStream,packed,packedStream,right,hidden,animated0,animated1,layoutError,streamError,phasedMax,hiddenUnderCurve,hdr,smoothError,smoothStreamError};
  });
  const p=report.pixels,near=(a,b)=>assert.ok(Math.abs(a-b)<.025,`${a} != ${b}`);
  near(p.red[0],p.original[0]*.5);near(p.red[1],p.original[1]);near(p.red[3],p.original[3]);near(p.alpha[3],p.original[3]*.4);near(p.alpha[0],p.red[0]);p.stream.forEach((v,i)=>near(v,p.alpha[i]));p.canvasRGBA.forEach((v,i)=>near(v,p.alpha[i]));p.canvasRGBAStream.forEach((v,i)=>near(v,p.alpha[i]));near(p.swappedRGBA[0],p.alpha[2]);near(p.swappedRGBA[2],p.alpha[0]);[128/255,64/255,32/255,.5].forEach((v,i)=>near(p.nodeRGBA[i],v));p.nodeRGBAStream.forEach((v,i)=>near(v,p.nodeRGBA[i]));
  near(p.packed[0],128/255*.5);near(p.packed[1],.5);near(p.packed[2],0);near(p.packed[3],1);p.packedStream.forEach((v,i)=>near(v,p.packed[i]));near(p.right[0],0);near(p.hidden[0],0);near(p.animated0[0],0);near(p.animated1[0],p.packed[0]);near(p.layoutError,0);near(p.streamError,0);assert.ok(p.phasedMax>.9,'Instance phase must preserve visible source instances');near(p.hiddenUnderCurve[0],0);assert.ok(p.hdr[0]>1,'Alpha-only editing must preserve HDR RGB');assert.ok(p.smoothError<.006,'GPU smooth curves must match CPU evaluation');assert.ok(p.smoothStreamError<.006,'Preview and streamed export must match');
 }
 const draft=project();draft.name='通道测试';const n=draft.root.children[0];n.name='Mask A';n.color={mode:'own',fill:'solid',low:'#ffffff',high:'#808080'};
 await page.goto('about:blank');await page.goto(address+'/#tree='+Buffer.from(JSON.stringify(draft)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('[role=treeitem]').first().click();await page.locator('#inspector-tabs button').nth(1).click();
 const curves=page.locator('.channel-curves-editor');await curves.scrollIntoViewIfNeeded();await curves.getByRole('combobox',{name:'曲线通道',exact:true}).selectOption('alpha');await curves.getByRole('combobox',{name:'曲线预设',exact:true}).selectOption('brighten');
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')));
 assert.equal((await saved()).root.children[0].curves.alpha[1][1],.7);assert.equal(await curves.locator('polyline').count(),0);assert.match(await curves.locator('path.curve-path').getAttribute('d'),/ C/);
 const svg=curves.locator('svg'),box=await svg.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.32);await page.mouse.down();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.25,{steps:4});await page.mouse.up();
 const after=(await saved()).root.children[0].curves;assert.equal(after.enabled,true);assert.ok(after.alpha.some(p=>p[1]>.7&&p[1]<.9));await page.locator('#undo').click();assert.equal((await saved()).root.children[0].curves.alpha[1][1],.7);await page.locator('#redo').click();assert.deepEqual((await saved()).root.children[0].curves,after);
 await mkdir('test-results/channel-tools',{recursive:true});await page.screenshot({path:'test-results/channel-tools/curves-zh.png'});
 await page.locator('#preview-channel').selectOption('rgba');await page.getByRole('combobox',{name:'R · 来源',exact:true}).selectOption(n.id);await page.getByRole('combobox',{name:'R · 写入内容',exact:true}).selectOption('alpha');assert.equal((await saved()).output.channelSources[0].nodeId,n.id);
 await page.locator('#language-settings').selectOption('en');assert.equal(await page.getByRole('combobox',{name:'R · Source',exact:true}).count(),1);await page.screenshot({path:'test-results/channel-tools/packing-en.png'});
 // Exercise the actual export action; preview mode alone must not change the
 // separately selected export output mode.
 await page.locator('#export-now').click();await page.getByRole('combobox',{name:'Output channel',exact:true}).selectOption('rgba');
 const pending=page.waitForEvent('download');await page.locator('#confirm-export').click();const file=await pending;assert.equal(await file.failure(),null);const bytes=await readFile(await file.path());assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 report.exportPNG=await page.evaluate(async bytes=>{const bmp=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'})),canvas=document.createElement('canvas');canvas.width=bmp.width;canvas.height=bmp.height;const ctx=canvas.getContext('2d');ctx.drawImage(bmp,0,0);const pixel=[...ctx.getImageData(Math.floor(bmp.width/2),Math.floor(bmp.height/2),1,1).data];bmp.close();return pixel;},[...bytes]);
 assert.ok(report.exportPNG[0]>250);assert.ok(Math.abs(report.exportPNG[1]-128)<=1);assert.ok(Math.abs(report.exportPNG[2]-128)<=1);assert.equal(report.exportPNG[3],255);
 await file.saveAs('test-results/channel-tools/packed.png');await page.locator('#close-global').click();
 // Keep straight RGB intact when exporting a semi-transparent canvas through
 // the shortcut. The former premultiplied choice would darken it to ~51.
 await page.getByRole('spinbutton',{name:'Opacity',exact:true}).fill('0.4');await page.getByRole('spinbutton',{name:'Opacity',exact:true}).press('Tab');
 await page.getByRole('button',{name:'Use canvas RGBA',exact:true}).click();assert.deepEqual((await saved()).output.channels,[10,11,12,8]);assert.deepEqual((await saved()).output.channelSources,[null,null,null,null]);
 await page.locator('#export-now').click();for(const label of ['Color R (without alpha multiplication)','Color G (without alpha multiplication)','Color B (without alpha multiplication)','Alpha','Constant 0 (black)','Constant 1 (white)','Constant 0.5 (middle gray)'])assert.ok(await page.getByRole('combobox',{name:'R · Write',exact:true}).locator('option').filter({hasText:label}).count()>0);
 const rgbaPending=page.waitForEvent('download');await page.locator('#confirm-export').click();const rgbaFile=await rgbaPending;const rgbaBytes=await readFile(await rgbaFile.path());
 report.originalRGBAExport=await page.evaluate(async bytes=>{const bmp=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'})),canvas=document.createElement('canvas');canvas.width=bmp.width;canvas.height=bmp.height;const ctx=canvas.getContext('2d');ctx.drawImage(bmp,0,0);const pixel=[...ctx.getImageData(bmp.width/2,bmp.height/2,1,1).data];bmp.close();return pixel;},[...rgbaBytes]);
 for(const c of report.originalRGBAExport.slice(0,3))assert.ok(Math.abs(c-128)<=2);assert.ok(Math.abs(report.originalRGBAExport[3]-102)<=1);await page.locator('#close-global').click();

 // Reload the saved draft without the import hash, then verify settings persist.
 await page.goto(address+'/');await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.deepEqual((await saved()).root.children[0].curves,after);assert.deepEqual((await saved()).output.channelSources,[null,null,null,null]);assert.deepEqual((await saved()).output.channels,[10,11,12,8]);
 // A curved midpoint must reach the actual PNG encoder, including static builds.
 const smoothDraft=project(),smoothShape=smoothDraft.root.children[0],control=[[0,0],[.25,.12],[.75,.88],[1,1]];
 smoothShape.color={mode:'own',fill:'solid',low:'#202020',high:'#202020'};smoothShape.curves.enabled=true;smoothShape.curves.red=control;
 await page.goto('about:blank');await page.goto(address+'/#tree='+Buffer.from(JSON.stringify(smoothDraft)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await page.locator('[role=treeitem]').first().click();await page.locator('#inspector-tabs button').nth(1).click();await page.locator('.channel-curves-editor select').first().selectOption('red');
 const graphY=await page.locator('.channel-curves-editor path.curve-path').evaluate(path=>{let a=0,b=path.getTotalLength();for(let i=0;i<30;i++){const m=(a+b)/2;if(path.getPointAtLength(m).x<10+240*32/255)a=m;else b=m;}return path.getPointAtLength((a+b)/2).y;});
 const expected=curveValue(control,32/255);report.graph={actualY:graphY,expectedY:170-expected*160,path:await page.locator('.channel-curves-editor path.curve-path').getAttribute('d')};assert.ok(Math.abs(graphY-(170-expected*160))<.05,'Graph and renderer must use the same interpolation: '+JSON.stringify(report.graph));
 await page.locator('.channel-curves-editor').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/channel-tools/'+(built?'built':'source')+'-smooth.png'});
 await page.locator('#export-now').click();await page.getByRole('combobox',{name:'Output channel',exact:true}).selectOption('color');
 const smoothPending=page.waitForEvent('download');await page.locator('#confirm-export').click();const smoothFile=await smoothPending,smoothBytes=await readFile(await smoothFile.path());
 report.smoothPNG=await page.evaluate(async bytes=>{const bmp=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'})),canvas=document.createElement('canvas');canvas.width=bmp.width;canvas.height=bmp.height;const ctx=canvas.getContext('2d');ctx.drawImage(bmp,0,0);const rgba=[...ctx.getImageData(bmp.width/2,bmp.height/2,1,1).data];bmp.close();return rgba;},[...smoothBytes]);
 assert.ok(Math.abs(report.smoothPNG[0]-expected*255)<2);assert.ok(Math.abs(report.smoothPNG[0]-(32/255/.25*.12)*255)>3,'Export must not use straight-segment values');assert.equal(report.smoothPNG[1],32);assert.equal(report.smoothPNG[3],255);
 assert.deepEqual(errors,[]);report.ui='curves: preset/drag/release/undo/redo/reload; packing: source/component/English/reload';await writeFile('test-results/channel-tools/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
