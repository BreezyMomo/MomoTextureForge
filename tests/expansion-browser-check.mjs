import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 await mkdir('test-results/expansion',{recursive:true});
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8799/authoring-render.html');
 const report=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node,sanitizeTree}=await import('./tree-model.js'),{BY_ID}=await import('./catalog.js'),{assetFromGeneratorAuthoring,EMPTY_GENERATOR}=await import('./generator-authoring.js'),{registerAsset,unregisterAsset}=await import('./resource-assets.js');
  const r=new TreeRenderer(document.createElement('canvas')),diff=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
  const draw=(p,t=0,size=96)=>{const a=r.draw(p,size,size,{read:true,quality:1,formulaSeconds:t,time:t/3});if(!a.every(Number.isFinite)||r.gl.getError())throw Error('Invalid GPU output');return a;};
  const d=structuredClone(EMPTY_GENERATOR);d.passes[0].source='vec4 generate(vec2 uv){return vec4(.5+.5*sin(time+uv.x*6.),.2,.8,1.);}';const id='asset_expansion_clock';
  try{registerAsset(id,assetFromGeneratorAuthoring(d));const p=project();p.root.children=[node('shape',id)];if(!BY_ID.get(id).usesTime)throw Error('Missing time detection');const a=draw(p),b=draw(p,1);if(diff(a,b)<.01)throw Error('Time input failed');p.root.children[0].shapeClock={follow:false,value:.4};if(diff(draw(p),draw(p,2))!==0)throw Error('Frozen clock failed');p.root.children=[node('shape','Circle')];draw(p);const count=r.base.generators.drawCount;draw(p,2);if(count!==r.base.generators.drawCount)throw Error('Static generator cache missed');return {timeDifference:diff(a,b),frozen:true,staticCache:true};}finally{r.destroy();unregisterAsset(id);}
 });
 report.filters=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node,sanitizeTree}=await import('./tree-model.js'),{fxDefaults}=await import('./post-fx.js');const r=new TreeRenderer(document.createElement('canvas')),p=project();p.root.children=[node('shape','WaterCaustics')];const n=p.root.children[0],draw=()=>r.draw(p,96,96,{read:true,quality:1,formulaSeconds:.6}),diff=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
  try{const base=draw(),changes=[];for(const [slot,value]of [[0,12],[1,1],[4,2],[5,8],[6,4]]){n.postFx=fxDefaults();n.postFx[slot]=value;const a=draw();if(!a.every(Number.isFinite)||r.gl.getError())throw Error('Filter GPU failed');const delta=diff(base,a);if(delta<.00001)throw Error('Inactive filter '+slot);changes.push([slot,delta]);}
   n.postFx=[4,1,16,.4,1,3,5];n.mask=node('shape','Circle');const a=draw(),b=r.draw(sanitizeTree(JSON.parse(JSON.stringify(p))),96,96,{read:true,quality:1,formulaSeconds:.6});if(diff(a,b)>.00001)throw Error('Filter roundtrip changed');const stream=r.draw(p,96,96,{read:true,stream:true,quality:1,formulaSeconds:.6});if(diff(a,stream)>.00001)throw Error('Streaming export changed');return {changes,roundtrip:true,stream:true};}finally{r.destroy();}
 });
 report.material=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node,sanitizeTree}=await import('./tree-model.js'),{createMaterialPreview}=await import('./material-preview.js');
  const p=project();p.root.children=[node('shape','WaterCaustics')];p.output.mode='normal';const r=new TreeRenderer(document.createElement('canvas')),draw=()=>r.draw(p,96,96,{read:true,quality:1,formulaSeconds:.6}),diff=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
  try{const a=draw(),changes=[];for(const [key,value]of [['normalAlgorithm','scharr'],['normalFlipX',true],['normalFlipY',true],['normalInvert',true],['normalSmooth',2]]){const old=p.output[key];p.output[key]=value;const b=draw();if(!b.every(Number.isFinite)||diff(a,b)<1e-5)throw Error('Normal setting failed '+key);if(sanitizeTree(p).output[key]!==value)throw Error('Normal setting lost');changes.push(key);p.output[key]=old;}const host=document.createElement('div');host.id='test-material';host.style.cssText='width:800px;height:560px';document.body.append(host);const preview=createMaterialPreview(host);preview.update(p,{formulaSeconds:.6});return {normalSettings:changes};}finally{r.destroy();}
 });
 await page.locator('#test-material').screenshot({path:'test-results/material-preview.png'});
 for(const value of ['0','1','2'])await page.getByRole('combobox',{name:'预览模型'}).selectOption(value);
 await page.locator('#test-material').evaluate(host=>host.remove());
 report.effects=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node}=await import('./tree-model.js'),{CATALOG}=await import('./catalog.js'),{builtinAsset,registerAsset,unregisterAsset}=await import('./resource-assets.js'),{encodePNG}=await import('./encoders.js');
  const r=new TreeRenderer(document.createElement('canvas')),results=[],draw=(p,t=0,size=96)=>{const a=r.draw(p,size,size,{read:true,quality:1,formulaSeconds:t});if(!a.every(Number.isFinite)||r.gl.getError())throw Error('Invalid GPU output');return a;},diff=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
  try{for(const type of CATALOG.filter(t=>t.definition.generator&&t.usesTime&&t.definition.generator.effect==='pipeline')){
   const p=project();p.root.children=[node('shape',type.id)];const n=p.root.children[0],a=draw(p,.6),b=draw(p,1.3);if(diff(a,b)<.0001)throw Error(type.id+' is static');if(!a.some((v,i)=>i%4===3&&v>.05))throw Error(type.id+' is empty');
   const sensitivity=[];for(const spec of type.parameters){n.params=[...type.defaults];n.params[spec.slot]=spec.min;const lo=draw(p,.6,48);n.params[spec.slot]=spec.max;const hi=draw(p,.6,48);const delta=diff(lo,hi);sensitivity.push([spec.variable,delta]);if(delta<1e-6)throw Error(type.id+' inactive parameter '+spec.variable);}n.params=[...type.defaults];
   const id='asset_expansion_import';let imported;try{registerAsset(id,builtinAsset(type.id));const copy=project();copy.root.children=[node('shape',id)];imported=diff(a,draw(copy,.6));}finally{unregisterAsset(id);}if(imported>.0001)throw Error(type.id+' resource changed');
   const image=draw(p,.6,256),png=await encodePNG(image,256,256),thumb=await encodePNG(draw(p,.6),96,96);const encode=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};results.push({id:type.id,timeDifference:diff(a,b),sensitivity,png:encode(png),thumb:encode(thumb)});
  }}finally{r.destroy();}return results;
 });
 assert.ok(report.timeDifference>.01);await mkdir('test-results/expansion',{recursive:true});
 for(const item of report.effects){await writeFile('test-results/expansion/'+item.id+'.png',Buffer.from(item.png,'base64'));delete item.png;}
 await writeFile('test-results/expansion/report.json',JSON.stringify(report,null,2));console.log({...report,effects:report.effects.map(({thumb,...item})=>item)});
}finally{await browser.close();}
