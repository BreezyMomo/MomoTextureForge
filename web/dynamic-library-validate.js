import {CATALOG} from './catalog.js';
import {TreeRenderer} from './tree-renderer.js';
import {project,node} from './tree-model.js';
const result=document.getElementById('result'),gallery=document.getElementById('gallery');
const diff=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
document.getElementById('run').onclick=async()=>{
 const renderer=new TreeRenderer(document.createElement('canvas')),report=[];gallery.replaceChildren();
 try{for(const def of CATALOG.filter(d=>d.usesTime)){
  const p=project(),n=node('shape',def.id);p.root.children=[n];
  const draw=(seconds,size=64)=>{const a=renderer.draw(p,size,size,{time:0,formulaSeconds:seconds,read:true,quality:1});if(!a.every(Number.isFinite))throw Error(def.id+' non-finite');return a;};
  const turnDelta=null;
  const first=draw(0),times=[.37,1.13,3.17,30.23,600.31,3600.47],deltas=times.map(t=>diff(first,draw(t))),short=diff(draw(.43),draw(.43+1/30));
  let bounds=0;for(const spec of def.parameters){const old=n.params[spec.slot];for(const v of [spec.min,spec.max]){n.params[spec.slot]=v;draw(2.31,32);bounds++;}n.params[spec.slot]=old;}
  const speeds=def.parameters.filter(s=>/速度|流速/.test(s.label)&&s.min===0),zero=[];
  for(const spec of speeds){const old=n.params[spec.slot];n.params[spec.slot]=0;zero.push({label:spec.label,delta:diff(draw(.37),draw(12.31))});n.params[spec.slot]=old;}
  if(Math.max(...deltas)<.00001)throw Error(def.id+' default does not animate');
  if(['RibbonStreak','RibbonFilament','FlameRibbon','HazeRibbon','EmberRibbon','RibbonWave','RibbonSpark','VortexGate'].includes(def.id)){for(const z of zero)if(z.delta>.00001)throw Error(def.id+' zero speed still moves');}
  const row={id:def.id,name:def.zh,deltas,short,bounds,zero,turnDelta};report.push(row);
  const card=document.createElement('div');card.append(document.createTextNode(def.zh+' '+def.id));card.append(document.createElement('br'));
  for(const t of [0,1.13]){const a=draw(t,96),c=document.createElement('canvas');c.width=c.height=96;const ctx=c.getContext('2d'),im=ctx.createImageData(96,96);for(let i=0;i<a.length;i++)im.data[i]=Math.round(Math.max(0,Math.min(1,a[i]))*255);ctx.putImageData(im,0,0);card.append(c);}gallery.append(card);
  result.textContent='检查 '+report.length+' / '+CATALOG.filter(d=>d.usesTime).length;await new Promise(r=>setTimeout(r,0));
 }
 result.textContent=JSON.stringify({status:'PASS',count:report.length,bounds:report.reduce((s,r)=>s+r.bounds,0),report},null,2);
 }catch(e){result.textContent=JSON.stringify({status:'FAIL',error:e.stack,report},null,2);}finally{renderer.destroy();}
};
