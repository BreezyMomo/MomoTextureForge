import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=resolve('web'),out=resolve('test-results/event-horizon');await mkdir(out,{recursive:true});
const flag=process.argv.indexOf('--reference'),reference=flag<0?null:Array.from(await readFile(process.argv[flag+1]));
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.json':'application/json','.glsl':'text/plain','.css':'text/css'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(180000);
 const url='http://127.0.0.1:'+server.address().port;await page.goto(url+'/authoring-render.html');
 const result=await page.evaluate(async reference=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{exampleProject}=await import('./project-examples.js'),{project,node,sanitizeTree}=await import('./tree-model.js'),{readResourcePack}=await import('./resource-pack.js'),{encodePNG}=await import('./encoders.js');
  const renderer=new TreeRenderer(document.createElement('canvas')),p=exampleProject('examples.eventHorizon.name'),images=[],rows=[];
  const render=(p,t,w=384,h=384)=>renderer.draw(p,w,h,{formulaSeconds:t,time:t/24,quality:1,read:true});
  const check=a=>{if(!a.every(Number.isFinite))throw Error('Nonfinite render');};
  const png=async(name,a,w,h)=>{const bytes=await encodePNG(a,w,h);let s='';for(const b of bytes)s+=String.fromCharCode(b);images.push({name,png:btoa(s)});};
  let pack,original;if(reference){pack=await readResourcePack(new Uint8Array(reference));pack.register();original=sanitizeTree(pack.payload);}
  try{
   for(const t of [0,1.37,8]){const actual=render(p,t);check(actual);await png('composition-'+t,actual,384,384);if(original){const before=render(original,t);check(before);await png('reference-'+t,before,384,384);let error=0;for(let i=0;i<actual.length;i+=4)for(let c=0;c<3;c++)error+=Math.abs(actual[i+c]-before[i+c]);const mae=255*error/(384*384*3);rows.push({t,mae});if(mae>8)throw Error('Composition changed too much: '+mae);}}
   for(const type of ['Circle','Checker','EventHorizonNebula']){
    const q=project(),n=node('shape',type);q.root.children=[n];q.output.alpha=true;n.postEffects.gravitationalLens.enabled=true;
    for(const [w,h]of [[160,96],[96,160]]){n.postEffects.gravitationalLens.lensingStrength=0;const bypass=render(q,0,w,h);n.postEffects.gravitationalLens.enabled=false;const plain=render(q,0,w,h);if(bypass.some((v,i)=>v!==plain[i]))throw Error('Zero lens must bypass exactly');n.postEffects.gravitationalLens.enabled=true;
     for(const strength of [.3,1])for(const size of [.1,2]){Object.assign(n.postEffects.gravitationalLens,{lensingStrength:strength,magnification:size,centerX:strength===1?0:.54,centerY:strength===1?1:.53});check(render(q,1.37,w,h));}}
   }
   for(const type of ['EventHorizonNebula','EventHorizonBlackHole']){const q=project();q.root.children=[node('shape',type)];q.output.alpha=true;const a=render(q,0);check(a);await png(type,a,384,384);}
   return {rows,images,project:p};
  }finally{renderer.destroy();pack?.rollback();}
 },reference);
 for(const {name,png}of result.images)await writeFile(resolve(out,name+'.png'),Buffer.from(png,'base64'));
 await writeFile(resolve(out,'report.json'),JSON.stringify(result.rows,null,2));
 await page.goto(url+'/#tree='+Buffer.from(JSON.stringify(result.project)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.screenshot({path:resolve(out,'editor.png')});
 for(const [name,key]of [['星云烟雾与恒星','nebula'],['黑洞与吸积盘','black-hole']]){await page.locator('#shape-search').fill(name);const card=page.locator('.tree-pattern-card').filter({hasText:name});await card.waitFor();await card.locator('img').evaluate(i=>i.decode());await card.screenshot({path:resolve(out,key+'-card.png')});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,rows:result.rows,output:out}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
