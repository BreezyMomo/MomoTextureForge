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
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const entries=await withBuiltinGraphics([]);entries.push(createProjectResource(node(),{name:'Team image',category:'Team UI',kind:'image'}),createProjectResource(node(),{name:'Team glow',category:'Team VFX',kind:'formula'}),createProjectResource(node('group'),{name:'Team frame',category:'Team UI',kind:'composition'}));
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,marker,text})=>{localStorage.setItem(key,text);localStorage.setItem(marker,'1');},{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,text:serializeGraphicList(entries)});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 const kinds=page.locator('#library-filter'),categories=page.locator('#library-categories'),cards=page.locator('#shape-library .tree-pattern-card');
 const click=(group,value)=>group.locator('button').evaluateAll((buttons,value)=>buttons.find(b=>b.dataset.value===value).click(),value);
 const saved=await page.evaluate(k=>localStorage.getItem(k),GRAPHIC_LIST_KEY);
 assert.equal(await kinds.getByRole('button',{name:'全部',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await cards.count(),entries.length);
 await click(kinds,'formula');await click(kinds,'image');assert.equal(await cards.count(),entries.length-1);assert.equal(await kinds.locator('[aria-pressed=true]').count(),2);
 await click(categories,'渐变');await click(categories,'形状');assert.equal(await cards.count(),filterGraphicList(entries,{types:['formula','image'],categories:['渐变','形状']}).length);
 await click(categories,'Team UI');assert.equal(await cards.count(),filterGraphicList(entries,{types:['formula','image'],categories:['渐变','形状','Team UI']}).length);
 await page.locator('#shape-search').fill('Team image');assert.equal(await cards.count(),1);await page.locator('#shape-search').fill('');
 await page.locator('#language-settings').selectOption('en');assert.equal(await categories.getByRole('button',{name:'Gradient',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await kinds.getByRole('button',{name:'Formula',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await categories.getByRole('button',{name:'Team UI',exact:true}).count(),1);
 // All resets only its own group, and deselecting the last chip returns to All.
 await kinds.getByRole('button',{name:'All',exact:true}).click();assert.equal(await categories.locator('[aria-pressed=true]').count(),3);
 await categories.getByRole('button',{name:'All',exact:true}).click();assert.equal(await cards.count(),entries.length);
 const imageButton=kinds.getByRole('button',{name:'Image',exact:true});await imageButton.focus();await page.keyboard.press('Space');assert.equal(await cards.count(),1);assert.equal(await imageButton.evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Space');assert.equal(await cards.count(),entries.length);
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),GRAPHIC_LIST_KEY),saved);
 await page.locator('.dock-stack').filter({has:page.locator('[data-panel-tab="library"]')}).first().locator('.dock-stack-actions button').first().click();const floating=page.locator('.dock-floating').filter({has:page.locator('[data-panel-tab="library"]')}).first(),report={built,widths:[]};
 await click(categories,'形状');await click(categories,'渐变');
 for(const width of [190,300,540]){
  await floating.evaluate((e,width)=>{e.style.width=width+'px';e.style.minWidth='0';e.style.left='360px';e.style.top='12px';e.style.height='950px';},width);
  const bounds=await categories.evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,columns:getComputedStyle(e).gridTemplateColumns.split(' ').length}));assert.ok(bounds.scroll<=bounds.width+1);const searchRow=await page.locator('.tree-library-search').evaluate(e=>{const input=e.querySelector('input').getBoundingClientRect(),button=e.querySelector('button').getBoundingClientRect();return {overflow:e.scrollWidth>e.clientWidth+1,sameRow:Math.abs(input.y-button.y)<4,overlap:Math.min(input.right,button.right)>Math.max(input.x,button.x)&&Math.min(input.bottom,button.bottom)>Math.max(input.y,button.y)};});assert.equal(searchRow.overflow,false);assert.equal(searchRow.overlap,false);if(width>=300)assert.equal(searchRow.sameRow,true);report.widths.push({...bounds,searchRow});
 }
 await page.locator('#collapse-library').click();assert.equal(await page.locator('#shape-library>details[open]').count(),0);await page.locator('#collapse-library').click();assert.ok(await page.locator('#shape-library>details[open]').count()>0);assert.ok(report.widths[2].columns>report.widths[0].columns);await mkdir('test-results/graphic-list-filters',{recursive:true});await page.screenshot({path:'test-results/graphic-list-filters/'+(built?'built':'source')+'.png'});
 assert.deepEqual(errors,[]);report.checks=['multi-select kinds','multi-select categories','combined search','All reset per group','last-chip deselection','keyboard and focus','language retains selection','custom categories','responsive chips','saved data unchanged'];await writeFile('test-results/graphic-list-filters/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
