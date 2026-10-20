// GPU integration checks: generation passes, native color, masks and imported assets.
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.argv[2]??'http://127.0.0.1:8799/';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto(new URL('authoring-render.html',url).href);
 const result=await page.evaluate(async()=>{
  const {BUILTIN}=await import('./definition-runtime.js'),{TreeRenderer}=await import('./tree-renderer.js'),{project,node,sanitizeTree}=await import('./tree-model.js'),{encodePNG}=await import('./encoders.js');
  const {builtinAsset,registerAsset,unregisterAsset}=await import('./resource-assets.js');
  const types=BUILTIN.catalog.slice(284,291),renderer=new TreeRenderer(document.createElement('canvas')),reports=[],images={};
  const dataURL=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return 'data:image/png;base64,'+btoa(text);};
  const difference=(a,b)=>a.reduce((total,v,i)=>total+Math.abs(v-b[i]),0)/a.length;
  const render=(p,size=128,time=0)=>{const data=renderer.draw(p,size,size,{read:true,quality:1,time,formulaSeconds:time});if(renderer.gl.getError()||!data.every(Number.isFinite))throw Error('WebGL error or non-finite pixels');return data;};
  try{
   for(const type of types){
    const p=project();p.root.children=[node('shape',type.id)];const n=p.root.children[0];
    const base=render(p),draws=renderer.base.generators.drawCount;render(p);if(renderer.base.generators.drawCount!==draws)throw Error(type.id+': uncached static generation');
    const timeDifference=difference(base,render(p,128,1.3));if(timeDifference<.00001)throw Error(type.id+': missing time motion');const speed=type.parameters.find(s=>s.variable==='motionSpeed');n.params[speed.slot]=0;const stopped=render(p),passes=renderer.base.generators.drawCount;if(difference(stopped,render(p,128,2))!==0||passes!==renderer.base.generators.drawCount)throw Error(type.id+': stopped generator changed or missed cache');n.params=[...type.defaults];n.shapeClock={follow:false,value:.6};if(difference(render(p),render(p,128,2))!==0)throw Error(type.id+': freeze failed');n.shapeClock={follow:true,speed:1,offset:0,value:0};
    const alpha=base.filter((_,i)=>i%4===3),visible=alpha.reduce((n,a)=>n+(a>.01),0);if(visible===0)throw Error(type.id+': empty default result');
    const seed=type.parameters.find(s=>s.variable==='seed');n.params[seed.slot]+=137;const seedDifference=difference(base,render(p));n.params=[...type.defaults];
    let extendedDifference=null;const extended=type.parameters.find(p=>p.slot>=16&&p.variable!=='seed');if(extended){n.params[extended.slot]=extended.max;extendedDifference=difference(base,render(p));n.params=[...type.defaults];}
    let colors=0;for(let i=0;i<base.length;i+=4)if(Math.abs(base[i]-base[i+1])+Math.abs(base[i+1]-base[i+2])>.03&&base[i+3]>.01)colors++;
    n.color={mode:'own',fill:'solid',low:'#ffffff',high:'#ffffff'};const recolored=render(p);let alphaDifference=0;for(let i=3;i<base.length;i+=4)alphaDifference=Math.max(alphaDifference,Math.abs(base[i]-recolored[i]));n.color={mode:'inherit',fill:'gradient',low:'#000000',high:'#ffffff'};
    const imported='asset_generator_check_'+type.id;let importDifference;
    try{registerAsset(imported,builtinAsset(type.id));const copy=project();copy.root.children=[node('shape',imported)];importDifference=difference(base,render(copy));}finally{unregisterAsset(imported);}
    n.mask=node('shape','Circle');n.mask.params[0]=.3;const masked=render(p);let maskedSum=0,baseSum=0;for(let i=3;i<base.length;i+=4){maskedSum+=masked[i];baseSum+=base[i];}n.mask=null;
    const saved=sanitizeTree(JSON.parse(JSON.stringify(p)));if(saved.root.children[0].params.length!==n.params.length)throw Error('Extended parameters were lost');
    for(const spec of type.parameters)for(const value of [spec.min,spec.max]){n.params=[...type.defaults];n.params[spec.slot]=value;render(p,32);}n.params=[...type.defaults];
    images[type.id]={};for(const size of [96,384])images[type.id][size]=dataURL(await encodePNG(render(p,size),size,size));
    reports.push({id:type.id,timeDifference,parameters:type.parameters.length,visible,colors,seedDifference,extendedDifference,importDifference,alphaDifference,maskRatio:maskedSum/Math.max(baseSum,1),passes:draws});
   }
   const p=project(),a=node('shape','PlumeSmoke'),b=node('shape','PlumeSmoke');b.params[0]+=17;a.transform.width=.5;b.transform.width=.5;a.transform.x=.25;b.transform.x=.75;p.root.children=[a,b];render(p);
  }finally{renderer.destroy();}
  return {reports,images};
 });
 for(const report of result.reports){assert.ok(report.seedDifference>.0001,JSON.stringify(report));assert.ok(report.importDifference<.1,JSON.stringify(report));assert.ok(report.maskRatio<.98,JSON.stringify(report));assert.ok(report.alphaDifference<=1,JSON.stringify(report));if(['TurbulentFlame','BallisticSparks','BranchedLightning'].includes(report.id))assert.ok(report.colors>0,JSON.stringify(report));}
 assert.equal(result.reports.length,7);await mkdir('test-results/vfx',{recursive:true});
 const {default:thumbnails}=await import('../web/builtin-thumbnails.js');
 for(const [id,images]of Object.entries(result.images)){thumbnails[id]=images[96];await writeFile('test-results/vfx/'+id+'.png',Buffer.from(images[384].split(',')[1],'base64'));}
 const source=await readFile('web/builtin-thumbnails.js','utf8');await writeFile('web/builtin-thumbnails.js',source.slice(0,source.indexOf('export default'))+'export default '+JSON.stringify(thumbnails)+';\n');
 await writeFile('test-results/vfx/report.json',JSON.stringify(result.reports,null,2));console.log(JSON.stringify(result.reports,null,2));
}finally{await browser.close();}
