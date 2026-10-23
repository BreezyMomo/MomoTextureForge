import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {createProjectResource} from '../web/project-resources.js';
import {GRAPHIC_LIST_KEY,serializeGraphicList} from '../web/persistent-graphic-list.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(url==='/'?'/index.html':url));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const p=project();p.name='Free pan';const shape=node('shape','Circle');shape.transform.width=shape.transform.height=.4;p.root.children=[shape];p.output.width=p.output.height=128;
 const entries=['Circle','Ring'].map((type,i)=>createProjectResource(node('shape',type),{name:'Pan trial '+i}));
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({p,key,marker,text})=>{localStorage.setItem('momo-texture-tree:draft:v1',JSON.stringify(p));localStorage.setItem(key,text);localStorage.setItem(marker,'1');},{p,key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,text:serializeGraphicList(entries)});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 const surface=page.locator('#tree-preview-surface'),stage=page.locator('#canvas-stage'),pan=page.locator('#pan-preview'),reset=page.locator('#reset-canvas-view');
 const rect=()=>surface.boundingBox(),storage=()=>page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1'));
 const unchanged=await storage(),undo=await page.locator('#undo').isDisabled();
 const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1.5,message+': '+a+' vs '+b);
 const offset=async()=>{const a=await rect(),b=await stage.boundingBox();return [a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2];};
 async function drag(x,y,dx,dy){const before=await rect();await page.mouse.move(x,y);await page.mouse.down();assert.equal(await stage.getAttribute('data-pan'),'dragging');assert.equal(await stage.evaluate(e=>getComputedStyle(e).cursor),'grabbing');await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();const after=await rect();close(after.x-before.x,dx,'horizontal pan');close(after.y-before.y,dy,'vertical pan');assert.equal(await stage.getAttribute('data-pan'),'ready');}
 let box=await rect(),frame=await stage.boundingBox();assert.ok(box.width<frame.width&&box.height<frame.height,'Canvas starts fully fitted');
 await pan.click();await drag(frame.x+frame.width/2,frame.y+frame.height/2,65,42);await drag(frame.x+8,frame.y+8,-110,-85);
 await page.locator('#zoom').selectOption('0.5');await drag(frame.x+8,frame.y+8,45,27);
 await reset.click();let centered=await offset();close(centered[0],0,'reset x');close(centered[1],0,'reset y');assert.equal(await page.locator('#zoom').inputValue(),'fit');
 await drag(frame.x+8,frame.y+frame.height/2,frame.width+80,0);box=await rect();assert.ok(box.x>frame.x+frame.width,'Canvas can be dragged entirely out of view');await reset.click();
 // Zoom remains anchored to the pointer after panning at fit size.
 await drag(frame.x+frame.width/2,frame.y+frame.height/2,35,20);box=await rect();const u=.65,v=.4,x=box.x+u*box.width,y=box.y+v*box.height;
 await page.mouse.move(x,y);await page.mouse.wheel(0,-100);await page.waitForFunction(()=>document.querySelector('#zoom').value==='1.25');box=await rect();close(box.x+u*box.width,x,'zoom anchor x');close(box.y+v*box.height,y,'zoom anchor y');
 await page.locator('#zoom').selectOption('fit');centered=await offset();close(centered[0],0,'fit x');close(centered[1],0,'fit y');
 // The blank margin supports temporary Space pan and restores the editing tool.
 await page.locator('#canvas-transform').click();await reset.click();await page.mouse.move(frame.x+8,frame.y+8);const play=await page.locator('#play').textContent();await page.keyboard.down('Space');assert.equal(await pan.getAttribute('aria-pressed'),'true');await drag(frame.x+8,frame.y+8,55,30);await page.keyboard.up('Space');assert.equal(await pan.getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#canvas-transform').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#play').textContent(),play);
 const workOffset=await offset(),browse=i=>page.locator('#shape-library .tree-pattern-card[data-entry-id="'+entries[i].id+'"]').locator('.component-inspect').click();
 await browse(0);await pan.click();frame=await stage.boundingBox();await drag(frame.x+8,frame.y+8,24,-16);const trialOffset=await offset();await browse(1);await page.locator('#return-work').click();let restored=await offset();close(restored[0],workOffset[0],'work session x');close(restored[1],workOffset[1],'work session y');await browse(0);restored=await offset();close(restored[0],trialOffset[0],'trial session x');close(restored[1],trialOffset[1],'trial session y');await page.locator('#return-work').click();
 assert.equal(await storage(),unchanged);assert.equal(await page.locator('#undo').isDisabled(),undo);
 await page.locator('#export-now').click();const downloaded=page.waitForEvent('download');await page.locator('#confirm-export').click();const file=await downloaded,png=await readFile(await file.path());assert.equal(png.readUInt32BE(16),128);assert.equal(png.readUInt32BE(20),128);await page.locator('#close-global').click();
 // Hit testing and node handles still use artwork coordinates after view pan.
 await page.locator('#canvas-transform').click();await page.locator('#canvas-snap').click();box=await rect();const center=[box.x+box.width/2,box.y+box.height/2];await page.mouse.move(...center);await page.mouse.down();await page.mouse.move(center[0]+30,center[1],{steps:8});await page.mouse.up();
 const changed=JSON.parse(await storage());close(changed.root.children[0].transform.x*box.width,.5*box.width+30,'node drag after pan');close(changed.root.children[0].transform.y*box.height,.5*box.height,'node y after pan');
 await page.locator('#language-settings').selectOption('en');assert.equal(await reset.getAttribute('aria-label'),'Reset view (fit and center)');assert.equal(await pan.getAttribute('aria-label'),'Pan view');assert.deepEqual(errors,[]);
 console.log({built,pass:true,checks:['free pan at fit and reduced zoom, including empty margins','grab cursor and offscreen recovery','pointer anchored wheel zoom','temporary Space pan restores editing','per-session view offsets','unchanged project/history/export dimensions','node hit testing after pan','English labels'],errors});
}finally{await browser?.close();await new Promise(r=>server.close(r));}
