import {node,cloneNode} from './tree-model.js';
const track=keys=>({keys,ease:'smooth'});
function shape(type,color,size){
 const n=node('shape',type);n.shapeClock.follow=false;n.name=type;
 n.color={mode:'own',fill:'solid',low:color,high:color};n.transform.width=n.transform.height=size;
 return n;
}
function pair(key,content,id,values,seconds){
 const root=node('group');root.name={burnDissolve:'Burn dissolve comparison',shockwaveRefraction:'Shockwave refraction comparison',liquidFusion:'Liquid fusion comparison'}[key];
 const original=cloneNode(content),processed=cloneNode(content);
 original.name='Original';processed.name='Processed composite';
 Object.assign(original.transform,{x:.25,width:.46,height:.88});Object.assign(processed.transform,{x:.75,width:.46,height:.88});
 processed.boundary='visible';Object.assign(processed.postEffects[id],{enabled:true,...values});root.children=[original,processed];
 return {nameKey:'examples.'+key+'.name',description:'examples.'+key+'.description',category:'composition',previewTime:id==='shockwave'?.35:.5,tags:['fx.effect.'+id],root,output:{seconds,exportSeconds:seconds,fps:30,frames:Math.round(seconds*30),loopExport:false,alpha:true}};
}
export function contentEffectSamples(){
 const emblem=node('group');emblem.children=[shape('Ring','#ffc04f',.82),shape('Star','#68d9ee',.55)];
 const dissolve=pair('burnDissolve',emblem,'dissolve',{dissolvePattern:2,dissolveAngle:35,edgeWidth:.12},3);
 dissolve.root.children[1].tracks['postEffects.dissolve.progress']=track([[0,0],[.1,0],[.9,1],[1,1]]);
 const pattern=node('group');pattern.children=[shape('Checker','#406dca',.95),shape('Ring','#eff7ff',.78),shape('Star','#f8b957',.35)];
 const wave=pair('shockwaveRefraction',pattern,'shockwave',{waveRadius:1.15,waveWidth:90,displacement:40,waveDecay:.4},2.4);
 wave.root.children[1].tracks['postEffects.shockwave.progress']={keys:[[0,0],[1,1]],ease:'linear'};
 const drops=node('group'),left=shape('Circle','#48e0cf',.58),right=shape('Circle','#7560ed',.58),top=shape('Circle','#c277ef',.42);
 left.transform.x=.23;right.transform.x=.77;top.transform.y=.76;
 left.tracks['transform.x']=track([[0,.23],[.5,.305],[1,.23]]);right.tracks['transform.x']=track([[0,.77],[.5,.695],[1,.77]]);
 top.tracks['transform.y']=track([[0,.86],[.5,.78],[1,.86]]);drops.children=[left,right,top];
 const liquid=pair('liquidFusion',drops,'liquidFusion',{fusionRadius:24,fusionThreshold:.28,fusionSoftness:.05},3.2);liquid.output.loopExport=true;
 return [dissolve,wave,liquid];
}
