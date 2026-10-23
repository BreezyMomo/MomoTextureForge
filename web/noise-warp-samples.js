import {node,cloneNode} from './tree-model.js';
function content(mode){
 const g=node('group');g.name='可编辑的原始内容';
 const shape=(type,name,tint,size=1)=>{const n=node('shape',type);n.name=name;n.shapeClock.follow=false;n.color={mode:'own',fill:'solid',low:tint,high:tint};n.transform.width=n.transform.height=size;return n;};
 const grid=shape(['Grid','Checker','HexGrid'][mode],'底纹',["#e2a25e","#3c96d5","#745ce2"][mode],.86);
 const ring=shape('Ring','叠加圆环','#b9edff',.7),star=shape('Star','叠加星光','#fff0ad',.35);star.transform.x=.6;star.transform.y=.58;
 g.children=[grid,ring,star];return g;
}
export function noiseWarpSamples(){
 return [
  {key:'heatHaze',values:{warpMode:0,warpX:18,warpY:3,warpScale:72,warpDetail:3,motionAngle:90,motionSpeed:28,warpMotion:0},seconds:3},
  {key:'waterRipples',values:{warpMode:1,warpX:10,warpY:10,warpScale:64,warpDetail:2,motionAngle:-30,motionSpeed:20,warpMotion:1,loopSeconds:3},seconds:3},
  {key:'energyWarp',values:{warpMode:2,warpX:26,warpY:22,warpScale:64,warpDetail:4,motionAngle:25,motionSpeed:36,warpMotion:1,loopSeconds:3.6},seconds:3.6}
 ].map(({key,values,seconds})=>{
  const root=node('group');root.name=['热浪扭曲对照','水波折射对照','能量扰动对照'][values.warpMode];
  const original=content(values.warpMode),warped=cloneNode(original);original.name='原图 · 无扭曲';warped.name='合成后统一扭曲';
  Object.assign(original.transform,{x:.25,width:.45,height:.86});Object.assign(warped.transform,{x:.75,width:.45,height:.86});
  warped.boundary='visible';Object.assign(warped.postEffects.noiseWarp,{enabled:true,...values,seed:19,mix:1});root.children=[original,warped];
  return {nameKey:'examples.'+key+'.name',description:'examples.'+key+'.description',root,category:'composition',tags:['fx.effect.noiseWarp','fx.option.'+key],output:{seconds,frames:Math.round(seconds*30),loopExport:values.warpMotion===1}};
 });
}
