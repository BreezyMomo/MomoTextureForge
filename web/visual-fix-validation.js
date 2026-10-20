import {TreeRenderer} from './tree-renderer.js';
import {node,project} from './tree-model.js';
import {BY_ID} from './catalog.js';
const result=document.querySelector('#result'), gallery=document.querySelector('#gallery');
document.querySelector('#run').disabled=false;
document.querySelector('#run').onclick=async()=>{
 const renderer=new TreeRenderer(document.createElement('canvas')), rows=[];
 gallery.replaceChildren();
 const render=(id,t,params={})=>{const p=project();const n=node('shape',id);Object.assign(n.params,params);p.root.children=[n];return renderer.draw(p,256,256,{time:0,formulaSeconds:t,read:true,quality:2});};
 const difference=(a,b)=>a.reduce((v,x,i)=>v+Math.abs(x-b[i]),0)/a.length;
 try{
 const ids=['ConveyorArrows','PerspectiveGrid','HammeredMetal','Shatter','FibonacciDot','Curl','Water','Fluid','Lightning','ArrowHead','RoundedPolygon','WebSigil'];
 for(const id of ids){
  const raw=render(id,0),finite=raw.every(Number.isFinite);let max=0;for(let i=0;i<raw.length;i+=4)max=Math.max(max,raw[i]*raw[i+3]);
  if(!finite||max<.05)throw Error(id+' invalid/blank');
  const row={id,finite,max};
  if(['ConveyorArrows','Water','Lightning'].includes(id)){
   row.motion=difference(raw,render(id,1.37));if(row.motion<.00001)throw Error(id+' no motion');
   const slot=id==='ConveyorArrows'?2:id==='Water'?1:4;row.stopped=difference(render(id,0,{[slot]:0}),render(id,1.37,{[slot]:0}));if(row.stopped>1e-7)throw Error(id+' speed zero moves');
  }
  rows.push(row);
  const fig=document.createElement('figure'),cap=document.createElement('figcaption'),canvas=document.createElement('canvas');cap.textContent=BY_ID.get(id).zh+' / '+id;canvas.width=canvas.height=256;canvas.getContext('2d').putImageData(new ImageData(Uint8ClampedArray.from(raw,x=>Math.round(Math.max(0,Math.min(1,x))*255)),256,256),0,0);fig.append(cap,canvas);gallery.append(fig);
  result.textContent='检查 '+rows.length+'/'+ids.length;await new Promise(r=>setTimeout(r,0));
 }
 for(const id of ['ConveyorArrows','PerspectiveGrid','Shatter']){
  for(const param of BY_ID.get(id).parameters)for(const value of [param.min,param.max]){
   const raw=render(id,.73,{[param.slot]:value});if(!raw.every(Number.isFinite))throw Error(id+' extreme invalid');
  }
 }
 result.textContent=JSON.stringify({status:'PASS',rows,extremes:'one parameter at a time'},null,2);
 }catch(e){result.textContent=JSON.stringify({status:'FAIL',error:e.stack,rows});}finally{renderer.destroy();}
};
