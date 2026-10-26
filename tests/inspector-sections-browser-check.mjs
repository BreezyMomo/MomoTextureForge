import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {builtinAsset,contentHash,registerAsset} from '../web/resource-assets.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';
import {INSPECTOR_SECTIONS_KEY} from '../web/inspector-sections.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const trace=message=>{if(process.argv.includes('--trace'))console.log(message);};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;if(name==='/blank'){res.setHeader('Content-Type','text/html');res.end('<!doctype html>');return;}const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const asset=builtinAsset('Circle');asset.definition.name='Custom circle';asset.definition.aliases={'zh-CN':'自定义圆',en:'Custom circle'};const assetId='asset_'+await contentHash(asset);registerAsset(assetId,asset);
 const draft=project(),custom=node('shape',assetId),water=node('shape','WaterCaustics'),twin=node('shape',assetId);custom.name='Custom A';water.name='Water';twin.name='Custom B';twin.mask=node('shape','Circle');draft.root.children=[custom,water,twin];
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1450,height:1050}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));const address='http://127.0.0.1:'+server.address().port;
 await page.goto(address+'/blank');await page.evaluate(async({assetId,asset,marker})=>{localStorage.setItem(marker,'1');await new Promise((resolve,reject)=>{const request=indexedDB.open('momo-texture-resources',1);request.onupgradeneeded=()=>request.result.createObjectStore('resources');request.onsuccess=()=>{const db=request.result,tx=db.transaction('resources','readwrite');tx.objectStore('resources').put([[assetId,asset]],'snapshot');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};request.onerror=()=>reject(request.error);});},{assetId,asset,marker:GRAPHIC_LIST_DEFAULTS_KEY});
 await page.goto(address+'/#tree='+Buffer.from(JSON.stringify(draft)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 trace('editor ready');
 const row=name=>page.locator('#node-tree .tree-node .tree-node-name').filter({hasText:name});
 const section=key=>page.locator('#inspector details[data-module="'+key+'"]');
 await row('Custom A').click();const parameters=section('modules.shapeParameters');assert.equal(await parameters.locator(':scope>summary .inspector-module-title').textContent(),'自定义圆 · 参数');assert.equal(await parameters.locator('input[type=number]').count(),asset.definition.parameters.length);
 assert.equal(await section('modules.generator').locator(':scope>summary>.inspector-module-description').textContent(),'选择当前节点使用的基础图形。更换图形会显示它对应的参数。');assert.match(await parameters.locator(':scope>summary>.inspector-module-description').textContent(),/羽化/);
 const saved=await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1'));
 await parameters.locator(':scope>summary .inspector-module-title').click();assert.equal(await parameters.getAttribute('open'),null);await parameters.locator('input').first().waitFor({state:'hidden'});assert.equal(await parameters.locator('.inspector-module-body').first().evaluate(e=>e.inert),true);assert.equal(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),saved);assert.equal(await page.locator('#undo').isDisabled(),true);
 await row('Water').click();assert.equal(await section('modules.shapeParameters').getAttribute('open'),'');await row('Custom A').click();assert.equal(await parameters.getAttribute('open'),null);
 assert.equal(await page.locator('#inspector-color-quick').count(),0);assert.equal(await page.locator('#inspector-tabs button').count(),4);assert.equal(await section('editor.nodeColors').count(),1);
 const order=()=>page.locator('#inspector>details').evaluateAll(nodes=>nodes.map(n=>n.dataset.module));const beforeOrder=await order();await parameters.locator(':scope>summary .module-drag-handle').press('ArrowDown');const movedOrder=await order();assert.equal(movedOrder.indexOf('modules.shapeParameters'),beforeOrder.indexOf('modules.shapeParameters')+1);assert.equal(await parameters.getAttribute('open'),null);assert.equal(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),saved);await row('Water').click();assert.ok((await order()).indexOf('modules.shapeParameters')<(await order()).indexOf('modules.generator'));await row('Custom A').click();assert.deepEqual(await order(),movedOrder);
 const source=section('modules.levels').locator(':scope>summary .module-drag-handle'),target=section('editor.nodeColors').locator(':scope>summary');await source.dragTo(target,{targetPosition:{x:40,y:3}});assert.ok((await order()).indexOf('modules.levels')<(await order()).indexOf('editor.nodeColors'));await parameters.locator(':scope>summary .module-drag-handle').press('ArrowDown');
 const preferences=await page.evaluate(key=>localStorage.getItem(key),INSPECTOR_SECTIONS_KEY);
 trace('module reordering checked');
 const helpButton=parameters.locator(':scope>summary .inspector-module-help'),tip=page.getByRole('tooltip');
 await page.locator('#inspector').evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});
 await helpButton.hover();const headerBounds=await parameters.boundingBox();await tip.waitFor();assert.match(await tip.textContent(),/羽化/);
 trace('hover help visible');
 assert.equal(await parameters.getAttribute('open'),null);assert.deepEqual(await parameters.boundingBox(),headerBounds);assert.equal(await parameters.locator(':scope>summary>.inspector-module-description').isVisible(),false);
 assert.equal(await helpButton.getAttribute('aria-describedby'),await tip.getAttribute('id'));assert.equal(await tip.evaluate(e=>e.matches(':popover-open')),true);
 const bounds=await tip.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=1450&&bounds.y+bounds.height<=1050);
 await parameters.locator('input').first().waitFor({state:'hidden'});assert.equal(await parameters.locator('.inspector-module-body').first().evaluate(e=>e.inert),true);assert.equal(await page.evaluate(key=>localStorage.getItem(key),INSPECTOR_SECTIONS_KEY),preferences);
 await tip.hover();await page.waitForTimeout(220);assert.equal(await tip.isVisible(),true);await tip.click();assert.equal(await parameters.getAttribute('open'),null);
 await page.mouse.move(5,5);await tip.waitFor({state:'detached'});
 trace('pointer reading and dismissal checked');
 await helpButton.focus();await tip.waitFor();await page.keyboard.press('Escape');await tip.waitFor({state:'detached'});assert.equal(await helpButton.getAttribute('aria-expanded'),'false');assert.equal(await parameters.getAttribute('open'),null);
 await page.keyboard.press('Enter');await tip.waitFor();assert.equal(await parameters.getAttribute('open'),null);await page.keyboard.press('Escape');
 trace('keyboard help checked');
 await parameters.locator(':scope>summary .inspector-module-title').click();assert.equal(await parameters.getAttribute('open'),'');await helpButton.hover();await tip.waitFor();assert.match(await tip.textContent(),/羽化/);trace('expanded hover checked');await row('Water').click();await tip.waitFor({state:'detached'});await row('Custom A').click();trace('node switch checked');
 await section('editor.shapeUV').locator(':scope>summary').focus();await page.keyboard.press('Space');assert.equal(await section('editor.shapeUV').getAttribute('open'),null);assert.equal(await page.locator('#play').textContent(),'播放');
 await page.locator('#inspector-tabs').getByRole('button',{name:'变换/排列',exact:true}).click();await section('editor.nodeRegion').locator(':scope>summary .inspector-module-title').click();await row('Water').click();assert.equal(await section('editor.nodeRegion').getAttribute('open'),null);await page.locator('#language-settings').selectOption('en');assert.equal(await section('editor.nodeRegion').getAttribute('open'),null);assert.equal(await section('editor.nodeRegion').locator(':scope>summary .inspector-module-title').textContent(),'Node region');
 assert.equal(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),saved);
 await section('editor.nodeRegion').locator(':scope>summary .inspector-module-title').click();const x=page.getByRole('spinbutton',{name:'Position X',exact:true});await x.fill('0.6');await x.press('Tab');assert.equal(await section('editor.nodeRegion').getAttribute('open'),'');assert.equal(await page.getByRole('spinbutton',{name:'Position X',exact:true}).inputValue(),'0.6');await page.locator('#undo').click();assert.equal(await page.getByRole('spinbutton',{name:'Position X',exact:true}).inputValue(),'0.5');assert.equal(await section('editor.nodeRegion').getAttribute('open'),'');
 // The same module presentation is used for compatible batch parameters.
 await row('Custom A').click();await row('Custom B').click({modifiers:['Control']});await page.locator('#inspector-tabs').getByRole('button',{name:'Shape',exact:true}).click();assert.equal(await section('modules.shapeParameters').count(),1);assert.equal(await section('modules.shapeParameters').locator(':scope>summary .inspector-module-title').textContent(),'Custom circle · Parameters');assert.ok(await section('modules.shapeParameters').locator('input[type=number]').count()>0);
 await row('Custom A').click();await page.locator('#inspector-tabs').getByRole('button',{name:'Shape',exact:true}).click();await parameters.locator(':scope>summary .inspector-module-title').click();assert.equal(await parameters.getAttribute('open'),null);const stored=await page.evaluate(key=>localStorage.getItem(key),INSPECTOR_SECTIONS_KEY);assert.ok(stored?.includes(assetId));
 const storedOrder=await order();await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await row('Custom A').click();assert.deepEqual(await order(),storedOrder);assert.equal(await parameters.getAttribute('open'),null);assert.equal(await section('editor.shapeUV').getAttribute('open'),null);await helpButton.hover();await tip.waitFor();assert.match(await tip.textContent(),/Adjust the graphic/);
 await mkdir('test-results/inspector-sections',{recursive:true});if(!process.argv.includes('--no-screenshots'))await page.screenshot({path:'test-results/inspector-sections/'+(built?'built':'source')+'.png'});
 // Mask guidance and existing mask-subtree actions belong beside the blend selector.
 await page.locator('#inspector-tabs').getByRole('button',{name:'Composite',exact:true}).click();const blending=section('modules.blending');assert.equal(await section('modules.mask').count(),0);
 await blending.getByRole('combobox',{name:'Blend mode',exact:true}).selectOption('mask');assert.match(await blending.innerText(),/This mask affects earlier siblings/);
 await row('Custom B').click();await blending.getByRole('checkbox',{name:'Invert mask',exact:true}).check();let latest=JSON.parse(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')));assert.equal(latest.root.children.find(n=>n.name==='Custom B').maskInvert,true);
 await blending.getByRole('button',{name:'Remove mask',exact:true}).click();latest=JSON.parse(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')));assert.equal(latest.root.children.find(n=>n.name==='Custom B').mask,null);await page.locator('#undo').click();assert.equal(await blending.getByRole('button',{name:'Remove mask',exact:true}).count(),1);
 await row('Custom A').click({modifiers:['Control']});await blending.getByRole('combobox',{name:'Batch Blend mode',exact:true}).selectOption('inverseMask');latest=JSON.parse(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')));assert.ok(latest.root.children.filter(n=>n.name.startsWith('Custom ')).every(n=>n.blend==='inverseMask'));assert.equal(await section('editor.contourProcessing').count(),1);
 assert.deepEqual(errors,[]);
 trace('inspector interactions checked');
 // Nested headings have no reorder grip; their titles must not occupy its 24px column.
 await row('Water').click();await page.locator('#inspector-tabs button').nth(1).click();await page.locator('#inspector select[aria-label="Arrangement"]').selectOption('8');
 const layoutSaved=await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1'));
 for(const language of ['zh-CN','en']){
  await page.locator('#language-settings').selectOption(language);
  for(const key of ['editor.advancedRandomnessPosition','editor.layoutVariationGradientFlow']){
   const nested=section(key),summary=nested.locator(':scope>summary');
   assert.equal(await summary.locator('.module-drag-handle').count(),0);
   for(const width of [260,320,420]){
    const metrics=await summary.evaluate((source,width)=>{
     const fixture=document.createElement('details');fixture.className='inspector-module';fixture.style.cssText=`position:fixed;left:0;top:0;width:${width}px;z-index:9999`;fixture.append(source.cloneNode(true));document.body.append(fixture);
     const heading=fixture.querySelector('.inspector-module-heading'),title=heading.querySelector('.inspector-module-title'),rect=title.getBoundingClientRect(),bounds=heading.getBoundingClientRect(),items=[...heading.children].map(e=>e.getBoundingClientRect());
     const result={width:rect.width,height:bounds.height,inside:items.every(r=>r.left>=bounds.left&&r.right<=bounds.right+1),overlap:items.some((r,i)=>i&&r.left<items[i-1].right-1)};fixture.remove();return result;
    },width);
    assert.ok(metrics.width>100,`${language} ${key} at ${width}px: title width ${metrics.width}`);assert.ok(metrics.height<=64,JSON.stringify(metrics));assert.ok(metrics.inside);assert.equal(metrics.overlap,false);
   }
   await summary.click();const open=await nested.getAttribute('open');await summary.click();assert.notEqual(await nested.getAttribute('open'),open);
  }
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),layoutSaved);trace('nested heading layout checked');
 // Touch has no hover: tapping opens the same tip, tapping again dismisses it.
 const touchPage=await browser.newPage({viewport:{width:1450,height:1050},hasTouch:true});touchPage.setDefaultTimeout(15000);touchPage.on('pageerror',e=>errors.push(e.message));await touchPage.goto(address+'/#tree='+Buffer.from(JSON.stringify(project())).toString('base64'));await touchPage.waitForFunction(()=>document.documentElement.dataset.ready==='true',null,{timeout:30000});await touchPage.locator('#node-tree .tree-node-name').first().tap();trace('touch editor ready');
 const touchHelp=touchPage.locator('#inspector .inspector-module-help').first(),touchTip=touchPage.getByRole('tooltip');await touchHelp.tap();await touchTip.waitFor();await touchHelp.tap();await touchTip.waitFor({state:'detached'});await touchHelp.tap();await touchTip.waitFor();await touchPage.locator('#language-settings').selectOption('en');await touchTip.waitFor({state:'detached'});await touchHelp.tap();await touchTip.waitFor();assert.match(await touchTip.textContent(),/[A-Za-z]/);assert.doesNotMatch(await touchTip.textContent(),/[\u3400-\u9fff]/);await touchPage.close();assert.deepEqual(errors,[]);
 const report={built,checks:['custom parameters in one module','graphic selection help and feather help belong to their own modules','collapse does not edit project or undo','per-graphic state','common state across nodes and languages','hover help does not shift layout or expand modules','tooltip stays readable under pointer and dismisses on leave','keyboard focus, Enter and Escape help controls','tooltip cleanup on node and language changes','touch tap fallback','keyboard collapse without playback','parameter edits and undo','batch sections','reload persists expansion','mask guidance and subtree actions grouped with blending','batch blending controls']};await writeFile('test-results/inspector-sections/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){console.error(error);throw error;}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
