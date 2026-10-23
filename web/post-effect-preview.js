import {TreeRenderer} from './tree-renderer.js';
import {node,pathSet} from './tree-model.js';
import {applyPostFx} from './post-fx.js';
import {EFFECT_BY_ID} from './post-effect-specs.js';
import {drawEffectSpecimen,effectPreviewSpec,EFFECT_PREVIEW_SIZE} from './post-effect-specimens.js';
import {messageError} from './message-catalog.js';
// One isolated renderer/context per picker; no assets are registered in the user's library.
export function createPostEffectPreview(document){
 const renderer=new TreeRenderer(document.createElement('canvas')),gl=renderer.gl,[width,height]=EFFECT_PREVIEW_SIZE;
 renderer.quality=1;
 function pair(id,seconds=null){
  const demo=effectPreviewSpec(id),art=drawEffectSpecimen(document,demo.art,seconds),before=art.getContext('2d').getImageData(0,0,width,height),spec=EFFECT_BY_ID.get(id);
  if(!spec)return {before,after:before};
  const n=node('group');n.effectPresence={[id]:true};n.postEffects[id].enabled=true;
  const values={...demo.values};
  if(seconds!==null){const phase=((seconds%3)+3)%3/3;
   if(id==='dissolve')values.progress=.1+.78*(1-Math.cos(phase*Math.PI*2))*.5;
   if(id==='shockwave')values.progress=phase;
  }
  for(const param of spec.parameters)if(values[param.key]!==undefined)pathSet(n,param.path,values[param.key]);
  renderer.formulaSeconds=seconds??.85;
  const source=renderer.target(width,height),rgba=renderer.float?new Float32Array(width*height*4):new Uint8Array(width*height*4),heights=renderer.float?new Float32Array(width*height):new Uint8Array(width*height);
  try{
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const at=(y*width+x)*4,to=((height-y-1)*width+x)*4,a=before.data[at+3]/255,scale=renderer.float?1/255:1;
    for(let k=0;k<3;k++)rgba[to+k]=before.data[at+k]*a*scale;rgba[to+3]=before.data[at+3]*scale;
    heights[to/4]=(.2126*before.data[at]+.7152*before.data[at+1]+.0722*before.data[at+2])*a*scale;
   }
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
   gl.bindTexture(gl.TEXTURE_2D,source.textures[0]);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RGBA,renderer.float?gl.FLOAT:gl.UNSIGNED_BYTE,rgba);
   gl.bindTexture(gl.TEXTURE_2D,source.textures[1]);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RED,renderer.float?gl.FLOAT:gl.UNSIGNED_BYTE,heights);
   const out=applyPostFx(renderer,source,n),raw=renderer.float?new Float32Array(width*height*4):new Uint8Array(width*height*4),result=new Uint8ClampedArray(raw.length);
   gl.bindFramebuffer(gl.FRAMEBUFFER,out.fb);gl.readBuffer(gl.COLOR_ATTACHMENT0);gl.readPixels(0,0,width,height,gl.RGBA,renderer.float?gl.FLOAT:gl.UNSIGNED_BYTE,raw);
   if(gl.getError())throw messageError('fx.previewRenderFailed');
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const at=(y*width+x)*4,to=((height-y-1)*width+x)*4,a=raw[at+3]/(renderer.float?1:255);
    for(let k=0;k<3;k++)result[to+k]=a>0?raw[at+k]*(renderer.float?255:1)/a:0;result[to+3]=a*255;
   }
   return {before,after:new ImageData(result,width,height)};
  }finally{for(const target of [...renderer.live])renderer.release(target);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
 }
 return {pair,draw:id=>pair(id).after,destroy(){renderer.destroy();gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
