import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {project,node} from '../web/tree-model.js';
const built=process.argv.includes('--built'),root=resolve('web'),server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname,file=path==='/built.html'?resolve('site/index.html'):resolve(root,'.'+(path==='/'?'/index.html':path));if(path!=='/built.html'&&!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',error=>errors.push(error.message));const origin='http://127.0.0.1:'+server.address().port;await page.goto(origin+'/authoring-render.html'+(process.argv.includes('--preview')?'?preview=1':''));
 const report=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node,sanitizeTree,cloneNode}=await import('./tree-model.js');
  const r=new TreeRenderer(document.createElement('canvas')),p=project(),n=node('shape','Ring');p.root.children=[n];n.postEffects.sketch.enabled=true;
  const diff=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(i%4===3?v-b[i]:v*a[i-i%4+3]-b[i]*b[i-i%4+3]),0)/a.length,check=(ok,message)=>{if(!ok)throw Error(message);};
  const draw=(size=256,stream=false,target=p)=>{const a=r.draw(target,size,size,{read:true,quality:1,stream});check(a.every(Number.isFinite),'Non-finite hand-drawn output');return a;},center=(a,size=256)=>a[(Math.floor(size/2)*size+Math.floor(size/2))*4+3];
  try{
   const baseline=draw();r.clearCache();check(diff(baseline,draw())===0,'Fixed seed changed on rebuild');n.postEffects.sketch.seed=2;const seedDifference=diff(baseline,draw());check(seedDifference>.0001,'Seed has no effect');n.postEffects.sketch.seed=1;
   const fills=[];for(const fillStyle of [0,1,2,3,4]){n.postEffects.sketch.fillStyle=fillStyle;const a=draw();check(center(a)===0,'Fill covered ring hole '+fillStyle);fills.push(a);}
   check(diff(fills[1],fills[2])>.01&&diff(fills[2],fills[3])>.001,'Hatch styles are indistinguishable');
   n.postEffects.sketch.fillStyle=2;n.postEffects.sketch.doubleStroke=false;const single=draw();n.postEffects.sketch.doubleStroke=true;check(diff(single,draw())>.0001,'Double stroke has no effect');
   n.postEffects.sketch.fillStyle=4;n.postEffects.sketch.strokeWidth=0;check(draw().every(v=>v===0),'No fill and zero stroke should be empty');n.postEffects.sketch.strokeWidth=1.8;n.postEffects.sketch.fillStyle=2;
   const normal=draw(),stream=draw(256,true);check(diff(normal,stream)<2e-5,'Streaming result changed');const copy=project();copy.root.children=[cloneNode(sanitizeTree(p).root.children[0])];check(diff(normal,draw(256,false,copy))<1e-6,'Component lost hand-drawn appearance');
   const small=draw(128),large=draw(256),down=new Float32Array(small.length);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const at=(y*128+x)*4;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const q=((y*2+dy)*256+x*2+dx)*4;down[at+3]+=large[q+3]/4;for(let k=0;k<3;k++)down[at+k]+=large[q+k]*large[q+3]/4;}if(down[at+3])for(let k=0;k<3;k++)down[at+k]/=down[at+3];}const resolutionDifference=diff(small,down);check(resolutionDifference<.035,'Resolution changed style '+resolutionDifference);
   // Exported render swatches, not UI screenshots. Generate only on explicit test flag.
   let preview=null;if(new URL(location.href).searchParams.has('preview')){
    const canvas=document.createElement('canvas');canvas.width=1120;canvas.height=510;const ctx=canvas.getContext('2d');ctx.fillStyle='#f5f1e8';ctx.fillRect(0,0,1120,510);ctx.fillStyle='#202020';ctx.font='20px system-ui';ctx.fillText('Hand-drawn node post-processing',24,30);const titles=['Original','Solid','Hachure','Cross-hatch'];ctx.font='15px system-ui';
    for(let col=0;col<4;col++){ctx.fillText(titles[col],24+col*280,62);for(let row=0;row<2;row++){const demo=project(),shape=node('shape',row?'Ring':'Star');demo.root.children=[shape];shape.color={mode:'own',fill:'solid',low:'#edb85e',high:'#edb85e'};if(col){shape.postEffects.sketch.enabled=true;shape.postEffects.sketch.fillStyle=col;}const a=draw(220,false,demo),tile=document.createElement('canvas');tile.width=tile.height=220;const image=tile.getContext('2d').createImageData(220,220);for(let i=0;i<a.length;i++)image.data[i]=Math.round(Math.max(0,Math.min(1,a[i]))*255);tile.getContext('2d').putImageData(image,0,0);ctx.drawImage(tile,24+col*280,74+row*214);}}
    preview=canvas.toDataURL('image/png').split(',')[1];
   }
   return {seedDifference,resolutionDifference,holes:true,fills:5,doubleStroke:true,components:true,stream:true,preview};
  }finally{r.destroy();}
 });
 const p=project();p.root.children=[node('shape','Star')];p.output.width=p.output.height=128;
 await page.goto(origin+(built?'/built.html':'/')+'#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('[role=treeitem]').first().click();await page.locator('#inspector-tabs').getByRole('button',{name:'合成',exact:true}).click();const module=page.locator('#inspector [data-module="modules.imageFilters"]');if(await module.getAttribute('open')===null)await module.locator(':scope>summary .inspector-module-title').click();
 const sketch=()=>page.locator('#inspector [data-effect=sketch]');await sketch().locator('[data-effect-enabled]').check();await sketch().getByRole('combobox',{name:'填充方式',exact:true}).selectOption('3');await sketch().getByRole('spinbutton',{name:'随机种子',exact:true}).fill('42');await sketch().getByRole('spinbutton',{name:'随机种子',exact:true}).press('Tab');
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')));assert.equal((await saved()).root.children[0].postEffects.sketch.seed,42);assert.equal((await saved()).root.children[0].postEffects.sketch.fillStyle,3);
 await page.locator('#language-settings').selectOption('en');assert.ok(!/[\u3400-\u9fff]/.test(await sketch().innerText()));assert.equal(await sketch().getByRole('combobox',{name:'Fill style',exact:true}).inputValue(),'3');assert.deepEqual(errors,[]);
 await mkdir('test-results/sketch',{recursive:true});if(report.preview)await writeFile('test-results/sketch/preview.png',Buffer.from(report.preview,'base64'));delete report.preview;await writeFile('test-results/sketch/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log({built,...report,ui:true});
}finally{await browser?.close();server.close();}
