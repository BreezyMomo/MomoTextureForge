import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {splitBezier} from '../web/bezier-path.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';

const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root))throw Error();res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const draft=project(),a=node('shape','BezierRibbon'),b=node('shape','BezierRibbon');draft.root.children=[a,b];draft.output.width=draft.output.height=96;
 const shape=splitBezier(splitBezier(a.params.slice(0,8),0),0),layout=splitBezier(a.arrange.slice(20,28),0);
 a.params.splice(0,8,...shape.slice(0,8));a.bezier.shape=shape.slice(8);a.arrange.splice(20,8,...layout.slice(0,8));a.bezier.layout=layout.slice(8);a.arrange[0]=6;
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(key=>localStorage.setItem(key,'1'),GRAPHIC_LIST_DEFAULTS_KEY);
 await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(draft)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await page.locator('#language-settings').selectOption('en');await page.locator('[role=treeitem]').first().click();
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1'))),first=async()=>(await saved()).root.children[0];
 const change=async(label,value)=>{const input=page.getByRole('spinbutton',{name:label,exact:true});await input.fill(String(value));await input.press('Tab');};
 const endX=page.getByRole('spinbutton',{name:'End X',exact:true}),endY=page.getByRole('spinbutton',{name:'End Y',exact:true});
 assert.equal(await endX.getAttribute('data-animation-path'),'bezier.shape.10');assert.equal(Number(await endX.inputValue()),shape.at(-2));
 await change('End X',.63);let n=await first();assert.equal(n.bezier.shape[10],.63);assert.deepEqual(n.params.slice(0,8),a.params.slice(0,8));assert.deepEqual(n.bezier.shape.slice(0,-2),a.bezier.shape.slice(0,-2));
 await change('End Y',.41);n=await first();assert.equal(n.bezier.shape[11],.41);assert.deepEqual(n.params.slice(6,8),a.params.slice(6,8));
 await page.locator('#undo').click();assert.equal((await first()).bezier.shape[11],shape.at(-1));await page.locator('#redo').click();assert.equal((await first()).bezier.shape[11],.41);
 await page.getByRole('button',{name:'Reset End X',exact:true}).click();assert.equal((await first()).bezier.shape[10],node('shape','BezierRibbon').params[6]);
 await page.locator('#inspector [data-key-path="bezier.shape.11"]').click();n=await first();assert.ok(n.tracks['bezier.shape.11']);assert.equal(n.tracks['params.7'],undefined);assert.equal(await endY.isDisabled(),true);await page.locator('#undo').click();assert.equal(await endY.isDisabled(),false);
 // The path layout uses the same endpoint rule, independently of the shape path.
 await page.locator('#inspector-tabs button').nth(1).click();const layoutX=page.getByRole('spinbutton',{name:'Path end X',exact:true});assert.equal(await layoutX.getAttribute('data-animation-path'),'bezier.layout.4');
 await change('Path end X',.52);await change('Path end Y',-.22);n=await first();assert.deepEqual(n.bezier.layout.slice(-2),[.52,-.22]);assert.deepEqual(n.arrange.slice(20,28),a.arrange.slice(20,28));assert.deepEqual(n.bezier.shape.slice(-2),[.8,.41]);
 await page.getByRole('button',{name:'Reset Path end Y',exact:true}).click();assert.equal((await first()).bezier.layout[5],node().arrange[27]);
 // Batch edits resolve the endpoint per node, even with different span counts.
 await page.locator('#inspector-tabs button').nth(0).click();await page.locator('[role=treeitem]').nth(1).click({modifiers:['Control']});await change('Batch End X',.59);
 const both=(await saved()).root.children;assert.equal(both[0].bezier.shape[10],.59);assert.equal(both[1].params[6],.59);assert.deepEqual(both[0].params.slice(0,8),a.params.slice(0,8));
 await page.locator('#undo').click();assert.equal((await first()).bezier.shape[10],.8);
 await page.locator('[role=treeitem]').first().click();await page.locator('#language-settings').selectOption('zh-CN');assert.equal(await page.getByRole('spinbutton',{name:'终点X',exact:true}).getAttribute('data-animation-path'),'bezier.shape.10');
 assert.deepEqual(errors,[]);await mkdir('test-results/bezier-endpoint',{recursive:true});
 const report={built,pass:true,checks:['final anchor on three spans','intermediate anchors unchanged','undo/redo','endpoint reset','endpoint keyframe and lock','layout endpoint','mixed-topology batch edit','language switch']};await writeFile('test-results/bezier-endpoint/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
