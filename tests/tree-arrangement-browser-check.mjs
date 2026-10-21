import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,cloneNode} from '../web/tree-model.js';
import {treeSamples} from '../web/tree-samples.js';

const root=resolve('web'),server=http.createServer(async(req,res)=>{
 try{const path=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))throw Error('Invalid path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;await page.goto(origin+'/authoring-render.html');
 const report=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{treeSamples}=await import('./tree-samples.js'),{project,cloneNode,sanitizeTree,expandInstances,evaluateNode,node}=await import('./tree-model.js');
  const renderer=new TreeRenderer(document.createElement('canvas')),results=[],diff=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length;
  const draw=(p,w,h,time=.3,stream=false)=>{const pixels=renderer.draw(p,w,h,{read:true,quality:2,time,stream});if(!pixels.every(Number.isFinite)||renderer.gl.getError())throw Error('Invalid GPU output');return pixels;};
  try{
   for(const sample of treeSamples().filter(s=>s.category==='arrangement'))for(const [w,h]of [[192,192],[256,128],[128,256]]){
    const raw=project();raw.root.children=[cloneNode(sample.root)];raw.canvas.ratio=w/h;Object.assign(raw.output,sample.output);const p=sanitizeTree(raw),n=p.root.children[0],a=draw(p,w,h);
    const roundtrip=diff(a,draw(sanitizeTree(JSON.parse(JSON.stringify(p))),w,h));if(roundtrip>1e-6)throw Error(sample.name+' roundtrip changed');
    const records=renderer.records(evaluateNode(n,.3).node,.3,{original:n,aspect:w/h});
    const stream=diff(a,draw(p,w,h,.3,true));if(stream>1e-5)throw Error(sample.name+' streaming changed '+stream);
    const expanded=structuredClone(p);expandInstances(expanded.root,n.id,.3,records);const delta=diff(a,draw(expanded,w,h));if(delta>.012)throw Error(sample.name+' expansion changed '+delta+' at '+w+'x'+h);
    results.push({name:sample.name,w,h,count:records.length,roundtrip,stream,expansion:delta});
   }
   // Lookup-table opacity must affect both rendered color and alpha.
   const p=project(),n=node();n.arrange[0]=1;n.arrange[1]=2;n.arrange[2]=1;Object.assign(n.arrangeExtra,{gradient:'index',opacityFrom:0,opacityTo:1});p.root.children=[n];const a=draw(p,128,128);let left=0,right=0;for(let y=0;y<128;y++)for(let x=0;x<128;x++){if(x<64)left+=a[(y*128+x)*4+3];else right+=a[(y*128+x)*4+3];}if(left>right*.001||right<10)throw Error('Per-instance opacity ignored');
   const contour=treeSamples().find(s=>s.name==='星形轮廓光点').root;p.root.children=[contour];draw(p,128,128);const lo=renderer.records(contour,.3);draw(p,512,512);const hi=renderer.records(contour,.3);if(JSON.stringify(lo)!==JSON.stringify(hi))throw Error('Contour layout depends on render resolution');
   return results;
  }finally{renderer.destroy();}
 });
 console.log(JSON.stringify({gpu:report}));
 const p=project();p.root.children=[cloneNode(treeSamples().find(s=>s.name==='圆角边框灯带').root)];
 await page.goto(origin+'/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.locator('[role=treeitem]').first().click();await page.getByRole('button',{name:'变换/排列',exact:true}).click();
 const modes=page.getByRole('combobox',{name:'排列方式',exact:true});for(const value of ['13','14','15','16'])assert.ok(await modes.locator('option[value="'+value+'"]').count());
 await page.getByRole('spinbutton',{name:'边框宽',exact:true}).fill('.73');await page.getByRole('spinbutton',{name:'边框宽',exact:true}).press('Tab');
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')).root.children[0]);assert.equal((await saved()).arrangeExtra.width,.73);
 await modes.selectOption('15');await page.getByRole('combobox',{name:'编排样式',exact:true}).selectOption('basket');assert.equal((await saved()).arrangeExtra.weave,'basket');
 await page.evaluate(()=>history.replaceState(null,'',location.pathname));await page.reload();await page.locator('[role=treeitem]').first().click();await page.getByRole('button',{name:'变换/排列',exact:true}).click();assert.equal(await page.getByRole('combobox',{name:'编排样式',exact:true}).inputValue(),'basket');
 await page.getByRole('combobox',{name:'排列方式',exact:true}).selectOption('16');await page.getByText('图块接口配置',{exact:true}).click();assert.ok(await page.getByRole('combobox',{name:/接口$/}).count()>=2);
 await page.goto(origin+'/examples.html');await page.waitForFunction(count=>document.querySelector('#status')?.textContent.includes(count+' 种'),treeSamples().length,{timeout:180000});await page.getByRole('combobox',{name:'示例分类',exact:true}).selectOption('arrangement');assert.equal(await page.locator('#samples article:visible').count(),7);
 assert.deepEqual(errors,[]);console.log({uiPersistence:true,sevenExamples:true,errors});
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
