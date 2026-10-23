import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {STYLE_IDS,colorContrast} from '../web/appearance.js';

const built=process.argv.includes('--built'),root=path.resolve(built?'site':'web');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html')));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1600,height:1100},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const p=project(),n=node('shape','Circle');p.root.children=[n];
 await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));
 await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await page.locator('#node-tree .tree-node-name').first().click();
 const paths=['params.0','color.mode','enabled'],key=path=>page.locator('#inspector [data-key-path="'+path+'"]');
 const read=()=>page.evaluate(paths=>{const background=e=>{let result=[255,255,255];const layers=[];for(let node=e;node;node=node.parentElement)layers.unshift(getComputedStyle(node).backgroundColor);for(const color of layers){const [r,g,b,a=1]=color.match(/[\d.]+/g).map(Number);result=[r,g,b].map((v,i)=>v*a+result[i]*(1-a));}return 'rgb('+result.map(Math.round).join(', ')+')';};return paths.map(path=>{const e=document.querySelector('#inspector [data-key-path="'+path+'"]'),css=getComputedStyle(e),root=getComputedStyle(document.documentElement);return {state:e.dataset.keyState,color:css.color,bg:background(e),dot:getComputedStyle(e.querySelector('.keyframe-dot')).display,fill:getComputedStyle(e.querySelector('path')).fill,expected:root.getPropertyValue(e.dataset.keyState==='none'?'--ui-muted':'--ui-key').trim()};});},paths);
 const hex=rgb=>'#'+rgb.match(/[\d.]+/g).slice(0,3).map(v=>(+v).toString(16).padStart(2,'0')).join('');
 async function check(state){await page.waitForFunction(({paths,state})=>paths.every(path=>document.querySelector('#inspector [data-key-path="'+path+'"]').dataset.keyState===state),{paths,state},{timeout:5000});const rows=await read();assert.equal(new Set(rows.map(r=>r.color)).size,1,'same state across numeric, choice and checkbox rows');for(const r of rows){assert.equal(r.state,state);assert.equal(hex(r.color),r.expected);assert.ok(colorContrast(hex(r.color),hex(r.bg))>=3,'icon contrast '+JSON.stringify(r));assert.equal(r.dot,state==='animated'?'block':'none');assert.equal(r.fill,state==='current'?r.color:'none');}}
 await check('none');
 // Record through each real control, then verify both keyed and between-key states.
 for(const path of paths)await key(path).click();await check('current');
 await page.locator('#tree-time').fill('0.5');await check('animated');
 await page.locator('#tree-time').fill('0');await check('current');
 for(let i=0;i<paths.length;i++)await page.locator('#undo').click();await check('none');
 await page.locator('#appearance-settings').click();
 let checks=0;
 for(const theme of ['shuimo','xuanhei','yuebai','qingci','qinghua','mineral','ouhe']){
  await page.locator('#appearance-theme').selectOption(theme);
  for(const style of STYLE_IDS){
   await page.locator('.appearance-style-card[data-style='+style+']').click();await check('none');
   const preview=await page.locator('.appearance-preview-value .appearance-preview-icon').last().evaluate(e=>getComputedStyle(e).color);assert.equal(preview,(await read())[0].color);
   checks++;
  }
 }
 await page.locator('[data-cancel]').click();
 await mkdir('test-results/keyframe-colors',{recursive:true});
 await page.locator('.tree-inspector').screenshot({path:'test-results/keyframe-colors/'+(built?'built':'source')+'.png'});
 assert.deepEqual(errors,[]);console.log({built,checks,states:['none','current','animated'],controlTypes:['numeric','choice','checkbox'],undo:true,preview:true,errors});
}finally{await browser?.close();await new Promise(r=>server.close(r));}
