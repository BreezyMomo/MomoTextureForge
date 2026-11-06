import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {seedBrowserFolder} from './browser-folder-fixture.mjs';
import {encodeResourcePack} from '../web/resource-pack.js';
import {node,PRESET_SCHEMA} from '../web/tree-model.js';

const root=resolve('.'),out=resolve('test-results/cross-tab-library');await mkdir(out,{recursive:true});
async function record(name,radius,resourceId=crypto.randomUUID()){
 const entry={resourceId,versionId:1,personalRevision:0,name,kind:'formula',category:'Cross tab',thumbnail:''},graphic=node('shape','Circle');graphic.params[0]=radius;
 return {entry,bytes:await encodeResourcePack({schema:PRESET_SCHEMA,root:graphic,graphicResource:entry})};
}
// Same resource ID/version in two folders, but different content. A materialized
// root from the previous folder must never substitute for the current bytes.
const a=await record('Cross tab A',.12),b=await record('Cross tab B',.42,a.entry.resourceId),extra=await record('Cross tab saved',.3);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glsl':'text/plain','.png':'image/png','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://test').pathname;if(path==='/seed'){res.setHeader('Content-Type','text/html');res.end('<p>Isolated cross-tab folder fixture</p>');return;}const file=path==='/offline.html'?resolve(root,'dist/MomoTextureForge.html'):path==='/built.html'?resolve(root,'site/index.html'):resolve(root,path.startsWith('/assets/')?'site':'web','.'+(path.startsWith('/modules/')?path.slice(8):path==='/'?'/index.html':path));if(!file.startsWith(root+sep)||!types[extname(file)])throw Error();res.setHeader('Content-Type',types[extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),report=[];
try{for(const mode of process.argv.includes('--source')?['source']:process.argv.includes('--built')?['pages']:['source','standalone']){
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),p1=await context.newPage(),errors=[];
 context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));p1.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(()=>{if(globalThis.FileSystemHandle)FileSystemHandle.prototype.queryPermission=async()=> 'granted';window.showDirectoryPicker=async()=> (await navigator.storage.getDirectory()).getDirectoryHandle('cross-tab-B');});
 await p1.goto(origin+'/seed');await seedBrowserFolder(p1,{name:'cross-tab-B',records:[b]});await seedBrowserFolder(p1,{name:'cross-tab-A',records:[a]});
 const url=origin+(mode==='standalone'?'/offline.html':mode==='pages'?'/built.html':'/');await p1.goto(url);await p1.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await p1.getByRole('button',{name:'添加 Cross tab A',exact:true}).click();
 await p1.waitForFunction(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')??'null')?.root.children.length===1);
 const projectData=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1'))),initial=await projectData(p1);assert.equal(initial.root.children[0].params[0],.12);
 const p2=await context.newPage();await p2.goto(url);await p2.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 // Exercise native file writes in a same-origin fixture tab, leaving the
 // application's strict CSP intact in standalone and Pages builds.
 const operations=await context.newPage();await operations.goto(origin+'/seed');
 await p1.locator('#open-graphics-library').click();const manager=p1.locator('.graphics-library-dialog');await manager.getByRole('searchbox').fill('Cross tab');await manager.locator('strong').getByText('Cross tab A',{exact:true}).waitFor();
 await p2.locator('#open-graphics-library').click();await p2.locator('.graphics-management>summary').click();await p2.getByRole('button',{name:'图库文件夹',exact:true}).click();await p2.locator('[data-folder-choose]').click();await p2.locator('[data-folder-connect]').click();
 await manager.locator('strong').getByText('Cross tab B',{exact:true}).waitFor();assert.equal(await manager.locator('strong').getByText('Cross tab A',{exact:true}).count(),0);assert.match(await manager.locator('.folder-save-destination').innerText(),/cross-tab-B/);
 await manager.locator('header .graphics-close').click();await p1.getByRole('button',{name:'添加 Cross tab B',exact:true}).waitFor();assert.equal(await p1.getByRole('button',{name:'添加 Cross tab A',exact:true}).count(),0);assert.deepEqual(await projectData(p1),initial);
 await p1.getByRole('button',{name:'添加 Cross tab B',exact:true}).click();await p1.waitForFunction(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')??'null')?.root.children.length===2);const afterInsert=await projectData(p1);assert.deepEqual(afterInsert.root.children.map(n=>n.params[0]),[.12,.42]);
 await p1.locator('#open-graphics-library').click();await manager.getByRole('searchbox').fill('Cross tab');
 await operations.evaluate(async({entry,bytes})=>{const library=await import('/modules/graphics-library.js'),binding=await(await import('/modules/folder-library.js')).folderLibrary.binding();await library.saveLibraryEntry(entry,new Uint8Array(bytes),{expectedDestination:binding.token});},{entry:extra.entry,bytes:[...extra.bytes]});
 await manager.locator('strong').getByText(extra.entry.name,{exact:true}).waitFor();await manager.locator('header .graphics-close').click();await p1.getByRole('button',{name:'添加 '+extra.entry.name,exact:true}).waitFor();
 await p1.locator('#open-graphics-library').click();const cleanup=await operations.evaluate(async id=>{const library=await import('/modules/graphics-library.js'),entry=(await library.libraryEntries()).find(e=>e.resourceId===id),binding=await(await import('/modules/folder-library.js')).folderLibrary.binding();return library.deleteLibraryEntry(id,{expectedLocal:{versionId:entry.versionId,hash:entry.hash},expectedDestination:binding.token});},extra.entry.resourceId);assert.equal(cleanup.complete,true);
 await p1.waitForFunction(name=>![...document.querySelectorAll('.graphics-library-dialog .graphics-card strong')].some(e=>e.textContent===name),extra.entry.name);await manager.locator('header .graphics-close').click();assert.equal(await p1.getByRole('button',{name:'添加 '+extra.entry.name,exact:true}).count(),0);
 await p1.locator('#open-graphics-library').click();await p2.locator('[data-folder-disconnect]').click();await p1.waitForFunction(()=>document.querySelector('.graphics-library-dialog .folder-save-destination')?.textContent.includes('尚未绑定'));await manager.locator('strong').getByText('Cross tab B',{exact:true}).waitFor({state:'hidden'});
 await manager.locator('header .graphics-close').click();assert.equal(await p1.getByRole('button',{name:'添加 Cross tab B',exact:true}).count(),0);assert.deepEqual(await projectData(p1),afterInsert);assert.deepEqual(errors,[]);
 report.push({mode,checks:'cross-tab folder switch/save/delete/disconnect updates open manager and sidebar; saving destination follows binding; same-ID materialized cache reads new folder bytes; existing canvas instances unchanged'});await context.close();console.log('Passed '+mode+' cross-tab library');
}}finally{await browser.close();await new Promise(ok=>server.close(ok));}await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');
