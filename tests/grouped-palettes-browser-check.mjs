import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {PRESET_THEME_IDS,THEME_IDS,STYLE_IDS,appearancePalette,colorContrast} from '../web/appearance.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),output=fileURLToPath(new URL('../test-results/grouped-palettes/',import.meta.url));
await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const p=project();p.name='星环 · 配色预览';
 const rings=node('shape','Concentric');rings.name='星环';rings.transform.width=rings.transform.height=.9;rings.color={mode:'own',fill:'gradient',low:'#1a254a',high:'#80dfff'};
 const star=node('shape','Star');star.name='星芒';star.transform.width=star.transform.height=.23;star.color={mode:'own',fill:'solid',low:'#f1dfad',high:'#f1dfad'};p.root.children=[rings,star];
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1800,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));
 const ready=async()=>{await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#startup-screen').waitFor({state:'detached'});};await ready();assert.equal(await page.locator('html').getAttribute('data-appearance-theme'),'xuanhei','fresh browsers use Carbon & Gold');
 await page.locator('[role=treeitem]').first().click();
 const snapshot=async()=>{const result=await page.evaluate(()=>({hash:location.hash,draft:localStorage.getItem('momo-texture-tree:draft:v1'),undo:document.querySelector('#undo').disabled,redo:document.querySelector('#redo').disabled,width:document.querySelector('#tree-canvas').width,height:document.querySelector('#tree-canvas').height,pixels:document.querySelector('#tree-canvas').toDataURL()}));return {...result,hash:createHash('sha256').update(result.hash).digest('hex'),pixels:createHash('sha256').update(result.pixels).digest('hex')};};
 const before=await snapshot(),open=()=>page.locator('#appearance-settings').click(),scheme=page.locator('#appearance-theme'),tabs=page.locator('#appearance-tabs');
 const hex=rgb=>'#'+rgb.match(/[\d.]+/g).slice(0,3).map(v=>(+v).toString(16).padStart(2,'0')).join('');
 const read=()=>page.evaluate(()=>{
  const css=s=>getComputedStyle(document.querySelector(s)),root=getComputedStyle(document.documentElement),token=k=>root.getPropertyValue('--ui-'+k).trim();
  const visual=s=>{const c=css(s);return {color:c.color,bg:c.backgroundColor,shadow:c.boxShadow,radius:c.borderRadius,border:c.borderColor};};
  const toHex=value=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle=value;c.fillRect(0,0,1,1);return '#'+[...c.getImageData(0,0,1,1).data].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');};
  const regions=['.dock-stack[data-panel=library] .dock-stack-actions button','.dock-stack[data-panel=nodes] .dock-stack-actions button','.dock-stack[data-panel=inspector] .dock-stack-actions button','.inspector-module-title','.inspector-module-help','.tree-node.selected .tree-node-name','#library-filter [aria-pressed=true]','#open-graphics-library','#play'].map(selector=>{const e=document.querySelector(selector);let bg=e;while(bg.parentElement&&getComputedStyle(bg).backgroundColor==='rgba(0, 0, 0, 0)')bg=bg.parentElement;return {selector,fg:toHex(getComputedStyle(e).color),bg:toHex(getComputedStyle(bg).backgroundColor)};});
  return {headers:[...document.querySelectorAll('.dock-workspace .dock-stack-header')].map(e=>getComputedStyle(e).backgroundColor),regions,resource:visual('#open-graphics-library'),action:visual('#export-now'),previewAction:visual('.appearance-preview-toolbar .primary'),nav:visual('#inspector-tabs>button.active'),previewNav:visual('.appearance-inspector-tabs>button.active'),dock:visual('.dock-workspace .dock-tab[data-panel-tab=inspector]'),previewDock:visual('.appearance-preview-dock .dock-tab[aria-selected=true]'),node:visual('.tree-node.selected'),nodeSelection:css('.tree-node.selected').getPropertyValue('--ui-accent-text').trim(),slider:css('#inspector input[type=range]').accentColor,previewSlider:css('.appearance-preview-value progress').accentColor,selection:token('selection'),navigation:token('navigation'),control:token('control'),header:css('.tree-header').backgroundColor,stage:css('.dock-panel-body>.tree-preview').backgroundColor,interval:visual('.appearance-preview .animation-interval'),record:visual('.appearance-preview .recording')};
 });
 let checks=0;await open();
 assert.deepEqual(await scheme.locator('option').evaluateAll(options=>options.map(o=>o.value)),THEME_IDS,'one list of complete themes, without a second mode selector');
 for(const id of PRESET_THEME_IDS){const mode=appearancePalette({theme:id}).theme;
  await scheme.selectOption(id);await tabs.selectOption('segmented');
  for(const style of STYLE_IDS){
   await page.locator('.appearance-style-card[data-style='+style+']').click();
   for(const tab of style==='refined'?['classic','segmented','pill','underline']:['segmented']){
    await tabs.selectOption(tab);const v=await read(),context=id+' '+mode+' '+style+' '+tab;
    assert.equal(await page.locator('html').getAttribute('data-palette-roles'),'true');assert.equal(await page.locator('.appearance-palette-color').count(),6);
    assert.equal(new Set(v.headers).size,1,context+' peer headers share one surface');assert.equal(v.previewAction.bg,v.action.bg,context+' primary preview');assert.equal(v.previewAction.color,v.action.color);
    const areas=await page.evaluate(()=>{const bg=s=>getComputedStyle(document.querySelector(s)).backgroundColor;return {workspace:bg('.tree-header'),tools:bg('.dock-panel-body>.tree-preview'),header:bg('.dock-workspace .dock-stack-header'),content:bg('.inspector-module'),previewWorkspace:bg('.appearance-preview-toolbar'),previewHeader:bg('.appearance-preview-dock .dock-stack-header'),previewContent:bg('.appearance-preview-module')};});
    const palette=appearancePalette({theme:id});assert.equal(hex(areas.workspace),palette.surfaces.bg);assert.equal(areas.tools,areas.workspace,'preview tools follow workspace, not a gray surround');assert.equal(hex(areas.header),palette.roles.header);assert.equal(hex(areas.content),palette.surfaces.panel);assert.equal(areas.previewWorkspace,areas.workspace);assert.equal(areas.previewHeader,areas.header);assert.equal(areas.previewContent,areas.content);
    if(mode==='light'){
     const edges=await page.evaluate(()=>{const css=s=>getComputedStyle(document.querySelector(s)),field=css('#inspector input[type=number]'),pane=css('.dock-workspace .dock-stack'),card=css('.inspector-module');return {fieldBg:field.backgroundColor,fieldBorder:field.borderTopColor,frame:pane.borderTopColor,card:card.borderTopColor};});
     assert.ok(colorContrast(hex(edges.fieldBorder),hex(edges.fieldBg))>=3,context+' input boundary');
     assert.ok(colorContrast(hex(edges.frame),hex(areas.workspace))>=1.5,context+' panel separation');
     assert.notEqual(edges.card,'rgba(0, 0, 0, 0)',context+' visible content boundary');
    }

    assert.ok(colorContrast(hex(v.dock.color),hex(v.dock.bg==='rgba(0, 0, 0, 0)'?areas.header:v.dock.bg))>=4.5,context+' active dock header contrast');
    assert.deepEqual(v.previewNav,v.nav,context+' inspector preview');assert.deepEqual(v.previewDock,v.dock,context+' dock preview');
    assert.equal(hex(v.slider),v.control,context+' parameter role');assert.equal(v.previewSlider,v.slider);assert.equal(v.nodeSelection,v.selection,context+' selection role');
    assert.equal(v.control,v.navigation,context+' controls and navigation share the interaction color');
    for(const region of v.regions)assert.ok(colorContrast(region.fg,region.bg)>=4.5,context+' '+region.selector+' '+colorContrast(region.fg,region.bg));
    assert.ok(colorContrast(hex(v.action.color),hex(v.action.bg))>=4.5,context+' action contrast');
    if(v.nav.bg!=='rgba(0, 0, 0, 0)')assert.ok(colorContrast(hex(v.nav.color),hex(v.nav.bg))>=4.5,context+' navigation contrast');
    assert.equal(v.interval.color,mode==='light'?'rgb(36, 90, 128)':'rgb(180, 217, 255)','time intervals keep blue');
    assert.equal(v.record.color,mode==='light'?'rgb(164, 48, 70)':'rgb(255, 177, 184)','recording keeps red');checks++;
   }
  }
  await page.locator('.appearance-style-card[data-style=refined]').click();await tabs.selectOption('pill');
  const original=await read();await page.locator('#appearance-colors>summary').click();await page.locator('#appearance-hex').fill('#ff00ff');await page.locator('#appearance-hex').dispatchEvent('input');const custom=await read();
  for(const key of ['node','nav','dock','slider','selection','navigation','control','header','stage'])assert.deepEqual(custom[key],original[key],key+' stays independent of the primary action color');assert.notEqual(custom.action.bg,original.action.bg);
  await page.locator('[data-reset]').click();await page.locator('#appearance-colors>summary').click();await page.locator('.appearance-dialog').evaluate(e=>e.scrollTop=0);assert.deepEqual(await snapshot(),before,'palette changes preserve artwork, pixels and undo');
  if(mode!=='graphite'){
   const lane=await page.locator('.appearance-preview .animation-lane').boundingBox(),footer=await page.locator('.appearance-dialog>footer').boundingBox();assert.ok(lane.y+lane.height<footer.y,'preview timeline is visible above the footer');
   await page.locator('.appearance-dialog').screenshot({path:path.join(output,`${built?'built':'source'}-${id}-${mode}-settings.png`)});
  }
  await tabs.selectOption('segmented');await page.locator('[data-save]').click();
  if(mode!=='graphite')await page.screenshot({path:path.join(output,`${built?'built':'source'}-${id}-${mode}-editor.png`)});
  await open();console.log('palette checked',id,mode);
 }
 await scheme.selectOption('shuimo');await page.locator('[data-save]').click();await page.reload();await ready();assert.equal(await page.locator('html').getAttribute('data-appearance-theme'),'shuimo');await page.locator('[role=treeitem]').first().click();
 await open();const saved=await read();await scheme.selectOption('mineral');await page.keyboard.press('Escape');assert.equal(await page.locator('html').getAttribute('data-appearance-theme'),'shuimo');await open();assert.deepEqual(await read(),saved,'cancel restores all role tokens');
 await scheme.selectOption('mineral');assert.equal(await page.locator('html').getAttribute('data-palette-roles'),'true');assert.equal(await page.locator('.appearance-palette-strip').isVisible(),true);assert.notEqual(await page.locator('html').evaluate(e=>e.style.getPropertyValue('--ui-navigation')),'');
 await scheme.selectOption('qingci');await page.locator('[data-save]').click();await page.locator('#language-settings').selectOption('en');await open();assert.equal(await scheme.locator('option[value=qingci]').innerText(),'Celadon & Gold');assert.match(await page.locator('.appearance-palette-strip').innerText(),/Selection/);
 for(const width of [768,550,320]){await page.setViewportSize({width,height:960});assert.equal(await page.locator('.appearance-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'dialog fits '+width);}
 assert.deepEqual(errors,[]);console.log({built,checks,coordinatedRoles:true,allStyles:true,realPreview:true,contrast:true,saveReloadCancel:true,artworkUnchanged:true,englishNarrow:true,errors});
}finally{await browser?.close();await new Promise(r=>server.close(r));}
