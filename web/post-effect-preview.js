import {TreeRenderer} from './tree-renderer.js';
import {node,project} from './tree-model.js';
import {effectValues,effectPresent,EFFECT_BY_ID} from './post-effect-specs.js';
// Every thumbnail uses the same frozen specimen, independent of the user's project.
// One renderer/context is owned by one picker and destroyed when it closes.
export function createPostEffectPreview(document,settings){
 const renderer=new TreeRenderer(document.createElement('canvas')),p=project();
 const make=(type,size,color)=>{const n=node('shape',type);n.shapeClock.follow=false;n.color={mode:'own',fill:'gradient',low:'#263f9c',high:color};n.transform.width=n.transform.height=size;return n;};
 const group=node('group');group.children=[make('WaterCaustics',.86,'#e9aa61'),make('Ring',.74,'#8fd4e0'),make('Star',.38,'#fff1ba')];p.root.children=[group];p.canvas.ratio=4/3;
 return {
  draw(id){
   const spec=EFFECT_BY_ID.get(id),n=structuredClone(group);n.effectPresence={};
   if(spec){
   for(const param of spec.parameters){const value=effectValues(settings,id)[param.key];const parts=param.path.split('.');let at=n;for(const key of parts.slice(0,-1))at=at[key];at[parts.at(-1)]=value;}
   n.effectPresence[id]=true;n.postEffects[id].enabled=true;
   if(spec.legacy!==undefined&&!effectPresent(settings,id)&&settings.effectPresence?.[id]!==false&&!(n.postFx[spec.legacy]>0))n.postFx[spec.legacy]=spec.start;
   }
   p.root.children=[n];const pixels=renderer.draw(p,120,90,{time:.35,formulaSeconds:.7,quality:1,read:true});
   return new ImageData(Uint8ClampedArray.from(pixels,v=>Math.round(Math.max(0,Math.min(1,v))*255)),120,90);
  },
  destroy(){renderer.destroy();renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();}
 };
}
