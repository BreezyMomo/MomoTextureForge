import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {COLOR_SCHEME_IDS,colorContrast} from '../web/appearance.js';

const built=process.argv.includes('--built'),root=path.resolve(built?'site':'web'),output=path.resolve('test-results/workspace-workflow');
await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const errors=[],report={built,checks:[],contrasts:[]};
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 const p=project();p.root.children=['Ring','Circle','Star'].map((type,i)=>{const n=node('shape',type);n.name=['Outer ring','Central disc','Star accent'][i];n.transform.width=n.transform.height=[.85,.45,.2][i];return n;});
 await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));
 const settle=async()=>{await page.waitForFunction(()=>document.documentElement.dataset.ready==='true'&&!document.querySelector('.dock-motion'));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};await settle();
 const snapshot=()=>page.evaluate(()=>({draft:localStorage.getItem('momo-texture-tree:draft:v1'),undo:document.querySelector('#undo').disabled,hash:location.hash}));
 await page.locator('#node-tree .tree-node-name').first().click();const initial=await snapshot();
 const order=()=>page.locator('#inspector>.inspector-module').evaluateAll(es=>es.map(e=>e.dataset.module));
 assert.equal((await order())[0],'modules.shapeParameters');
 const params=page.locator('#inspector>[data-module="modules.shapeParameters"]');
 await params.locator('.module-drag-handle').press('ArrowDown');assert.notEqual((await order())[0],'modules.shapeParameters');
 await page.locator('#inspector-layout-menu>summary').click();await page.locator('#reset-inspector-order').click();assert.equal((await order())[0],'modules.shapeParameters');
 report.checks.push('default parameter priority, keyboard reorder and explicit reset');
 await page.locator('#resource-actions-menu>summary').click();assert.equal(await page.locator('#save-selected-component').isVisible(),true);assert.match(await page.locator('#resource-actions-menu .workspace-scope-note').innerText(),/Outer ring/);await page.keyboard.press('Escape');
 await page.locator('#playback-settings>summary').click();assert.equal(await page.locator('#play-duration').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#play').isVisible(),true);
 const categories=page.locator('#library-category-disclosure');assert.equal(await categories.getAttribute('open'),null);await categories.locator('summary').click();await page.locator('#library-categories button[data-value]').nth(1).click();assert.doesNotMatch(await categories.locator('summary').innerText(),/全部/);await page.locator('#library-categories button[data-value=""]').click();await categories.locator('summary').click();
 await page.screenshot({path:path.join(output,(built?'built':'source')+'-default.png')});
 // Space must activate a focused tab, even when it previously started playback.
 const stack=id=>page.locator('.dock-stack').filter({has:page.locator('[data-panel-tab="'+id+'"]')}).first();
 async function drag(id,target,x=.5,y=.5){const a=await page.locator('[data-panel-tab="'+id+'"]').boundingBox(),b=await target.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width*x,b.y+b.height*y,{steps:16});await page.mouse.up();await settle();}
 await drag('library',stack('nodes'));await page.locator('[data-panel-tab="nodes"]').click();await page.locator('[data-panel-tab="library"]').focus();await page.keyboard.press('Space');await settle();assert.equal(await page.locator('[data-panel-tab="library"]').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#play').innerText(),'播放');
 await drag('library',stack('canvas'),.5,.90);
 const cardSpace=await page.locator('#shape-library').evaluate(e=>e.clientHeight);assert.ok(cardSpace>=100,'bottom docking retains usable thumbnail space');
 await page.screenshot({path:path.join(output,(built?'built':'source')+'-bottom-library.png')});
 await stack('inspector').locator('.dock-stack-actions button').first().click();const floating=page.locator('.dock-floating').filter({has:page.locator('[data-panel-tab="inspector"]')});await floating.evaluate(e=>e.style.width='240px');await settle();
 await page.locator('#node-tree .tree-node-name').first().click();
 const slider=await page.locator('#inspector input[type=range]').first().boundingBox();assert.ok(slider.width>140,'narrow panels give sliders their own row');
 assert.equal(await page.locator('#inspector').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 await page.screenshot({path:path.join(output,(built?'built':'source')+'-narrow-inspector.png')});
 report.checks.push('merged tab keyboard activation','bottom library scroll area','narrow floating inspector');
 await floating.evaluate(e=>e.style.width='760px');await settle();
 for(const language of ['en','zh-CN']){
  await page.locator('#language-settings').selectOption(language);await floating.evaluate(e=>e.style.width='760px');await settle();
  const row=page.locator('#inspector .tree-number-field:has(>input[type=range])').first();
  const label=await row.locator('label').boundingBox(),range=await row.locator('input[type=range]').boundingBox(),value=await row.locator('input[type=number]').boundingBox();
  assert.ok(label.x+label.width<=range.x&&range.x+range.width<=value.x,'wide inspector keeps label, slider and value in separate columns');
  assert.ok(Math.abs(label.y+label.height/2-range.y-range.height/2)<2,'wide inspector aligns labels and sliders on one row');
  assert.equal(await page.locator('#inspector').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 }
 await floating.screenshot({path:path.join(output,(built?'built':'source')+'-wide-inspector.png')});
 report.checks.push('wide floating inspector aligns Chinese and English parameters');
 await page.locator('#appearance-settings').click();
 for(const style of ['classic','segmented','pill','underline']){
  await page.locator('#appearance-tabs').selectOption(style);await settle();
  const grip=await floating.locator('.dock-window-move').boundingBox(),tabs=await floating.locator('.dock-tabs').boundingBox(),body=await floating.locator('.dock-panel-body:not([hidden])').boundingBox(),corner=await floating.locator('.dock-window-resize').boundingBox();
  assert.ok(grip.x+grip.width<=tabs.x,style+' keeps window movement separate from tabs');
  assert.ok(body.y+body.height<=corner.y,style+' keeps resizing below content');
 }
 await page.locator('.appearance-dialog [data-cancel]').click();
 report.checks.push('floating handles stay separate in all four tab styles');
 await drag('inspector',stack('canvas'),.9,.5);
 await page.locator('#shape-library .component-inspect').first().click();assert.equal(await page.locator('.resource-editing-note').isVisible(),true);assert.equal(await page.locator('#save-project').isDisabled(),true);assert.equal(await page.locator('#preview-update').isVisible(),true);
 await page.locator('#resource-actions-menu>summary').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.resource-editing-note').isVisible(),true,'Escape closes the menu without leaving the resource session');
 await page.locator('#language-settings').selectOption('en');assert.equal(await page.locator('#play').innerText(),'Play');await page.locator('#return-work').click();assert.equal(await page.locator('.resource-editing-note').isVisible(),false);assert.deepEqual(await snapshot(),initial);
 report.checks.push('resource scope and saving affordances','playback translation after trial edit','view changes preserve project and undo');
 await page.locator('#workspace-layout-menu>summary').click();await page.getByRole('button',{name:'Resource browsing layout',exact:true}).click();await settle();const savedLayout=await page.evaluate(()=>localStorage.getItem('momo-texture-forge:workspace-layouts:v1'));await page.reload();await settle();assert.equal(await page.evaluate(()=>localStorage.getItem('momo-texture-forge:workspace-layouts:v1')),savedLayout);
 await page.locator('#node-tree .tree-node-name').first().click();await page.setViewportSize({width:1280,height:900});await settle();await page.screenshot({path:path.join(output,(built?'built':'source')+'-english-browse.png')});
 // Measure actual backgrounds, including theme-specific component overrides.
 await page.locator('#appearance-settings').click();
 for(const theme of ['classic','graphite','light'])for(const scheme of COLOR_SCHEME_IDS){
  await page.locator('#appearance-theme').selectOption(theme);await page.locator('#appearance-scheme').selectOption(scheme);
  const colors=await page.evaluate(()=>{
   const hex=color=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle=color;c.fillRect(0,0,1,1);return '#'+[...c.getImageData(0,0,1,1).data].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');};
   const e=document.querySelector('#shape-search'),b=document.querySelector('#library-filter [aria-pressed=true]');return {placeholder:hex(getComputedStyle(e,'::placeholder').color),field:hex(getComputedStyle(e).backgroundColor),fg:hex(getComputedStyle(b).color),bg:hex(getComputedStyle(b).backgroundColor)};
  });
  const placeholder=colorContrast(colors.placeholder,colors.field),filter=colorContrast(colors.fg,colors.bg);report.contrasts.push({theme,scheme,placeholder,filter});assert.ok(placeholder>=4.5,theme+'/'+scheme+' placeholder '+placeholder);assert.ok(filter>=4.5,theme+'/'+scheme+' filter '+filter);
 }
 await page.locator('#appearance-theme').selectOption('light');await page.locator('#appearance-scheme').selectOption('shuimo');await page.locator('[data-save]').click();await page.screenshot({path:path.join(output,(built?'built':'source')+'-light.png')});
 await page.locator('#open-graphics-library').click();await page.locator('.graphics-card').first().waitFor();assert.equal(await page.locator('.graphics-browse-controls input').isVisible(),true);await page.locator('.graphics-card-details').first().locator('summary').click();assert.ok(await page.locator('.graphics-card-details').first().getByRole('button').count()>0);await page.screenshot({path:path.join(output,(built?'built':'source')+'-library.png')});
 report.checks.push('custom workspace persistence','English browsing preset','42 theme/palette contrast combinations','resource library browsing and management');
 assert.deepEqual(errors,[]);await writeFile(path.join(output,(built?'built':'source')+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({built,checks:report.checks,contrasts:report.contrasts.length,errors}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
