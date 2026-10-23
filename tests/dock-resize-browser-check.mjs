import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {project,node} from '../web/tree-model.js';
import {LAYOUT_KEY,layoutPreset} from '../web/dock-layout.js';

const standalone=process.argv.includes('--standalone'),root=resolve('web');
const server=createServer(async(req,res)=>{
 try{const path=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',standalone?'text/html':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(standalone?'site/index.html':file));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1800,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const p=project();p.name='Splitter regression';p.root.children=[node('shape','Circle')];
 await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));
 const frame=async()=>{await page.waitForFunction(()=>document.documentElement.dataset.ready==='true'&&!document.querySelector('.dock-motion'));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LAYOUT_KEY);
 const model=()=>page.evaluate(()=>({draft:localStorage.getItem('momo-texture-tree:draft:v1'),hash:location.hash,undo:document.querySelector('#undo').disabled}));
 const load=async layout=>{await page.evaluate(({key,layout})=>localStorage.setItem(key,JSON.stringify({current:layout,named:[]})),{key:LAYOUT_KEY,layout});await page.reload();await frame();};
 const measure=axis=>page.evaluate(axis=>{
  const coordinate=axis==='x'?'x':'y',dimension=axis==='x'?'width':'height';
  const range=e=>{const r=e.getBoundingClientRect();return {start:r[coordinate],end:r[coordinate]+r[dimension]};};
  return {leaves:Object.fromEntries([...document.querySelectorAll('.dock-stack')].map(e=>[e.dataset.stackId,range(e)])),dividers:Object.fromEntries([...document.querySelectorAll('.dock-split-'+axis)].map(e=>{const r=range(e.querySelector(':scope > .dock-splitter'));return [e.dataset.splitId,(r.start+r.end)/2];}))};
 },axis);
 const near=(a,b,message)=>assert.ok(Math.abs(a-b)<.35,`${message}: ${a} vs ${b}`);
 function local(before,after,id){
  const center=before.dividers[id],delta=after.dividers[id]-center;
  for(const [key,pos]of Object.entries(before.dividers))near(after.dividers[key],pos+(key===id?delta:0),'unrelated divider stays fixed');
  for(const [key,rect]of Object.entries(before.leaves)){
   near(after.leaves[key].start,rect.start+(Math.abs(rect.start-center-3)<.35?delta:0),'only adjacent start edge moves');
   near(after.leaves[key].end,rect.end+(Math.abs(rect.end-center+3)<.35?delta:0),'only adjacent end edge moves');
  }
  return delta;
 }
 const handle=id=>page.locator(`[data-split-id="${id}"] > .dock-splitter`);
 const drag=async(id,axis,delta,{cancel=null}={})=>{
  const box=await handle(id).boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+(axis==='x'?delta:0),y+(axis==='y'?delta:0),{steps:8});
  if(cancel==='Escape')await page.keyboard.press('Escape');
  if(cancel==='pointercancel')await page.evaluate(()=>document.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true})));
  await page.mouse.up();await frame();
 };
 await frame();await mkdir('test-results/docking',{recursive:true});
 const initialModel=await model();let checks=0;
 for(const axis of ['x','y']){
  const layout=layoutPreset();
  function orient(n){if(n.kind==='split'){n.axis=axis;orient(n.first);orient(n.second);}}orient(layout.root);
  for(const id of [layout.root.id,layout.root.first.id,layout.root.second.id]){
   await load(layout);const before=await measure(axis),projectBefore=await model();
   // Starting off-center in the 6px hit area must not jump the divider.
   const box=await handle(id).boundingBox();await page.mouse.move(box.x+1,box.y+1);await page.mouse.down();await page.mouse.move(box.x+1,box.y+1);await page.mouse.up();await frame();near(local(before,await measure(axis),id),0,'no initial jump');
   await drag(id,axis,35);near(local(before,await measure(axis),id),35,'pointer delta');
   let prev=await measure(axis);await handle(id).focus();await page.keyboard.press(axis==='x'?'ArrowLeft':'ArrowUp');await frame();assert.ok(local(prev,await measure(axis),id)<-1,'keyboard uses the same local rule');
   for(const key of ['Home','End']){
    prev=await measure(axis);await handle(id).focus();await page.keyboard.press(key);await frame();const after=await measure(axis);local(prev,after,id);
    const sizes=Object.values(after.leaves).map(r=>r.end-r.start);assert.ok(Math.min(...sizes)>=(axis==='x'?96:72)-.35,'minimum adjacent pane size');
    const range=await handle(id).evaluate(e=>['aria-valuemin','aria-valuenow','aria-valuemax'].map(a=>Number(e.getAttribute(a))));assert.ok(range[0]<=range[1]&&range[1]<=range[2],'accessible range includes the current value');
    const limit=after.dividers[id];await page.keyboard.press(key);await frame();near((await measure(axis)).dividers[id],limit,'stops at minimum without moving another divider');
   }
   const saved=(await stored()).current,positions=await measure(axis);await page.reload();await frame();assert.deepEqual((await stored()).current,saved);local(positions,await measure(axis),id);near((await measure(axis)).dividers[id],positions.dividers[id],'persisted divider');
   for(const cancel of ['Escape','pointercancel']){
    const beforeCancel=await measure(axis),savedBefore=await stored();await drag(id,axis,-25,{cancel});assert.deepEqual(await stored(),savedBefore);near(local(beforeCancel,await measure(axis),id),0,'cancel restores all divider positions');
   }
   assert.deepEqual(await model(),projectBefore,'resizing leaves the project and undo alone');checks++;console.log('resize checked',axis,id);
  }
 }
 const mixed=layoutPreset('animation');await load(mixed);
 const before=await measure('x'),vertical=await measure('y');await drag(mixed.root.id,'x',55);near(local(before,await measure('x'),mixed.root.id),55,'mixed-axis local resize');assert.deepEqual(await measure('y'),vertical,'perpendicular geometry remains fixed');checks++;
 await load(layoutPreset());const beforeWindow=await measure('x');await page.setViewportSize({width:2200,height:1200});await frame();assert.notEqual((await measure('x')).dividers[Object.keys(beforeWindow.dividers)[0]],Object.values(beforeWindow.dividers)[0],'window resizing still adapts the whole layout');await page.setViewportSize({width:1800,height:1200});await frame();
 await page.screenshot({path:`test-results/docking/${standalone?'built-':''}local-resize.png`});
 assert.deepEqual(await model(),initialModel);assert.deepEqual(errors,[]);console.log({standalone,checks,localPointerKeyboard:true,minimums:true,cancel:true,reload:true,projectUnchanged:true,windowResize:true,errors});
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
