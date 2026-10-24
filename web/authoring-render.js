import {TreeRenderer} from './tree-renderer.js';
import './project-render.js';
import {node,project} from './tree-model.js';
import {assetFromCreationAuthoring} from './creation-authoring.js';
import {registerAsset,unregisterAsset} from './resource-assets.js';
window.renderAuthoring=({draft,size,times})=>{
 const canvas=document.createElement('canvas'),renderer=new TreeRenderer(canvas),id='asset_cli_preview';
 try{
  registerAsset(id,assetFromCreationAuthoring(draft));const p=project();p.root.children=[node('shape',id)];
  const sheet=document.createElement('canvas'),columns=Math.min(4,times.length);sheet.width=columns*size;sheet.height=Math.ceil(times.length/columns)*(size+24);const sheetCtx=sheet.getContext('2d');
  const frames=times.map((time,index)=>{
   const pixels=renderer.draw(p,size,size,{formulaSeconds:time,read:true});
   // TreeRenderer returns top-down normalized straight RGBA.
   const image=document.createElement('canvas');image.width=image.height=size;const ctx=image.getContext('2d'),data=ctx.createImageData(size,size);
   for(let i=0;i<pixels.length;i++)data.data[i]=Math.round(Math.min(1,Math.max(0,pixels[i]))*255);
   ctx.putImageData(data,0,0);const x=index%columns*size,y=Math.floor(index/columns)*(size+24);sheetCtx.fillStyle='#252830';sheetCtx.fillRect(x,y,size,size+24);sheetCtx.drawImage(image,x,y);sheetCtx.fillStyle='white';sheetCtx.font='14px sans-serif';sheetCtx.fillText(time+' s',x+8,y+size+17);return {time,png:image.toDataURL('image/png')};
  });return {ok:true,frames,sheet:sheet.toDataURL('image/png')};
 }catch(e){return {ok:false,error:e.message};}finally{renderer.destroy();unregisterAsset(id);}
};
