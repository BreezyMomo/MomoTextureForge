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
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const entries=(await withBuiltinGraphics([])).slice(0,2);entries.push(createProjectResource(node(),{name:'Team graphic',category:'Team',kind:'formula'}));
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,marker,text,builtin})=>{if(localStorage.getItem(marker))return;localStorage.setItem(key,text);localStorage.setItem(marker,'1');localStorage.setItem('momo-texture-forge:ui',JSON.stringify({favorites:[builtin]}));},{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,text:serializeGraphicList(entries),builtin:entries[0].builtin});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 const cards=page.locator('#shape-library .tree-pattern-card'),filter=page.locator('#library-filter button[data-value=favorites]'),star=cards.last().locator('.graphic-favorite');
 await page.waitForFunction(()=>document.querySelector('#library-filter button[data-value=favorites]').textContent==='收藏（1）');const saved=await page.evaluate(k=>localStorage.getItem(k),GRAPHIC_LIST_KEY);
 assert.equal(await cards.first().locator('.graphic-favorite').getAttribute('aria-pressed'),'true');await star.click();assert.equal(await filter.textContent(),'收藏（2）');
 await filter.click();assert.equal(await cards.count(),2);await page.locator('#shape-search').fill('Team');assert.equal(await cards.count(),1);await page.locator('#shape-search').fill('');
 await page.locator('#language-settings').selectOption('en');assert.equal(await filter.textContent(),'Favorites (2)');assert.equal(await cards.last().locator('.graphic-favorite').getAttribute('title'),'Unfavorite Team graphic');
 const customStar=cards.last().locator('.graphic-favorite');await customStar.focus();await page.keyboard.press('Space');assert.equal(await cards.count(),1);assert.equal(await filter.evaluate(e=>e===document.activeElement),true);
 await cards.first().locator('.graphic-favorite').click();assert.equal(await cards.count(),0);assert.match(await page.locator('#shape-library').textContent(),/No matching favorites/);await page.locator('#library-filter button[data-value=all]').click();assert.equal(await cards.count(),3);
 await page.locator('#shape-library-view').selectOption('list');await cards.last().locator('.graphic-favorite').click();assert.equal(await filter.textContent(),'Favorites (1)');
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),GRAPHIC_LIST_KEY),saved);await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.equal(await cards.last().locator('.graphic-favorite').getAttribute('aria-pressed'),'true');assert.equal(await filter.textContent(),'Favorites (1)');
 // A favorite must not add a node, trigger preview selection, or obscure card actions.
 assert.equal(await page.locator('#node-tree [role=treeitem]').count(),0);await page.locator('#shape-library-view').selectOption('grid');
 const hit=await cards.last().locator('.graphic-favorite').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;});assert.equal(hit,true);
 await mkdir('test-results/graphic-list-favorites',{recursive:true});await page.screenshot({path:'test-results/graphic-list-favorites/'+(built?'built':'source')+'.png'});assert.deepEqual(errors,[]);
 const report={built,checks:['legacy migration','personal graphic favorite','favorites plus search','English labels','keyboard unfavorite','empty state','list view','reload persistence','no project mutation','visible clickable star']};await writeFile('test-results/graphic-list-favorites/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
