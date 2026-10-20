// Check the visible smoke volume through the real generator and tree pipelines.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.argv[2]??'http://127.0.0.1:8799/';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto(new URL('authoring-render.html',url).href);
 const result=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node}=await import('./tree-model.js'),{BY_ID}=await import('./catalog.js'),{encodePNG}=await import('./encoders.js');
  const renderer=new TreeRenderer(document.createElement('canvas')),p=project(),size=192;
  p.root.children=[node('shape','TurbulentFlame')];const n=p.root.children[0],type=BY_ID.get(n.type);
  const render=changes=>{n.params=[...type.defaults];for(const [key,value]of Object.entries(changes))n.params[type.parameters.find(s=>s.variable===key).slot]=value;const data=renderer.draw(p,size,size,{read:true,quality:1});if(renderer.gl.getError()||!data.every(Number.isFinite))throw Error('Invalid smoke render');return data;};
  const difference=(a,b)=>{let total=0;for(let i=0;i<a.length;i+=4){total+=Math.abs(a[i+3]-b[i+3]);for(let c=0;c<3;c++)total+=Math.abs(a[i+c]*a[i+3]-b[i+c]*b[i+3]);}return total/a.length;};
  const smokeStats=(data,off)=>{let mass=0,y=0,spread=0;for(let i=0;i<data.length;i+=4){const weight=Math.max(0,data[i+3]-off[i+3]),x=(i/4)%size-.5*size,row=Math.floor(i/4/size);mass+=weight;y+=row*weight;spread+=x*x*weight;}return {mass,y:y/Math.max(mass,.00001),spread:Math.sqrt(spread/Math.max(mass,.00001))};};
  try{
   const off=render({smokeMix:0}),base=render({}),densityOff=render({smokeDensity:0}),low=render({smokeRise:0}),high=render({smokeRise:1}),narrow=render({smokeSpread:0}),wide=render({smokeSpread:1});
   const changes={};for(const spec of type.parameters.filter(s=>s.variable.startsWith('smoke')||s.variable==='fogBase'))changes[spec.variable]=difference(render({[spec.variable]:spec.min}),render({[spec.variable]:spec.max}));
   // Preserve bright flame pixels when only the smoke behind them is changed.
   let coreDifference=0,corePixels=0;for(let i=0;i<off.length;i+=4)if(off[i+3]>.999&&off[i]>.5){corePixels++;for(let c=0;c<4;c++)coreDifference=Math.max(coreDifference,Math.abs(off[i+c]-base[i+c]));}
   const images={};for(const [name,data]of Object.entries({off,default:base,low,high,narrow,wide})){const bytes=await encodePNG(data,size,size);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));images[name]=btoa(binary);}
   return {changes,base:smokeStats(base,off),low:smokeStats(low,off),high:smokeStats(high,off),narrow:smokeStats(narrow,off),wide:smokeStats(wide,off),disabledDifference:difference(off,densityOff),coreDifference,corePixels,images};
  }finally{renderer.destroy();}
 });
 const {images,...report}=result;await mkdir('test-results/fire-smoke',{recursive:true});
 for(const [name,data]of Object.entries(images))await writeFile('test-results/fire-smoke/'+name+'.png',Buffer.from(data,'base64'));
 await writeFile('test-results/fire-smoke/report.json',JSON.stringify(report,null,2));console.log(report);
 for(const [key,value]of Object.entries(report.changes))assert.ok(value>.005,key+' should visibly affect the image');
 assert.equal(report.disabledDifference,0,'Zero density and zero mix both disable smoke');
 assert.ok(report.base.mass>100,'Default smoke should add visible opacity');
 assert.ok(report.low.mass>1,'Rise changes smoke height, without switching smoke off');
 assert.ok(report.high.y<report.low.y-10,'Higher rise moves smoke upwards');
 assert.ok(report.wide.spread>report.narrow.spread*1.4,'Spread widens the smoke volume');
 assert.ok(report.corePixels>100);assert.ok(report.coreDifference<.002,'Smoke must remain behind the opaque flame');
}finally{await browser.close();}
