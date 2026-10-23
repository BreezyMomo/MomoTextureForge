import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {project,node} from '../web/tree-model.js';
const built=process.argv.includes('--built'),root=resolve('web'),p=project();p.root.children=[node('shape','Circle'),node('shape','Circle')];for(const n of p.root.children)n.postEffects.dither.enabled=true;p.root.children[0].postEffects.dither.paletteMode=2;
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname,file=path==='/built.html'?resolve('site/index.html'):resolve(root,'.'+(path==='/'?'/index.html':path));if(path!=='/built.html'&&!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+(built?'/built.html':'/')+'#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#language-settings').selectOption('en');
 await page.locator('[role=treeitem]').first().click();await page.locator('[role=treeitem]').nth(1).click({modifiers:['Control']});await page.locator('#inspector-tabs').getByRole('button',{name:'Composite',exact:true}).click();
 const panel=page.locator('#inspector details[data-module="modules.imageFilters"]');if(await panel.getAttribute('open')===null)await panel.locator(':scope>summary .inspector-module-title').click();
 const effect=panel.locator('[data-effect=dither]');if(await effect.locator('details').getAttribute('open')===null)await effect.locator('.post-effect-title').click();
 await effect.getByRole('spinbutton',{name:'Batch Color levels',exact:true}).waitFor({state:'visible'});
 assert.equal(await effect.getByLabel('Batch Ink color',{exact:true}).count(),1);assert.equal(await effect.getByRole('spinbutton',{name:'Batch Color levels',exact:true}).count(),1);
 await effect.getByRole('combobox',{name:'Batch Palette mode',exact:true}).selectOption('2');assert.equal(await effect.getByLabel('Batch Ink color',{exact:true}).count(),1);assert.equal(await effect.getByRole('spinbutton',{name:'Batch Color levels',exact:true}).count(),0);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')));assert.ok(saved.root.children.every(n=>n.postEffects.dither.paletteMode===2));
 await effect.getByRole('combobox',{name:'Batch Palette mode',exact:true}).selectOption('0');assert.equal(await effect.getByRole('spinbutton',{name:'Batch Color levels',exact:true}).count(),1);
 assert.deepEqual(errors,[]);console.log({built,batch:true});
}finally{await browser?.close();server.close();}
