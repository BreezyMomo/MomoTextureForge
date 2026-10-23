import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {INSPECTOR_ORDER_KEY} from '../web/inspector-sections.js';
import {LAYOUT_KEY} from '../web/dock-layout.js';
const noScreenshots=process.argv.includes('--no-screenshots');
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':new URL(req.url,'http://local').pathname));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,page;
await mkdir('test-results/editor-motion',{recursive:true});
try{
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1600,height:1050}});page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const draft=project();draft.output.width=draft.output.height=128;draft.root.children=['A','B','C'].map(name=>{const item=node('shape','Circle');item.name=name;return item;});
 await page.goto(`http://127.0.0.1:${server.address().port}/#tree=`+Buffer.from(JSON.stringify(draft)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#startup-screen').waitFor({state:'detached'});await page.locator('.tree-node-name').first().click();
 const projectText=()=>page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),initial=await projectText();
 const modules=page.locator('#inspector>details.inspector-module'),order=()=>modules.evaluateAll(elements=>elements.map(e=>e.dataset.module));
 // Native disclosure transitions may remain visually visible while closing, but
 // their controls immediately become inert and never enter project history.
 const first=modules.first(),beforeHeight=(await first.boundingBox()).height;
 await first.locator(':scope>summary .inspector-module-title').click();assert.equal(await first.getAttribute('open'),null);assert.equal(await first.locator(':scope>.inspector-module-body').evaluate(e=>e.inert),true);
 await page.waitForFunction(()=>document.querySelector('#inspector>details.inspector-module').getBoundingClientRect().height<50);assert.ok(beforeHeight>50);
 for(const module of await modules.all())if(await module.getAttribute('open')!==null)await module.locator(':scope>summary .inspector-module-title').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('#inspector>details.inspector-module')].every(e=>e.getBoundingClientRect().height<50));
 const beforeOrder=await order(),preferences=await page.evaluate(key=>localStorage.getItem(key),INSPECTOR_ORDER_KEY);
 async function moduleDrag(){
  const from=await modules.last().locator('.module-drag-handle').boundingBox(),to=await modules.first().locator(':scope>summary').boundingBox();
  await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+20,from.y+from.height/2,{steps:4});await page.mouse.move(to.x+45,to.y+3,{steps:8});await page.mouse.move(to.x+46,to.y+3);
  await page.waitForFunction(()=>document.querySelector('.module-dragging'));
  await page.waitForFunction(()=>[...document.querySelectorAll('#inspector>details.inspector-module')].some(e=>Math.abs(new DOMMatrix(getComputedStyle(e).transform).m42)>5));
 }
 await moduleDrag();assert.deepEqual(await order(),beforeOrder,'Hover only changes visual positions');assert.equal(await projectText(),initial);assert.equal(await page.evaluate(key=>localStorage.getItem(key),INSPECTOR_ORDER_KEY),preferences);
 if(!noScreenshots)await page.screenshot({path:`test-results/editor-motion/${built?'built':'source'}-module-preview.png`});
 const inspectorBox=await page.locator('#dock-content-inspector').boundingBox();if(!noScreenshots)await page.screenshot({path:`test-results/editor-motion/${built?'built':'source'}-module-detail.png`,clip:{x:inspectorBox.x-3,y:inspectorBox.y-30,width:inspectorBox.width+6,height:650}});
 await page.keyboard.press('Escape');await page.mouse.up();await page.waitForFunction(()=>!document.querySelector('.module-dragging'));assert.deepEqual(await order(),beforeOrder);assert.equal(await page.evaluate(key=>localStorage.getItem(key),INSPECTOR_ORDER_KEY),preferences);
 await page.waitForFunction(()=>[...document.querySelectorAll('#inspector>details.inspector-module')].every(e=>e.getAnimations().length===0));
 await moduleDrag();await page.mouse.up();assert.deepEqual(await order(),[beforeOrder.at(-1),...beforeOrder.slice(0,-1)]);assert.equal(await projectText(),initial);assert.equal(await page.locator('#undo').isDisabled(),true);
 // A short dock panel is a deterministic fixture for edge scrolling during drag.
 const scroller=page.locator('#dock-content-inspector .tree-inspector'),scrollOrder=await order(),savedOrder=await page.evaluate(key=>localStorage.getItem(key),INSPECTOR_ORDER_KEY);
 await scroller.evaluate(e=>{e.style.maxHeight='360px';e.scrollTop=0;});await modules.first().locator('.module-drag-handle').scrollIntoViewIfNeeded();const scrollBox=await scroller.boundingBox(),scrollGrip=await modules.first().locator('.module-drag-handle').boundingBox();
 await page.mouse.move(scrollGrip.x+5,scrollGrip.y+5);await page.mouse.down();await page.mouse.move(scrollBox.x+80,scrollBox.y+scrollBox.height-6,{steps:10});await page.waitForFunction(()=>document.querySelector('#dock-content-inspector .tree-inspector').scrollTop>30);await page.keyboard.press('Escape');await page.mouse.up();await scroller.evaluate(e=>e.style.removeProperty('max-height'));assert.deepEqual(await order(),scrollOrder);assert.equal(await page.evaluate(key=>localStorage.getItem(key),INSPECTOR_ORDER_KEY),savedOrder);assert.equal(await projectText(),initial);
 // Same-level tree sorting has a real gap, without editing the tree on hover.
 const row=name=>page.locator('#node-tree .tree-node').filter({has:page.locator('.tree-node-name',{hasText:name})});
 async function nodeDrag(){const from=await row('C').locator('.node-drag-handle').boundingBox(),to=await row('A').boundingBox();await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+18,from.y+from.height/2,{steps:4});await page.mouse.move(to.x+to.width*.6,to.y+2,{steps:8});await page.mouse.move(to.x+to.width*.6+1,to.y+2);await page.waitForFunction(()=>{const e=document.querySelector('.tree-sort-preview');return e&&parseFloat(getComputedStyle(e).paddingTop)>10;});}
 await nodeDrag();assert.equal(await projectText(),initial);if(!noScreenshots)await page.screenshot({path:`test-results/editor-motion/${built?'built':'source'}-node-gap.png`});await page.keyboard.press('Escape');await page.mouse.up();await page.waitForFunction(()=>!document.querySelector('.node-dragging,.tree-sort-preview'));assert.equal(await projectText(),initial);
 await nodeDrag();await page.mouse.up();assert.deepEqual(JSON.parse(await projectText()).root.children.map(n=>n.name),['C','A','B']);await page.locator('#undo').click();assert.deepEqual(JSON.parse(await projectText()).root.children.map(n=>n.name),['A','B','C']);
 // The docking destination is one persistent overlay, and Escape returns the
 // dragged label without changing either saved layout or authored content.
 const layoutBefore=await page.evaluate(key=>localStorage.getItem(key),LAYOUT_KEY),stable=await projectText(),tab=await page.locator('[data-panel-tab=nodes]').boundingBox(),canvas=await page.locator('#dock-content-canvas').boundingBox();
 await page.mouse.move(tab.x+tab.width/2,tab.y+tab.height/2);await page.mouse.down();await page.mouse.move(canvas.x+20,canvas.y+canvas.height*.5,{steps:12});await page.locator('.dock-drop-preview').waitFor();await page.locator('.dock-drop-preview').evaluate(e=>window.motionDropOverlay=e);await page.mouse.move(canvas.x+canvas.width-15,canvas.y+canvas.height*.5,{steps:8});assert.equal(await page.locator('.dock-drop-preview').evaluate(e=>e===window.motionDropOverlay),true);await page.keyboard.press('Escape');await page.mouse.up();await page.locator('.dock-drag-ghost').waitFor({state:'detached'});assert.equal(await page.evaluate(key=>localStorage.getItem(key),LAYOUT_KEY),layoutBefore);assert.equal(await projectText(),stable);
 // Menus fade without moving their targets. Reduced motion also stops animations
 // already running and makes subsequent ordering changes immediate.
 await page.locator('#workspace-layout-menu>summary').click();assert.equal(await page.locator('#workspace-layout-menu>.header-dropdown-panel').evaluate(e=>getComputedStyle(e).animationName),'editor-fade-in');await page.locator('#workspace-layout-menu>summary').click();
 await page.locator('#header-file-menu>summary').click();const download=page.waitForEvent('download');await page.locator('#save-project').click();await download;const notice=page.locator('.editor-notice').last();await notice.waitFor();assert.equal(await notice.getAttribute('role'),'status');assert.equal(await notice.locator('.editor-notice-text').textContent(),'导出完成');await notice.locator('.editor-notice-close').click();await notice.waitFor({state:'detached'});assert.equal(await projectText(),stable);
 await page.emulateMedia({reducedMotion:'reduce'});await modules.last().locator('.module-drag-handle').press('ArrowUp');assert.equal(await modules.evaluateAll(elements=>elements.flatMap(e=>e.getAnimations()).length),0);assert.equal(await page.locator('#undo').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');assert.equal(await projectText(),stable);
 assert.deepEqual(errors,[]);const report={built,pass:true,checks:['animated inert disclosure','pointer module hover without persistence','cancel restores order','drop persists only UI order','edge scrolling without edits','tree gap without project edits','tree drop is one undo','persistent docking overlay','dock cancel without edits','stable menu fade','export completion and dismissal','reduced motion']};await writeFile(`test-results/editor-motion/${built?'built':'source'}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){if(!noScreenshots)await page?.screenshot({path:`test-results/editor-motion/${built?'built':'source'}-failure.png`});console.error(error);throw error;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
