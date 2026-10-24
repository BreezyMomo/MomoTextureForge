import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node,cloneNode} from '../web/tree-model.js';
import {createProjectResource} from '../web/project-resources.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';
import {GRAPHIC_LIST_KEY,serializeGraphicList} from '../web/persistent-graphic-list.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const entries=['Circle','Ring','Star'].map((type,i)=>createProjectResource(node('shape',type),{name:['Test circle','Test ring','Test star'][i],category:'Samples',kind:'formula'})),draft=project();draft.root.children=[cloneNode(entries[0].root)];
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,marker,text})=>{
  localStorage.setItem(key,text);localStorage.setItem(marker,'1');
  window.galleryStats={draws:0,loads:[],loading:[]};const original=HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL=function(...args){if(this.width===72&&this.height===72)window.galleryStats.draws++;return original.apply(this,args);};
  document.addEventListener('load',event=>{const card=event.target.closest?.('#shape-library .tree-pattern-card');if(event.target.tagName==='IMG'&&card)window.galleryStats.loads.push(card.dataset.entryId);},true);
 },{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,text:serializeGraphicList(entries)});
 await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(draft)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await page.locator('.dock-stack').filter({has:page.locator('[data-panel-tab="library"]')}).first().locator('.dock-stack-actions button').first().click();const floating=page.locator('.dock-floating').filter({has:page.locator('[data-panel-tab="library"]')}).first();await floating.evaluate(e=>{Object.assign(e.style,{width:'360px',height:'950px',left:'360px',top:'80px'});});
 await page.waitForFunction(()=>document.querySelectorAll('#shape-library img[data-ready=true]').length===3);
 const cards=page.locator('#shape-library .tree-pattern-card'),first=cards.first(),stats=()=>page.evaluate(()=>structuredClone(window.galleryStats));
 await first.locator('.component-more summary').click();await page.evaluate(()=>{
  window.galleryImages=[...document.querySelectorAll('#shape-library img')];window.galleryCards=[...document.querySelectorAll('#shape-library .tree-pattern-card')];
  new MutationObserver(changes=>{for(const change of changes)if(change.target.dataset.state==='loading')window.galleryStats.loading.push(change.target.closest('.tree-pattern-card')?.dataset.entryId);}).observe(document.querySelector('#shape-library'),{subtree:true,attributes:true,attributeFilter:['data-state']});
 });
 const baseline=await stats();
 await first.locator('.graphic-favorite').click();assert.equal(await first.locator('.graphic-favorite').getAttribute('aria-pressed'),'true');assert.equal(await first.locator('.component-more').getAttribute('open'),null,'Clicking outside the popup dismisses it');
 await page.locator('#node-tree .tree-node .tree-node-name').first().click();await page.locator('#inspector-tabs').getByRole('button',{name:'变换/排列',exact:true}).click();
 for(const value of ['0.55','0.60','0.65']){const input=page.getByRole('spinbutton',{name:'位置 X',exact:true});await input.fill(value);await input.press('Tab');}
 await page.locator('#undo').click();await page.locator('#redo').click();
 assert.deepEqual(await stats(),baseline,'Favorite, parameter editing, selection and undo must not redraw or reload gallery previews');
 assert.equal(await page.evaluate(()=>window.galleryCards.every((card,i)=>card===document.querySelectorAll('#shape-library .tree-pattern-card')[i])&&window.galleryImages.every((img,i)=>img===document.querySelectorAll('#shape-library img')[i])),true);
 // Real content updates refresh exactly one preview while retaining every card DOM node.
 await page.locator('#resource-actions-menu > summary').click();await page.locator('#update-project-resource').click();await page.locator('dialog').last().getByRole('button',{name:'确认',exact:true}).click();
 await page.waitForFunction(()=>window.galleryStats.draws===4&&document.querySelectorAll('#shape-library img[data-ready=true]').length===3);
 const updated=await stats();assert.equal(updated.draws-baseline.draws,1);assert.deepEqual(updated.loads.slice(baseline.loads.length),[entries[0].id]);assert.ok(updated.loading.every(id=>id===entries[0].id));
 assert.equal(await page.evaluate(()=>window.galleryImages.every((img,i)=>img===document.querySelectorAll('#shape-library img')[i])),true);
 // Metadata and language changes update labels and callbacks, without invalidating pixels.
 const beforeRename=await stats();await first.locator('.component-more summary').click();await first.getByRole('button',{name:'重命名 Test circle',exact:true}).click();const dialog=page.locator('dialog').last();await dialog.getByRole('textbox',{name:'图形列表名称',exact:true}).fill('Renamed circle');await dialog.getByRole('button',{name:'保存',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#shape-library .tree-pattern-text')?.textContent==='Renamed circle');assert.equal(await first.locator('.tree-pattern-text').textContent(),'Renamed circle');await page.locator('#language-settings').selectOption('en');assert.equal(await first.locator('.graphic-favorite').getAttribute('title'),'Unfavorite Renamed circle');assert.deepEqual(await stats(),beforeRename);
 // Filter/view changes reattach existing cards; their ready images never reload.
 await page.locator('#library-filter [data-value=favorites]').click();assert.equal(await cards.count(),1);await page.locator('#library-filter [data-value=all]').click();await page.locator('#shape-search').fill('Test ring');assert.equal(await cards.count(),1);await page.locator('#shape-search').fill('');await page.locator('.tree-library-search summary[data-i18n="workspace.viewOptions"]').click();await page.locator('#shape-library-view').selectOption('list');await page.locator('#shape-library-view').selectOption('grid');await page.keyboard.press('Escape');assert.deepEqual(await stats(),beforeRename);
 // Reused buttons must insert the latest renamed resource and its saved parameters.
 await first.locator(':scope>button:nth-of-type(2)').click();assert.match(await page.locator('#node-tree .tree-node .tree-node-name').last().textContent(),/Renamed circle/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')).root.children.at(-1).transform.x),.65);assert.deepEqual(await stats(),beforeRename);
 // Removing one entry detaches its image; undo reuses its content cache.
 const beforeRemove=await stats();await cards.last().locator('.component-more summary').click();await cards.last().getByRole('button',{name:'Remove from graphics list',exact:true}).click();assert.equal(await cards.count(),2);assert.deepEqual(await stats(),beforeRemove);await page.locator('#undo').click();await page.waitForFunction(()=>document.querySelectorAll('#shape-library img[data-ready=true]').length===3);assert.equal((await stats()).draws-beforeRemove.draws,0);
 assert.deepEqual(errors,[]);const report={built,baseline,updated,checks:['stable card/image DOM','zero redraw/load/loading on favorite and parameters','undo/redo reuse','one preview for real content update','rename and language without redraw','cached filtering and grid/list switching','single-entry removal and undo']};await mkdir('test-results/graphic-list-refresh',{recursive:true});await writeFile('test-results/graphic-list-refresh/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
