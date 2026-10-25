import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {builtinAsset,registerAsset,unregisterAsset,contentHash} from '../web/resource-assets.js';
import {encodeResourcePack} from '../web/resource-pack.js';
import {decodeZIP} from '../web/resource-zip.js';
import {AUTHORING_EXAMPLE} from '../web/ai-authoring.js';
const out=resolve('test-results/project-tools');await mkdir(out,{recursive:true});
const p=project(),heart=node('shape','HeartLeafTeardrop');p.name='AI handoff heart';p.canvas.ratio=1.5;p.output.seconds=2;p.root.children=[heart];heart.id='handoff-heart';
Object.assign(heart.postEffects.sketch,{enabled:true,fillStyle:3,strokeWidth:1.8,fillColor:'#f42521',hatchGap:7.5,hatchWidth:.8,threshold:.71,simplify:.2});
heart.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,1],[1,.6]]};
const a=builtinAsset('Circle');a.definition.name='Custom auxiliary';a.definition.aliases={en:'Custom auxiliary','zh-CN':'自定义辅助纹理'};
const id='asset_'+await contentHash(a);registerAsset(id,a);const auxiliary=node('shape',id);auxiliary.id='auxiliary';auxiliary.transform.x=.2;auxiliary.transform.width=auxiliary.transform.height=.2;p.root.children.push(auxiliary);
const file=resolve(out,'authored-project.zip');try{await writeFile(file,await encodeResourcePack(p));}finally{unregisterAsset(id);}
const portable=await mkdtemp(resolve(out,'portable-'));for(const [name,bytes]of await decodeZIP(await readFile('dist/texture-forge-ai-skill.zip'))){const path=resolve(portable,name);await mkdir(resolve(path,'..'),{recursive:true});await writeFile(path,bytes);}
const cli=resolve(portable,'texture-forge-author/scripts/texforge.mjs');
const run=async(...args)=>{const result=await promisify(execFile)(process.execPath,[cli,'project',...args],{timeout:120000,maxBuffer:8*1024*1024,windowsHide:true});const report=JSON.parse(result.stdout);assert.equal(report.ok,true);return report;};
const authored=structuredClone(AUTHORING_EXAMPLE);authored.name='AI auxiliary ring mask';const authoredFile=resolve(out,'auxiliary.graphic.json');await writeFile(authoredFile,JSON.stringify(authored,null,2));const authoredRun=await promisify(execFile)(process.execPath,[cli,'render',authoredFile,'--size','64','--output',resolve(out,'ai-generated-texture.png')],{timeout:120000,maxBuffer:1024*1024,windowsHide:true});assert.equal(JSON.parse(authoredRun.stdout).ok,true);
await run('inspect',file,'--time','1','--output',resolve(out,'brief.json'));
const brief=JSON.parse(await readFile(resolve(out,'brief.json'),'utf8')),entry=brief.nodes.find(n=>n.id===heart.id);
assert.equal(entry.samples[0].progress,.5);assert.ok(Math.abs(entry.samples[0].opacity-.8)<1e-6);assert.ok(brief.resources.some(r=>r.definition.name==='Custom auxiliary'));assert.equal(entry.effects[0].id,'sketch');
const mask=resolve(out,'input-mask.png');const rendered=await run('render',file,'--node',heart.id,'--before-effect','sketch','--channel','alpha','--size','64','--time','1','--output',mask);assert.deepEqual([rendered.width,rendered.height],[64,43]);
await run('handoff',file,'--times','0,1,2','--size','64','--output',resolve(out,'handoff'));
assert.deepEqual(await readFile(resolve(out,'handoff/source-project.zip')),await readFile(file));
let retired=false;try{await run('shader',file,'--shader-mode','handdrawn','--node',heart.id,'--output',resolve(out,'retired.zip'));}catch(error){retired=true;assert.match(error.stderr??error.message,/retired|postprocess/);}assert.equal(retired,true);
// A data mask has real coverage in red and opaque alpha, including its black exterior.
const browser=await chromium.launch({headless:true});try{const page=await browser.newPage();const stats=await page.evaluate(async bytes=>{const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'})),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let max=0,min=255,alpha=255;for(let i=0;i<data.length;i+=4){max=Math.max(max,data[i]);min=Math.min(min,data[i]);alpha=Math.min(alpha,data[i+3]);if(data[i]!==data[i+1]||data[i]!==data[i+2])throw Error('Mask RGB must match');}return {max,min,alpha};},[...await readFile(mask)]);assert.ok(stats.max>100);assert.equal(stats.min,0);assert.equal(stats.alpha,255);}finally{await browser.close();}
let failed=false;try{await run('render',file,'--node','missing','--output',resolve(out,'missing.png'));}catch{failed=true;}assert.equal(failed,true);assert.equal(JSON.parse(await readFile(resolve(out,'missing.report.json'),'utf8')).ok,false);
console.log(JSON.stringify({pass:true,checks:['extracted portable Skill ZIP without source checkout','new auxiliary texture authored through CLI','embedded custom resource','node and time inspection','before-effect mask extraction','aspect preservation','original project retained','retired handdrawn exporter returns explicit migration','invalid node returns failure report'],output:out}));
