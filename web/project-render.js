import {readResourcePack} from './resource-pack.js';
import {sanitizeTree,find} from './tree-model.js';
import {TreeRenderer} from './tree-renderer.js';
import {createProjectBrief} from './project-brief.js';
import {effectOrder,effectPresent,EFFECT_BY_ID} from './post-effect-specs.js';
import {exportSketchShaderReference} from './shader-effect-export.js';
import {runProjectAuthoring} from './project-authoring-runtime.js';

const decode64=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const encode64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
window.runProjectTool=async({action,input,options})=>{
 let pack,renderer;
 try{
  let raw;if(input.zip){pack=await readResourcePack(decode64(input.zip));pack.register();raw=pack.payload;}else raw=input.project;
  const project=sanitizeTree(raw),selected=options.node?find(project.root,options.node)?.node:null;
  if(options.node&&!selected)throw Error('Unknown node: '+options.node);
  const brief=createProjectBrief(project,{times:options.times,nodeId:options.node});
  if(action==='inspect')return {ok:true,brief};
  if(action==='shader'){
   if(!selected)throw Error('project shader requires --node <node ID>');
   const reference=await exportSketchShaderReference({project,nodeId:selected.id,time:options.times[0]/project.output.seconds,formulaSeconds:options.times[0]});
   return {ok:true,manifest:reference.manifest,zip:encode64(reference.bytes)};
  }
  if(options.beforeEffect){
   if(!selected||!EFFECT_BY_ID.has(options.beforeEffect)||!effectPresent(selected,options.beforeEffect))throw Error('--before-effect requires an effect present on the specified node');
   const order=effectOrder(selected.effectOrder);
   for(const id of order.slice(order.indexOf(options.beforeEffect))){selected.postEffects[id].enabled=false;delete selected.tracks['postEffects.'+id+'.enabled'];}
  }
  project.output.mode=options.channel==='alpha'?'color':options.channel;project.output.alpha=true;
  const ratio=project.canvas.ratio,width=ratio>=1?options.size:Math.max(1,Math.round(options.size*ratio)),height=ratio>=1?Math.max(1,Math.round(options.size/ratio)):options.size;
  renderer=new TreeRenderer(document.createElement('canvas'));
  const sheet=document.createElement('canvas'),columns=Math.min(4,options.times.length);sheet.width=columns*width;sheet.height=Math.ceil(options.times.length/columns)*(height+24);const sheetCtx=sheet.getContext('2d');
  const frames=options.times.map((seconds,index)=>{
   const pixels=renderer.draw(project,width,height,{time:seconds/project.output.seconds,formulaSeconds:seconds,solo:options.node,read:true});
   const image=document.createElement('canvas');image.width=width;image.height=height;const ctx=image.getContext('2d'),data=ctx.createImageData(width,height);
   for(let i=0;i<pixels.length;i+=4)for(let c=0;c<4;c++)data.data[i+c]=Math.round(Math.max(0,Math.min(1,options.channel==='alpha'?(c===3?1:pixels[i+3]):pixels[i+c]))*255);
   ctx.putImageData(data,0,0);const x=index%columns*width,y=Math.floor(index/columns)*(height+24);sheetCtx.fillStyle='#252830';sheetCtx.fillRect(x,y,width,height+24);sheetCtx.drawImage(image,x,y);sheetCtx.fillStyle='white';sheetCtx.font='14px sans-serif';sheetCtx.fillText(seconds+' s',x+8,y+height+17);
   return {seconds,progress:seconds/project.output.seconds,png:image.toDataURL('image/png')};
  });
  brief.verification.editorRendering='passed';
  return {ok:true,width,height,frames,sheet:sheet.toDataURL('image/png'),brief};
 }catch(error){return {ok:false,error:error.message};}finally{renderer?.destroy();pack?.rollback();}
};
window.runProjectAuthoring=runProjectAuthoring;
