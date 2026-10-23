import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {project,node} from '../web/tree-model.js';
const built=process.argv.includes('--built'),root=resolve('web');
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname,file=path==='/built.html'?resolve('site/index.html'):resolve(root,'.'+(path==='/'?'/index.html':path));if(path!=='/built.html'&&!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/authoring-render.html');
 const report=built||process.argv.includes('--ui-only')?{}:await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node,cloneNode,sanitizeTree}=await import('./tree-model.js'),{CREATIVE_EFFECTS}=await import('./creative-effect-specs.js'),{creativeEffectSamples}=await import('./creative-effect-samples.js');
  const r=new TreeRenderer(document.createElement('canvas')),check=(ok,message)=>{if(!ok)throw Error(message);};
  const difference=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length;
  const make=()=>{const p=project(),n=node('shape','WaterCaustics');p.root.children=[n];n.shapeClock.follow=false;n.color={mode:'own',fill:'gradient',low:'#2341ad',high:'#ffc47a'};return p;};
  const draw=(p,seconds=0,size=96)=>{const a=r.draw(p,size,size,{read:true,quality:1,time:.25,formulaSeconds:seconds});check(a.every(Number.isFinite),'Non-finite output');check(!r.gl.getError(),'WebGL error');return a;};
  let modes=0;const temporal=[],bypasses=[],alpha=[],heights=[];
  try{
   for(const spec of CREATIVE_EFFECTS){const p=make(),n=p.root.children[0],original=draw(p);Object.assign(n.postEffects[spec.id],{enabled:true,mix:0});check(difference(original,draw(p))<1e-6,'Zero mix '+spec.id);bypasses.push(spec.id);n.postEffects[spec.id].mix=1;
    for(const param of spec.parameters.filter(p=>p.options))for(let mode=0;mode<param.options.length;mode++){n.postEffects[spec.id][param.key]=mode;draw(p);modes++;}Object.assign(n.postEffects[spec.id],Object.fromEntries(spec.parameters.map(p=>[p.key,p.default])));
    const first=draw(p);r.clearCache();check(difference(first,draw(p))<1e-6,'Not reproducible '+spec.id);
    if(['glitch','crt'].includes(spec.id)){const second=draw(p,.41);check(difference(first,second)>1e-5,'Time cache stale '+spec.id);n.postEffects[spec.id].rate=0;const frozen=draw(p,0);check(difference(frozen,draw(p,.41))<1e-6,'Zero rate '+spec.id);temporal.push(spec.id);}
   }
   for(const id of ['halftone','dither','kuwahara','bevel','xdog','ascii']){
    const p=project(),n=p.root.children[0];n.transform.width=n.transform.height=.5;n.postEffects[id].enabled=true;const a=draw(p);check(a[3]===0,'Filled transparent background '+id);alpha.push(id);
    if(id==='ascii')continue;p.output.mode='height';n.postEffects[id].enabled=false;const before=draw(p);n.postEffects[id].enabled=true;check(difference(before,draw(p))<1e-6,'Changed source height '+id);heights.push(id);
   }
   const flat=project(),n=flat.root.children[0];n.color={mode:'own',fill:'solid',low:'#888888',high:'#888888'};Object.assign(n.postEffects.dither,{enabled:true,levels:2,cellSize:8});
   const blackWhite=draw(flat,0,128),colors=new Set();for(let i=0;i<blackWhite.length;i+=4)if(blackWhite[i+3]>.9999){for(let k=0;k<3;k++)check(Math.min(Math.abs(blackWhite[i+k]),Math.abs(blackWhite[i+k]-1))<1e-5,'Dither invented palette color');colors.add(Math.round(blackWhite[i]));}check(colors.size===2,'Dithering lost one tone');
   const pencil=make();pencil.root.children[0].postEffects.xdog.enabled=true;const soft=draw(pencil);pencil.root.children[0].postEffects.xdog.lineThreshold=.2;check(difference(soft,draw(pencil))>.001,'Line threshold has no effect');
   const paper=project(),pn=paper.root.children[0];pn.color={mode:'own',fill:'solid',low:'#ffffff',high:'#ffffff'};pn.postEffects.xdog.enabled=true;pn.postEffects.xdog.paperColor='#ffffff';const white=draw(paper),middle=(48*96+48)*4;check(white[middle]>.99&&white[middle+1]>.99&&white[middle+2]>.99,'Flat white paper became ink');
   const painting=make();painting.root.children[0].postEffects.kuwahara.enabled=true;painting.root.children[0].postEffects.kuwahara.paintMode=0;const basic=draw(painting);painting.root.children[0].postEffects.kuwahara.paintMode=1;check(difference(basic,draw(painting))>1e-5,'Paint modes identical');
   const sorting=make(),s=sorting.root.children[0];s.postEffects.pixelSort.enabled=true;Object.assign(s.postEffects.pixelSort,{lowThreshold:0,highThreshold:1});const sorted=draw(sorting);s.postEffects.pixelSort.descending=true;check(difference(sorted,draw(sorting))>.001,'Descending sort has no effect');s.postEffects.pixelSort.highThreshold=0;s.postEffects.pixelSort.lowThreshold=1;s.postEffects.pixelSort.enabled=false;const plain=draw(sorting);s.postEffects.pixelSort.enabled=true;check(difference(plain,draw(sorting))<1e-6,'Reversed thresholds not bypassed');
   const examples=[];for(const example of creativeEffectSamples()){const p=project();p.root.children=[cloneNode(example.root)];Object.assign(p.output,example.output);const a=draw(p,0,192);check(a.some((v,i)=>i%4===3&&v>.1),'Empty example '+example.nameKey);const restored=draw(sanitizeTree(JSON.parse(JSON.stringify(p))),0,192);check(difference(a,restored)<1e-6,'Example serialization '+example.nameKey);examples.push(example.nameKey);}
   // Run in normalized 8-bit targets as well as the normal floating-point path.
   r.clearCache();r.float=false;for(const id of ['kuwahara','pixelSort','glitch','ascii']){const p=make();p.root.children[0].postEffects[id].enabled=true;draw(p);}r.clearCache();
   return {modes,bypasses,temporal,alpha,heights,examples,fallback8bit:true,palette:true};
  }finally{r.destroy();}
 });
 const p=project();p.root.children=[node('shape','WaterCaustics')];p.root.children[0].shapeClock.follow=false;p.root.children[0].color={mode:'own',fill:'gradient',low:'#273fbc',high:'#ffba74'};
 await page.goto(origin+(built?'/built.html':'/')+'#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await page.locator('[role=treeitem]').first().click();await page.locator('#inspector-tabs').getByRole('button',{name:'合成',exact:true}).click();const panel=page.locator('#inspector details[data-module="modules.imageFilters"]');await panel.locator(':scope>summary .inspector-module-title').click();
 const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1'))),effect=id=>panel.locator('[data-effect="'+id+'"]');
 // Read rendered pixels directly, without taking or saving a UI screenshot.
 const signature=arg=>{const c=document.querySelector('#tree-canvas'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=2166136261;for(let i=0;i<a.length;i+=17)hash=Math.imul(hash^a[i],16777619);return arg?(hash!==arg.baseline)===arg.changed:hash;};
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const baseline=await page.evaluate(signature),rendered=[];
 for(const id of ['halftone','dither','glitch','zoomBlur','kuwahara','bevel','xdog','crt','ascii','pixelSort']){const input=effect(id).locator('summary input[type=checkbox]');await input.check();assert.equal((await save()).root.children[0].postEffects[id].enabled,true);await page.waitForFunction(signature,{baseline,changed:true});rendered.push(id);await input.uncheck();await page.waitForFunction(signature,{baseline,changed:false});}
 await effect('dither').locator('summary input').check();await effect('dither').getByRole('combobox',{name:'限色方式',exact:true}).selectOption('2');assert.ok(await effect('dither').getByLabel('墨色',{exact:true}).count());assert.equal(await effect('dither').getByRole('spinbutton',{name:'颜色阶数',exact:true}).count(),0);
 await effect('dither').getByRole('combobox',{name:'限色方式',exact:true}).selectOption('0');assert.equal(await effect('dither').getByLabel('墨色',{exact:true}).count(),0);assert.equal(await effect('dither').getByRole('spinbutton',{name:'颜色阶数',exact:true}).count(),1);
 await effect('pixelSort').locator('.post-effect-grip').focus();await effect('pixelSort').locator('.post-effect-grip').press('ArrowUp');const order=(await save()).root.children[0].effectOrder;assert.equal(order.indexOf('pixelSort'),order.indexOf('ascii')-1);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.deepEqual((await save()).root.children[0].effectOrder,order);
 await page.locator('[role=treeitem]').first().click();await page.locator('#inspector-tabs').getByRole('button',{name:'合成',exact:true}).click();
 const beforeLanguage=await save();await page.locator('#language-settings').selectOption('en');assert.deepEqual(await save(),beforeLanguage);
 for(const section of await panel.locator('.post-effect').all()){const details=section.locator(':scope>details');if(await details.getAttribute('open')===null)await details.locator(':scope>summary .post-effect-title').click();}
 assert.ok(!/[\u3400-\u9fff]/.test(await panel.innerText()),'Creative parameters must translate');assert.ok(!/fx\.(param|effect|option|help)\./.test(await panel.innerText()),'No unresolved creative message keys');
 assert.deepEqual(errors,[]);await mkdir('test-results/creative-effects',{recursive:true});await writeFile('test-results/creative-effects/'+(built?'built':process.argv.includes('--ui-only')?'source-ui':'source')+'.json',JSON.stringify({...report,rendered,ui:true,english:true},null,2));console.log({built,...report,rendered,ui:true,english:true});
}finally{await browser?.close();server.close();}
