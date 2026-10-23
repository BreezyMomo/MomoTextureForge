// Verify functional states remain recognizable across skins and personal accents.
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {createProjectResource} from '../web/project-resources.js';
import {GRAPHIC_LIST_KEY,serializeGraphicList} from '../web/persistent-graphic-list.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';
import {STYLE_IDS,COLOR_SCHEME_IDS,colorContrast} from '../web/appearance.js';
import en from '../web/locales/en.json' with {type:'json'};
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url));
const output=new URL('../test-results/functional-colors/',import.meta.url);await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 const draft=project(),shape=node('shape','Star');shape.name='Animated star';shape.timing.start=.1;shape.timing.end=.9;shape.tracks['transform.rotation']={mode:'absolute',ease:'linear',keys:[[0,0],[.5,180],[1,360]]};draft.root.children=[shape];
 const entry=createProjectResource(shape,{name:'Animated star',category:'Test',kind:'formula'});
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1600,height:1200},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,marker,entries})=>{localStorage.setItem('momo-texture-language:v1',JSON.stringify(['en','zh-CN']));localStorage.setItem(key,entries);localStorage.setItem(marker,'1');},{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,entries:serializeGraphicList([entry])});
 await page.goto(`http://127.0.0.1:${server.address().port}/#tree=`+Buffer.from(JSON.stringify(draft)).toString('base64'));
 await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#startup-screen').waitFor({state:'detached'});
 await page.locator('[role=treeitem]').first().click();
 await page.locator('#workspace-layout-menu>summary').click();await page.getByRole('button',{name:en['layout.animationLayout'],exact:true}).click();
 await page.getByRole('button',{name:en['editor.parameterMode']+en['editor.record'],exact:true}).click();
 await page.locator('#shape-library .graphic-favorite').click();
 await page.locator('#node-animation-editor .animation-key[data-time="0.5"]').click();
 const unchanged=()=>page.evaluate(()=>({hash:location.hash,draft:localStorage.getItem('momo-texture-tree:draft:v1'),undo:document.querySelector('#undo').disabled,redo:document.querySelector('#redo').disabled}));
 const before=await unchanged();
 await page.locator('#appearance-settings').click();
 await page.locator('#appearance-colors>summary').click();
 const read=()=>page.evaluate(()=>{
  const css=s=>getComputedStyle(document.querySelector(s)),read=s=>{const c=css(s);return {color:c.color,bg:c.backgroundColor,border:c.borderTopColor};};
  const actual={badge:read('#shape-library .graphic-animated'),interval:read('#node-animation-editor .animation-interval:not(.context):not(.readonly)'),key:read('#node-animation-editor button.animation-key[aria-pressed=true]'),record:read('#inspector .inspector-animation-mode button.recording'),playhead:read('#node-animation-editor .animation-playhead'),favorite:read('#shape-library .graphic-favorite[aria-pressed=true]')};
  const preview={badge:read('.appearance-preview .graphic-animated'),interval:read('.appearance-preview .animation-interval'),key:read('.appearance-preview .animation-key'),record:read('.appearance-preview .recording'),playhead:read('.appearance-preview .animation-playhead')};
  return {actual,preview,inset:getComputedStyle(document.documentElement).getPropertyValue('--ui-inset').trim()};
 });
 const hex=rgb=>'#'+rgb.match(/\d+/g).slice(0,3).map(v=>(+v).toString(16).padStart(2,'0')).join('');
 const baselines=new Map();
 for(const scheme of COLOR_SCHEME_IDS){
  await page.locator('#appearance-scheme').selectOption(scheme);
 for(const theme of ['classic','graphite','light']){
  await page.locator('#appearance-theme').selectOption(theme);
  for(const style of STYLE_IDS){
   await page.locator('.appearance-style-card[data-style='+style+']').click();
   for(const accent of ['#000000','#FF00FF']){
    await page.locator('#appearance-hex').fill(accent);await page.locator('#appearance-hex').dispatchEvent('input');
    const v=await read(),context=scheme+' '+theme+' '+style+' '+accent;
    for(const role of ['badge','interval','key','record','playhead'])assert.deepEqual(v.preview[role],v.actual[role],role+' preview matches real controls: '+context);
    for(const role of ['badge','interval','record'])assert.ok(colorContrast(hex(v.actual[role].color),hex(v.actual[role].bg))>=4.5,role+' contrast: '+context);
    assert.ok(colorContrast(hex(v.actual.key.color),v.inset)>=3,'key contrast: '+context);
    assert.ok(colorContrast(hex(v.actual.playhead.bg),hex(v.actual.interval.bg))>=3,'playhead above interval: '+context);
    const [r,g,b]=v.actual.interval.color.match(/\d+/g).map(Number);assert.ok(b>r&&b>g,'interval stays blue: '+context);
    const [rr,rg,rb]=v.actual.record.color.match(/\d+/g).map(Number);assert.ok(rr>rg&&rr>rb,'recording stays red: '+context);
    const [gr,gg,gb]=v.actual.badge.color.match(/\d+/g).map(Number);assert.ok(gg>gr&&gg>gb,'animation stays green: '+context);
    const baseline=baselines.get(theme);if(baseline)assert.deepEqual(v.actual,baseline,'functional colors independent of skin/accent: '+context);else baselines.set(theme,v.actual);
   }
  }
 }
 }
 for(const theme of ['classic','graphite','light']){
  await page.locator('#appearance-theme').selectOption(theme);
  for(const role of ['selection','navigation','control'])for(const color of ['#000000','#FFFFFF']){
   const input=page.locator('#appearance-hex-'+role);await input.fill(color);await input.dispatchEvent('input');
   const v=await read();assert.deepEqual(v.actual,baselines.get(theme),'functional colors remain independent of custom '+role);
   for(const key of ['badge','interval','key','record','playhead'])assert.deepEqual(v.preview[key],v.actual[key]);
  }
 }
 for(const scheme of COLOR_SCHEME_IDS)for(const theme of ['classic','light']){
  await page.locator('#appearance-scheme').selectOption(scheme);await page.locator('#appearance-theme').selectOption(theme);await page.locator('.appearance-style-card[data-style=refined]').click();await page.locator('#appearance-tabs').selectOption('pill');
  await page.locator('.appearance-dialog').screenshot({path:fileURLToPath(new URL((built?'built':'source')+'-'+scheme+'-'+theme+'.png',output))});
 }
 await page.locator('#appearance-scheme').selectOption('shuimo');
 assert.deepEqual(await unchanged(),before,'color settings do not edit artwork or history');
 await page.locator('#appearance-theme').selectOption('classic');await page.locator('.appearance-style-card[data-style=aurora]').click();
 await page.locator('.appearance-dialog').screenshot({path:fileURLToPath(new URL((built?'built':'source')+'-preview.png',output))});
 await page.locator('[data-save]').click();
 await page.screenshot({path:fileURLToPath(new URL((built?'built':'source')+'-editor.png',output))});
 await page.locator('#node-animation-editor').getByRole('button',{name:en['timeline.curves'],exact:true}).click();
 const curve=await page.locator('.animation-curve').evaluate(svg=>{const css=getComputedStyle(svg),line=getComputedStyle(svg.querySelector('path')),keys=[...svg.querySelectorAll('circle')].map(key=>getComputedStyle(key).fill);return {line:line.stroke,keys,bg:css.backgroundColor};});
 for(const key of curve.keys){const [r,g,b]=key.match(/\d+/g).map(Number);assert.ok(r>g&&g>b,'curve keyframes stay gold');assert.ok(colorContrast(hex(key),hex(curve.bg))>=3);}
 const [cr,cg,cb]=curve.line.match(/\d+/g).map(Number);assert.ok(cb>cr&&cb>cg,'curve stays blue');

 assert.deepEqual(errors,[]);console.log(JSON.stringify({built,pass:true,combinations:COLOR_SCHEME_IDS.length*3*STYLE_IDS.length*2,checks:['functional colors independent from scheme, accent and skin','recording beats selected-button rules','real/preview fidelity','dark/light contrast','visible playhead over interval','unchanged artwork and history'],errors}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
