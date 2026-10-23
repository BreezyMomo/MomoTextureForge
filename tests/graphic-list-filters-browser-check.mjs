import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {node} from '../web/tree-model.js';
import {createProjectResource} from '../web/project-resources.js';
import {withBuiltinGraphics,GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';
import {GRAPHIC_LIST_KEY,serializeGraphicList} from '../web/persistent-graphic-list.js';
import {filterGraphicList} from '../web/graphic-list-filters.js';
import {CATALOG,CATEGORIES} from '../web/catalog.js';
import {UI_CATALOGS} from '../web/locales/catalogs.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const entries=await withBuiltinGraphics([]);
 // Saved shelves from before the reclassification must use the new groups immediately.
 for(const entry of entries)if(['Circle','RadialGradient','PlumeSmoke','FlowingWater','FilmGrain','WebSigil'].includes(entry.builtin))entry.category=['Circle','RadialGradient'].includes(entry.builtin)?'径向':entry.builtin==='WebSigil'?'法阵':'特效素材';
 for(const entry of entries)if(['Circle','RadialGradient','WebSigil'].includes(entry.builtin))delete entry.builtin;
 entries.push(createProjectResource(node(),{name:'Team image',category:'Team UI',kind:'image'}),createProjectResource(node(),{name:'Team glow',category:'Team VFX',kind:'formula'}),createProjectResource(node('group'),{name:'Team frame',category:'Team UI',kind:'composition'}));
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,marker,text,favoriteIds,recentIds})=>{localStorage.setItem(key,text);localStorage.setItem(marker,'1');localStorage.setItem('momo-texture-tree:graphic-list-favorites:v1',JSON.stringify(favoriteIds));localStorage.setItem('momo-texture-tree:recent:v1',JSON.stringify(recentIds));},{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,text:serializeGraphicList(entries),favoriteIds:[entries[0].id,entries.at(-1).id],recentIds:['preset:'+entries.at(-1).id,'preset:'+entries[0].id]});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 const kinds=page.locator('#library-filter'),categories=page.locator('#library-categories'),cards=page.locator('#shape-library .tree-pattern-card');
 const click=(group,value)=>group.locator('button').evaluateAll((buttons,value)=>buttons.find(b=>b.dataset.value===value).click(),value);
 await page.locator('#library-category-disclosure>summary').click();
 const saved=await page.evaluate(k=>localStorage.getItem(k),GRAPHIC_LIST_KEY);
 assert.deepEqual(await categories.locator('button').evaluateAll(buttons=>buttons.slice(1).map(b=>b.dataset.value)),[...CATEGORIES.map(c=>c.name),'Team UI','Team VFX']);
 for(const category of CATEGORIES){await click(categories,category.name);assert.equal(await cards.count(),CATALOG.filter(p=>p.definition.category===category.id).length);await click(categories,category.name);}
 await page.locator('#shape-search').fill('烟雾与火焰');assert.equal(await cards.count(),12);await page.locator('#shape-search').fill('');
 assert.deepEqual(await kinds.locator('button').evaluateAll(buttons=>buttons.map(b=>b.dataset.value)),['all','favorites','recent','animated']);assert.equal(await cards.count(),entries.length);
 await click(kinds,'favorites');assert.equal(await cards.count(),2);assert.equal(await kinds.locator('[aria-pressed=true]').count(),1);
 await click(kinds,'recent');assert.deepEqual(await cards.evaluateAll(cards=>cards.map(c=>c.dataset.entryId)),[entries.at(-1).id,entries[0].id]);
 await click(kinds,'animated');assert.equal(await cards.count(),filterGraphicList(entries,{mode:'animated'}).length);assert.equal(await cards.locator('.graphic-animated').count(),await cards.count());
 const badge=cards.first().locator('.graphic-animated');assert.equal(await badge.textContent(),'');assert.equal(await badge.locator('svg path').count(),1);assert.equal(await badge.getAttribute('role'),'img');assert.equal(await badge.getAttribute('aria-label'),'含动画');
 await page.locator('#language-settings').selectOption('en');assert.equal(await badge.getAttribute('aria-label'),'Animated graphic');assert.equal(await badge.getAttribute('title'),'Graphics with time-based effects, keyframe animation, or UV motion');
 await cards.first().scrollIntoViewIfNeeded();await cards.first().locator('img[data-ready=true]').waitFor();await mkdir('test-results/graphic-list-filters',{recursive:true});if(!process.argv.includes('--no-screenshots'))await cards.first().screenshot({path:'test-results/graphic-list-filters/'+(built?'built':'source')+'-animated-card.png'});
 await page.locator('.tree-library-search .workspace-menu>summary').click();await page.locator('#shape-library-view').selectOption('list');const badgeLayout=await cards.first().evaluate(card=>{const badge=card.querySelector('.graphic-animated').getBoundingClientRect(),star=card.querySelector('.graphic-favorite').getBoundingClientRect();return {width:badge.width,height:badge.height,overlap:Math.min(badge.right,star.right)>Math.max(badge.x,star.x)&&Math.min(badge.bottom,star.bottom)>Math.max(badge.y,star.y)};});assert.deepEqual(badgeLayout,{width:20,height:20,overlap:false});await page.locator('#shape-library-view').selectOption('grid');await page.keyboard.press('Escape');await page.locator('#language-settings').selectOption('zh-CN');
 await click(kinds,'all');await click(categories,'渐变');await click(categories,'基础形状');assert.equal(await cards.count(),filterGraphicList(entries,{categories:['渐变','基础形状']}).length);
 await click(categories,'Team UI');assert.equal(await cards.count(),filterGraphicList(entries,{categories:['渐变','基础形状','Team UI']}).length);
 await page.locator('#shape-search').fill('Team image');assert.equal(await cards.count(),1);await page.locator('#shape-search').fill('');
 await click(kinds,'favorites');await page.locator('#language-settings').selectOption('en');assert.equal(await categories.getByRole('button',{name:'Gradients',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await kinds.getByRole('button',{name:'Favorites (2)',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await categories.getByRole('button',{name:'Team UI',exact:true}).count(),1);
 // All resets the browse mode while preserving category selection.
 await kinds.getByRole('button',{name:'All',exact:true}).click();assert.equal(await categories.locator('[aria-pressed=true]').count(),3);
 await categories.getByRole('button',{name:'All',exact:true}).click();assert.equal(await cards.count(),entries.length);
 const animatedButton=kinds.getByRole('button',{name:'Animated',exact:true});await animatedButton.focus();await page.keyboard.press('Space');assert.equal(await cards.count(),filterGraphicList(entries,{mode:'animated'}).length);assert.equal(await animatedButton.evaluate(e=>e===document.activeElement),true);await kinds.getByRole('button',{name:'All',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await cards.count(),entries.length);
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),GRAPHIC_LIST_KEY),saved);
 // Usage records come from actual add and preview actions, rather than only seeded storage.
 const addedId=entries.at(-2).id;await cards.locator(':scope>button:nth-of-type(2)').evaluateAll((buttons,id)=>buttons.find(b=>b.parentElement.dataset.entryId===id).click(),addedId);
 await click(kinds,'recent');assert.equal(await cards.first().getAttribute('data-entry-id'),addedId);
 await cards.locator('.component-inspect').evaluateAll((buttons,id)=>buttons.find(b=>b.parentElement.dataset.entryId===id).click(),entries[0].id);assert.equal(await cards.first().getAttribute('data-entry-id'),entries[0].id);
 await page.locator('#return-work').click();await click(kinds,'all');
 await page.locator('.dock-stack').filter({has:page.locator('[data-panel-tab="library"]')}).first().locator('.dock-stack-actions button').first().click();const floating=page.locator('.dock-floating').filter({has:page.locator('[data-panel-tab="library"]')}).first(),report={built,widths:[]};
 await click(categories,'基础形状');await click(categories,'渐变');
 await page.waitForFunction(()=>!document.querySelector('.dock-motion'));
 for(const width of [190,300,470,800]){
  await floating.evaluate((e,width)=>{e.style.width=width+'px';e.style.minWidth='0';e.style.left='360px';e.style.top='12px';e.style.height='950px';},width);
  const bounds=await categories.evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,columns:new Set([...e.children].filter(b=>Math.abs(b.getBoundingClientRect().top-e.firstElementChild.getBoundingClientRect().top)<2).map(b=>Math.round(b.getBoundingClientRect().left))).size}));assert.ok(bounds.scroll<=bounds.width+1);const header=await page.locator('.library-browse-header').boundingBox(),categoryBox=await categories.boundingBox();assert.ok(Math.abs(categoryBox.width-header.width)<3,'expanded categories use the full panel width '+JSON.stringify({width,header:header.width,categories:categoryBox.width}));const searchRow=await page.locator('.tree-library-search').evaluate(e=>{const input=e.querySelector('input').getBoundingClientRect(),button=e.querySelector('.workspace-menu>summary').getBoundingClientRect();return {overflow:e.scrollWidth>e.clientWidth+1,sameRow:Math.abs(input.y-button.y)<4,overlap:Math.min(input.right,button.right)>Math.max(input.x,button.x)&&Math.min(input.bottom,button.bottom)>Math.max(input.y,button.y)};});assert.equal(searchRow.overflow,false);assert.equal(searchRow.overlap,false);if(width>=300)assert.equal(searchRow.sameRow,true);report.widths.push({...bounds,searchRow});
 }
 await page.locator('.tree-library-search .workspace-menu>summary').click();await page.locator('#collapse-library').click();assert.equal(await page.locator('#shape-library>details[open]').count(),0);await page.locator('.tree-library-search .workspace-menu>summary').click();await page.locator('#collapse-library').click();assert.ok(await page.locator('#shape-library>details[open]').count()>0);assert.ok(report.widths[2].columns>report.widths[0].columns);await mkdir('test-results/graphic-list-filters',{recursive:true});if(!process.argv.includes('--no-screenshots'))await page.screenshot({path:'test-results/graphic-list-filters/'+(built?'built':'source')+'.png'});
 await page.locator('#open-graphics-library').click();const libraryCards=page.locator('.graphics-card');await page.waitForFunction(()=>document.querySelectorAll('.graphics-card').length===301);
 const ordered=[...CATALOG].sort((a,b)=>a.category-b.category);
 assert.deepEqual(await libraryCards.locator('.graphics-card-details>small').allTextContents(),ordered.map(p=>UI_CATALOGS.en['categories.'+p.definition.category+'.name']+' · v'+p.definition.revision+' · '+UI_CATALOGS.en[p.definition.generator?'library.generator':'editor.formula']));
 const librarySearch=page.getByPlaceholder('Search names, categories or tags',{exact:true});
 for(const [query,count]of [['Smoke and fire',12],['Water and caustics',6],['Light and particles',15]]){await librarySearch.fill(query);await page.waitForFunction(n=>document.querySelectorAll('.graphics-card').length===n,count);}
 assert.deepEqual(errors,[]);report.checks=['All/Favorites/Recent/Animated modes','recent usage order','animated badges','all 17 category counts','legacy builtin categories','multi-select categories','combined multilingual search','All preserves category selection','last-chip deselection','keyboard and focus','language retains selection','custom categories','responsive chips','saved data unchanged','library category order and search'];await writeFile('test-results/graphic-list-filters/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
