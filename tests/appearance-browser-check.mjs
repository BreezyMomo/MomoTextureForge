import {chooseWorkbench} from './workbench-browser.mjs';
// Verify the unified settings, saved preferences and independent custom roles.
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {restoreGraphicList} from '../web/persistent-graphic-list.js';
import {APPEARANCE_KEY,STYLE_IDS,THEME_IDS,PRESET_THEME_IDS,COLOR_ROLE_IDS,TAB_STYLE_IDS,normalizeAppearance,appearancePalette} from '../web/appearance.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),output=fileURLToPath(new URL('../test-results/appearance/',import.meta.url));await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1600,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const savedPreferences={theme:'qingci',style:'aurora',tabs:'pill',density:'compact',colors:{action:'#336699'}};
 await page.addInitScript(({key,savedPreferences})=>{if(!localStorage.getItem('appearance-settings-fixture')){localStorage.setItem(key,JSON.stringify(savedPreferences));localStorage.setItem('appearance-settings-fixture','1');}},{key:APPEARANCE_KEY,savedPreferences});
 const draft=project();draft.name='Appearance isolation';draft.root.children=[node('shape','Circle')];await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(draft)).toString('base64'));
 const ready=async()=>{await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#startup-screen').waitFor({state:'detached'});};await ready();await page.locator('[role=treeitem]').first().click();
 // The shelf's project wrapper gets a fresh UUID on reload; compare its actual resources.
 const snapshot=async()=>{const value=await page.evaluate(()=>({storage:Object.fromEntries(Object.entries(localStorage).filter(([key])=>key!=='momo-texture-appearance:v1')),hash:location.hash,undo:document.querySelector('#undo').disabled,redo:document.querySelector('#redo').disabled}));const digest=v=>createHash('sha256').update(v).digest('hex');return {...value,hash:digest(value.hash),storage:Object.fromEntries(Object.entries(value.storage).map(([k,v])=>[k,digest(k==='momo-texture-tree:graphic-list:v1'?JSON.stringify(restoreGraphicList(v)):v)]))};};
 const initial=await snapshot(),open=()=>page.locator('#appearance-settings').click(),dialog=page.locator('.momo-appearance-react');
 const choose=(id,value)=>chooseWorkbench(page,id,value);
 const custom=async(role,value)=>{const advanced=page.locator('#appearance-colors');if(!await advanced.evaluate(e=>e.open))await advanced.locator('summary').click();await page.locator(role==='action'?'#appearance-hex':'#appearance-hex-'+role).fill(value);};
 const pref=()=>page.evaluate(()=>({theme:document.documentElement.dataset.appearanceTheme,style:document.documentElement.dataset.interfaceStyle,tabs:document.documentElement.dataset.tabStyle,density:document.documentElement.dataset.density}));
 await open();assert.equal(await page.locator('#appearance-colors').evaluate(e=>e.open),false);assert.equal(await page.locator('.appearance-style-card').count(),STYLE_IDS.length);
 const colors={action:'#DD7755',selection:'#DDBB88',navigation:'#6688BB',control:'#66AA99'};for(const role of COLOR_ROLE_IDS)await custom(role,colors[role]);await choose('appearance-density','comfortable');
 for(const id of STYLE_IDS){await page.locator('[data-style='+id+']').click();assert.equal((await pref()).style,id);assert.deepEqual(await snapshot(),initial);}
 for(const tabs of TAB_STYLE_IDS){await choose('appearance-tabs',tabs);assert.equal((await pref()).tabs,tabs);}
 for(const theme of THEME_IDS){await choose('appearance-theme',theme);assert.equal((await pref()).theme,theme);assert.equal(await page.locator('.appearance-palette-color').count(),6);assert.deepEqual(await snapshot(),initial);}
 await choose('appearance-theme','qingci');for(const role of COLOR_ROLE_IDS)await custom(role,colors[role]);await page.locator('[data-save]').click();
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),APPEARANCE_KEY);assert.deepEqual(saved.colors,Object.fromEntries(Object.entries(colors).map(([key,value])=>[key,value.toLowerCase()])));assert.deepEqual(saved,normalizeAppearance(saved));
 await page.reload();await ready();await page.locator('[role=treeitem]').first().click();await open();
 for(const role of COLOR_ROLE_IDS){if(!await page.locator('#appearance-colors').evaluate(e=>e.open))await page.locator('#appearance-colors>summary').click();assert.equal(await page.locator(role==='action'?'#appearance-hex':'#appearance-hex-'+role).inputValue(),colors[role]);}
 await choose('appearance-theme','ouhe');await page.locator('[data-style=minimal]').click();await page.keyboard.press('Escape');assert.deepEqual(await pref(),{theme:saved.theme,style:saved.style,tabs:saved.tabs,density:saved.density});
 await open();await custom('navigation','invalid');await page.locator('[data-save]').click();assert.equal(await dialog.count(),1);assert.equal(await page.locator('#appearance-hex-navigation').getAttribute('aria-invalid'),'true');
 await page.locator('[data-reset]').click();for(const role of COLOR_ROLE_IDS)assert.equal(await page.locator(role==='action'?'#appearance-hex':'#appearance-hex-'+role).inputValue(),appearancePalette({theme:saved.theme}).colors[role].toUpperCase());
 await page.locator('[data-cancel]').click();await choose('language-settings','en');await open();assert.equal(await page.locator('#appearance-title').innerText(),'Appearance');
 for(const width of [1600,1100,768,390,320]){await page.setViewportSize({width,height:1050});assert.ok(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1));await dialog.screenshot({path:path.join(output,(built?'built':'source')+'-react-'+width+'.png')});}
 await page.locator('[data-cancel]').click();await page.setViewportSize({width:1600,height:1050});
 await page.locator('#header-file-menu').press('ArrowDown');await page.getByRole('menu').waitFor();await page.keyboard.press('Home');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.id==='header-file-menu');
 await page.locator('#workspace-layout-menu').click();const layout=page.locator('[data-slot=popover-content]');await layout.getByRole('textbox',{name:'Layout name',exact:true}).fill('React trial');await layout.getByRole('button',{name:'Save current layout',exact:true}).click();assert.ok((await layout.innerText()).includes('React trial'));await page.keyboard.press('Escape');
 assert.equal((await snapshot()).hash,initial.hash);assert.equal((await snapshot()).undo,initial.undo);assert.equal((await snapshot()).redo,initial.redo);
 assert.deepEqual(errors,[]);console.log({built,pass:true,themes:THEME_IDS.length,styles:STYLE_IDS.length,tabs:TAB_STYLE_IDS.length,customRoles:4,saveReloadCancel:true,validation:true,englishNarrow:true,keyboardMenu:true,layoutSave:true,errors});
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
