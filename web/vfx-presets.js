import {node} from './tree-model.js';

const group=name=>Object.assign(node('group'),{name});
function shape(type,name,tint,x=.5,y=.5,width=1,height=width,rotation=0){
 const n=node('shape',type);n.name=name;n.color={mode:'own',fill:'solid',low:tint,high:tint};Object.assign(n.transform,{x,y,width,height,rotation});return n;
}
function curve(name,tint,points,width=.045,end=width){const n=shape('BezierRibbon',name,tint);Object.assign(n.params,Object.fromEntries([...points,width,end,.001,1,0].map((v,i)=>[i,v])));return n;}
function disc(name,tint,x,y,size){const n=shape('Circle',name,tint,x,y,size);n.params[0]=.85;return n;}
function ring(name,tint,x,y,width,height,stroke=.06){const n=shape('Ring',name,tint,x,y,width,height);n.params[0]=.72;n.params[1]=stroke;return n;}
function rng(seed){let s=seed;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}

function streamers(){
 const root=group('卷曲庆典彩带');
 const paths=[[-.54,.78,.66,.95,.59,.25,-.16,.38],[-.16,.38,-.65,.43,-.5,-.1,.26,-.04],[.26,-.04,.86,.02,.56,-.75,-.14,-.78]];
 for(const [i,x,angle]of [[0,.05,-18],[1,-.25,24],[2,.28,-8]]){
  const ribbon=group('卷曲彩带 '+(i+1));Object.assign(ribbon.transform,{x:.5+x*.65,width:.64,height:.9,rotation:angle});
  const shades=[['#d68c25','#ffe39a','#f7b849'],['#b83365','#ff9abc','#f46296'],['#237eb0','#9aeaff','#51c7e9']][i];
  ribbon.children=paths.map((p,j)=>curve('彩带段 '+(j+1),shades[j],p,.12,j===2?.025:.12));root.children.push(ribbon);
 }return root;
}

function acidSplash(){
 const root=group('酸液飞溅'),body=shape('Splat','酸液主体','#7bbb31');Object.assign(body.params,{0:.38,1:8,2:.38,3:0});root.children=[body];
 const pool=disc('中心积液','#a6e952',.49,.49,.38);root.children.push(pool);
 const random=rng(29);
 for(let i=0;i<11;i++){const a=i/11*Math.PI*2,r=.28+random()*.15,size=.04+random()*.08,d=shape('Teardrop','飞溅液滴 '+i,'#9ad841',.5+Math.cos(a)*r,.5+Math.sin(a)*r,size,size*1.5,a*180/Math.PI-90);Object.assign(d.params,{0:.8,1:.45,4:.65});root.children.push(d);}
 for(const [x,y,size]of [[.43,.53,.09],[.57,.44,.07],[.51,.6,.045]]){root.children.push(disc('气泡暗心','#477d24',x,y,size),ring('气泡亮边','#d9ff85',x-.002,y+.003,size,size,.035));}
 root.children.push(curve('积液反光','#e8ff9c',[-.28,.07,-.22,.3,.08,.38,.22,.18],.025,.008));return root;
}

export function vfxPresets(){
 return [
  [acidSplash(),'不规则酸液、飞溅液滴、气泡与反光组成一张透明贴图，可分别调整液滴及气泡。',['酸液','飞溅','静态 PNG']],
  [streamers(),'三条分段贝塞尔彩带，通过明暗段表现卷曲。展开彩带组即可编辑控制点、线宽和配色。',['彩带','曲线','静态 PNG']],
 ].map(([root,description,tags])=>({name:root.name,root,description,tags,category:'presets',output:{mode:'color',alpha:true,seconds:3,frames:90,loopExport:true}}));
}
