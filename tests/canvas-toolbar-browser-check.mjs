import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';

const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(url==='/'?'/index.html':url));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const p=project();p.name='Toolbar test';p.root.children=[node('shape','Circle')];p.output.width=p.output.height=300;
 await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true'&&document.querySelector('#quick-canvas-aspect'));
 const draft=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1'))),saved=()=>page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1'));
 const quick=page.locator('#quick-canvas-aspect'),ratio=quick.locator('select');
 assert.equal(await ratio.inputValue(),'1');assert.equal(await ratio.locator('option[value=custom]').textContent(),'自定义…');
 const before=await saved();
 // Use native keyboard selection: selectOption dispatches change even when the
 // value is unchanged, masking the exact repeat-selection bug this guards.
 async function repeatCustom(){for(let i=0;i<2;i++){const stored=await saved();await ratio.focus();await ratio.press('End');assert.equal(await quick.locator('[role=dialog]').isVisible(),true);assert.notEqual(await ratio.inputValue(),'custom');assert.equal(await saved(),stored);await quick.getByRole('button',{name:'取消',exact:true}).click();}}
 await repeatCustom();await ratio.selectOption('custom');assert.equal(await saved(),before);
 await quick.getByLabel('宽',{exact:true}).fill('5');await quick.getByLabel('高',{exact:true}).fill('0');await quick.getByRole('button',{name:'应用比例',exact:true}).click();assert.equal(await quick.locator('[role=alert]').isVisible(),true);assert.equal(await saved(),before);
 await quick.getByLabel('宽',{exact:true}).fill('20');await quick.getByLabel('高',{exact:true}).fill('1');await quick.getByRole('button',{name:'应用比例',exact:true}).click();assert.equal(await quick.locator('[role=alert]').isVisible(),true);assert.equal(await saved(),before);await quick.getByLabel('宽',{exact:true}).fill('5');
 await quick.getByLabel('高',{exact:true}).fill('2');await quick.getByRole('button',{name:'应用比例',exact:true}).click();
 assert.equal((await draft()).canvas.ratio,2.5);assert.deepEqual([(await draft()).output.width,(await draft()).output.height],[300,120]);assert.deepEqual((await draft()).root.children[0].transform,p.root.children[0].transform);
 await repeatCustom();assert.equal(await ratio.inputValue(),'current-custom');assert.equal(await ratio.locator('option[value=current-custom]').textContent(),'自定义 (2.5 : 1)');
 await page.locator('#undo').click();assert.equal(await ratio.inputValue(),'1');await page.locator('#redo').click();assert.equal(await ratio.inputValue(),'current-custom');
 await page.locator('#project-settings').click();const global=page.locator('#global-controls .canvas-aspect');assert.equal(await global.locator('select').inputValue(),'current-custom');assert.equal(await global.getByLabel('宽',{exact:true}).inputValue(),'2.5');
 await global.locator('select').selectOption(String(16/9));assert.equal(await ratio.inputValue(),String(16/9));
 await global.locator('select').selectOption('custom');await global.getByLabel('宽',{exact:true}).fill('3');await global.getByLabel('高',{exact:true}).fill('5');await global.getByRole('button',{name:'应用比例',exact:true}).click();assert.equal((await draft()).canvas.ratio,.6);assert.equal(await ratio.inputValue(),'current-custom');
 await page.locator('#close-global').click();const viewBefore=await saved();
 await page.locator('#canvas-pivot').click();assert.equal(await page.locator('#canvas-pivot').getAttribute('aria-pressed'),'true');
 await page.locator('#pan-preview').click();assert.equal(await page.locator('#canvas-pivot').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#pan-preview').getAttribute('aria-pressed'),'true');
 await page.locator('#grab-uv').click();assert.equal(await page.locator('#pan-preview').getAttribute('aria-pressed'),'false');
 await page.locator('#canvas-transform').click();assert.equal(await page.locator('#grab-uv').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#canvas-transform').getAttribute('aria-pressed'),'true');
 await page.locator('#canvas-snap').click();assert.equal(await page.locator('#canvas-snap').getAttribute('aria-pressed'),'false');
 await page.locator('#canvas-display-menu>summary').click();await page.locator('#background').selectOption('white');await page.locator('#show-guides').check();await page.keyboard.press('Escape');assert.equal(await page.locator('#canvas-display-menu').getAttribute('open'),null);assert.equal(await page.locator('#canvas-display-menu>summary').evaluate(e=>e===document.activeElement),true);
 const play=await page.locator('#play').textContent();await page.keyboard.press('Space');assert.equal(await page.locator('#canvas-display-menu').getAttribute('open'),'');assert.equal(await page.locator('#play').textContent(),play);await page.keyboard.press('Escape');
 await page.locator('#canvas-tile-menu>summary').click();await page.locator('#tile-grid').selectOption('3');assert.equal(await page.locator('#tile-preview .canvas-tool-label').textContent(),'平铺 3×3');assert.equal(await page.locator('#tile-preview').getAttribute('aria-pressed'),'true');
 await page.locator('#tile-preview').click();assert.equal(await page.locator('#tile-preview .canvas-tool-label').textContent(),'平铺');await page.locator('#tile-preview').click();assert.equal(await page.locator('#tile-grid').inputValue(),'3');
 await page.locator('#canvas-tile-menu>summary').click();await page.getByRole('button',{name:'关闭平铺检查',exact:true}).click();assert.equal(await page.locator('#tile-preview').getAttribute('aria-pressed'),'false');
 await page.locator('#zoom').selectOption('1.5');assert.equal(await saved(),viewBefore);
 const mode=page.locator('#library-filter button[data-value=animated]');await mode.click();const cards=page.locator('#shape-library .tree-pattern-card'),count=await cards.count();assert.ok(count>0);
 const clear=page.locator('#clear-shape-search');assert.equal(await clear.isVisible(),false);await page.locator('#shape-search').fill('no-such-graphic-xyz');assert.equal(await cards.count(),0);assert.equal(await clear.isVisible(),true);await clear.click();assert.equal(await cards.count(),count);assert.equal(await mode.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#shape-search').evaluate(e=>e===document.activeElement),true);assert.equal(await saved(),viewBefore);
 await page.locator('#language-settings').selectOption('en');assert.equal(await ratio.locator('option[value=custom]').textContent(),'Custom…');assert.equal(await page.locator('#canvas-transform').getAttribute('aria-label'),'Select / transform');assert.equal(await page.locator('#canvas-transform svg').count(),1);
 await quick.getByRole('button',{name:'Edit custom ratio',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await quick.locator('[role=dialog]').isVisible(),false);assert.equal(await ratio.inputValue(),'current-custom');
 for(const width of [1600,1100,768]){await page.setViewportSize({width,height:1050});for(const density of ['compact','comfortable']){
  await page.evaluate(density=>document.documentElement.dataset.density=density,density);const bounds=await page.locator('#preview-2d-toolbar').evaluate(e=>({w:e.clientWidth,scroll:e.scrollWidth}));assert.ok(bounds.scroll<=bounds.w+1,JSON.stringify({width,density,...bounds}));
  const pane=await page.locator('.tree-preview').boundingBox();
  await quick.getByRole('button',{name:'Edit custom ratio',exact:true}).click();const popup=await quick.locator('[role=dialog]').boundingBox();assert.ok(popup.x>=pane.x&&popup.x+popup.width<=pane.x+pane.width+1,JSON.stringify({width,density,popup,pane}));await page.keyboard.press('Escape');
  await page.locator('#canvas-display-menu>summary').click();const menu=await page.locator('#canvas-display-menu .canvas-dropdown-panel').boundingBox();assert.ok(menu.x>=pane.x&&menu.x+menu.width<=pane.x+pane.width+1,JSON.stringify({width,density,menu,pane}));await page.keyboard.press('Escape');
 }}
 await page.setViewportSize({width:1500,height:1050});await page.evaluate(()=>history.replaceState(null,'',location.pathname));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.equal(await ratio.inputValue(),'current-custom');await ratio.selectOption('custom');assert.equal(await quick.getByLabel('Width',{exact:true}).inputValue(),'1');assert.ok(Math.abs(Number(await quick.getByLabel('Height',{exact:true}).inputValue())-5/3)<1e-7);
 assert.deepEqual(errors,[]);const report={built,pass:true,checks:['custom aspect validation, apply, undo/redo and reload','quick/settings synchronization and unchanged transforms','mutually exclusive editing tools','view-only menus and tiling','search clear retains browse filters and focus','English labels and narrow toolbar'],errors};await mkdir('test-results/canvas-toolbar',{recursive:true});await writeFile('test-results/canvas-toolbar/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
