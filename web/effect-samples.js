// Editable effects built from ordinary nodes, arrangements and normalized tracks.
import {node} from './tree-model.js';
import {BY_ID} from './catalog.js';

const group=name=>Object.assign(node('group'),{name});
function shape(type,name,size,tint){
 const n=node('shape',type);n.name=name;
 Object.assign(n.transform,{width:size,height:size});
 // Generators retain their native colors unless a tint is explicitly requested.
 if(tint)n.color={mode:'own',fill:'solid',low:tint,high:tint};
 return n;
}
function parameters(n,values){
 for(const [variable,value]of Object.entries(values)){
  const spec=BY_ID.get(n.type)?.parameters.find(p=>p.variable===variable);
  if(!spec)throw Error(`Unknown ${n.type} parameter: ${variable}`);
  n.params[spec.slot]=value;
 }
 return n;
}
function track(n,path,keys,ease='smooth'){n.tracks[path]={mode:'absolute',ease,keys};return n;}
function scale(n,keys){track(n,'transform.width',keys);track(n,'transform.height',keys);return n;}
function envelope(n,peak=.2,hold=.4){return track(n,'opacity',[[0,0],[peak,1],[hold,1],[1,0]]);}
function clock(n,keys){n.shapeClock.follow=false;return track(n,'shapeClock.value',keys,'linear');}
function disc(name,size,tint){return parameters(shape('Halo',name,size,tint),{radius:0,width:.48,strength:1});}
function wave(name,tint,delay=0){
 const n=parameters(shape('Halo',name,.94,tint),{radius:.12,width:.035,strength:1});
 track(n,'params.0',[[0,.06],[delay,.06],[.75,.84],[1,.96]]);
 track(n,'opacity',[[0,0],[delay,0],[delay+.06,.9],[.6,.6],[1,0]]);return n;
}
function burst(name,type,tint,count,seed){
 const n=group(name);Object.assign(n.arrange,{0:8,3:count,4:.075,5:.08,9:.4,10:55,11:seed,19:1,33:1});
 const mark=shape(type,'可替换的碎屑单元',1,tint);
 if(type==='Polygon')parameters(mark,{sideCount:4,circumradius:.75});
 mark.transform.width=.45;n.children=[mark];
 track(n,'arrange.5',[[0,.04],[.22,.15],[1,.43]]);
 track(n,'arrange.4',[[0,.02],[.2,.09],[1,.015]]);
 return envelope(n,.12,.32);
}
function lightning(){
 const root=group('雷电打击');
 const bolt=parameters(shape('BranchedLightning','主闪电与分叉',.88),{seed:4921,branches:10,jaggedness:.65,thickness:2.3,intensity:1.5,coreGlow:3.4,outerGlow:1.6,hue:.57,saturation:.48,motionSpeed:0});
 track(bolt,'opacity',[[0,0],[.08,1],[.14,.35],[.2,1],[.32,.65],[.48,0],[1,0]],'linear');
 const flash=parameters(shape('NovaBurst','接触闪光',.4,'#e7fbff'),{cornerCount:4});
 flash.transform.y=.18;scale(flash,[[0,.02],[.15,.42],[.4,.07],[1,0]]);envelope(flash,.1,.2);
 const glow=disc('接触光晕',.48,'#35a8ff');glow.transform.y=.18;envelope(glow,.12,.2);
 const sparks=parameters(shape('BallisticSparks','残留电火花',.63,'#8ce8ff'),{seed:210,amount:.35,spread:.85,gravity:.35,emberCount:45,motionSpeed:.5});sparks.transform.y=.25;
 clock(sparks,[[0,0],[1,1.2]]);track(sparks,'opacity',[[0,0],[.18,0],[.24,1],[.55,.65],[1,0]]);
 root.children=[glow,bolt,sparks,flash];return root;
}
function frost(){
 const root=group('冰霜新星'),crystals=burst('冰晶向外爆发','Polygon','#b5f5ff',18,47);
 crystals.children[0].transform.height=1;crystals.children[0].transform.width=.3;
 const debris=burst('外围冰屑','Star','#e8fdff',25,83);debris.transform.rotation=13;debris.arrange[4]=.035;
 track(debris,'arrange.4',[[0,.01],[.2,.04],[1,.008]]);
 const mist=parameters(shape('VolumeSmoke','扩散冷雾',.9,'#5b9fd3'),{seed:935,radius:.85,density:1.4,turbulence:.85,quality:40});
 scale(mist,[[0,.1],[.45,.6],[1,.95]]);clock(mist,[[0,0],[1,1.4]]);track(mist,'opacity',[[0,0],[.22,.5],[.5,.35],[1,0]]);
 const core=disc('冰蓝亮核',.45,'#c2ffff');envelope(core,.1,.15);scale(core,[[0,.03],[.15,.45],[1,.1]]);
 root.children=[mist,wave('扩散冰环','#75d9ff',.08),wave('细亮冰环','#d8ffff',.16),crystals,debris,core];return root;
}
function explosion(){
 const root=group('火焰爆炸');
 const smoke=parameters(shape('VolumeSmoke','尾段烟雾',.96),{seed:381,radius:.9,density:2.1,turbulence:1.2,quality:40});
 scale(smoke,[[0,.12],[.35,.65],[1,.98]]);clock(smoke,[[0,0],[1,2.4]]);track(smoke,'opacity',[[0,0],[.16,0],[.4,.65],[.7,.42],[1,0]]);
 const fire=parameters(shape('VolumeExplosion','翻卷火体',1),{seed:731,density:3.2,radius:1,turbulence:1.05,temperature:1.55,quality:48});
 clock(fire,[[0,0],[1,3.4]]);scale(fire,[[0,.12],[.25,.85],[1,1]]);envelope(fire,.1,.25);
 const core=disc('爆炸白热亮核',.42,'#fff4c5');scale(core,[[0,.03],[.1,.5],[.4,.15],[1,0]]);envelope(core,.06,.12);
 const embers=parameters(shape('BallisticSparks','飞散余烬',.94),{seed:419,amount:.5,spread:1,gravity:.2,emberCount:95,emberDrift:.6,motionSpeed:.45});
 clock(embers,[[0,0],[1,2.3]]);track(embers,'opacity',[[0,0],[.14,0],[.25,1],[.65,.55],[1,0]]);
 root.children=[smoke,wave('爆炸冲击环','#ff9c45',.08),fire,embers,core];return root;
}
function shieldImpact(){
 const root=group('全息护盾受击'),shield=group('圆形护盾表面');
 const cells=parameters(shape('ShieldHex','蜂巢底纹',.9,'#278dae'),{gridDensity:7,gridLineWidth:.026,pulsationSpeed:0,pulsationStrength:0});
 const scan=parameters(shape('Hologram','扫描线',.9,'#7defff'),{scanLineCount:140,scanBandWidth:.025,scanSpeed:.35,jitter:.01});scan.opacity=.22;clock(scan,[[0,0],[1,1.5]]);
 shield.children=[cells,scan];shield.mask=parameters(shape('Circle','护盾边界',.88,'#ffffff'),{radius:.93});envelope(shield,.1,.55);
 const hit=disc('局部受击亮斑',.4,'#c6ffff');Object.assign(hit.transform,{x:.64,y:.6});envelope(hit,.14,.22);scale(hit,[[0,.01],[.15,.45],[1,.1]]);
 const ripple=wave('受击扩散波','#b4ffff',.12);Object.assign(ripple.transform,{x:.64,y:.6,width:.65,height:.65});
 ripple.mask=parameters(shape('Circle','波纹圆形限制',1,'#ffffff'),{radius:.92});
 const rim=parameters(shape('Halo','护盾边缘',.9,'#3bceff'),{radius:.9,width:.014});envelope(rim,.08,.55);
 root.children=[shield,rim,ripple,hit];return root;
}
function dotArray(){
 const root=group('可替换单元点阵');Object.assign(root.arrange,{0:1,1:10,2:7,4:.75,8:.06,9:.2,11:23});root.instanceContent='cycle-child';
 const dot=parameters(shape('Circle','圆形单元：可替换成图片或组件',1,'#79d7ed'),{radius:.55});
 const star=parameters(shape('Star','星形单元',1,'#f8c66f'),{outerRadius:.72});
 const cross=shape('Cross','十字单元',.7,'#b4a4f1');
 root.children=[dot,star,cross];return root;
}
function rings(waveform,name,tint){
 const root=group(name),ring=parameters(shape('RadialStreak','环纹波形与流动',.94,tint),{frequency:5,distortion:waveform===1?0:.13,sharpness:.025,falloff:.98,waveform,baseRadius:.08,flowSpeed:.5,waveCount:7,ringWidth:.12});
 // A whole number of radial cycles closes the loop without reversing the motion.
 clock(ring,[[0,0],[1,4]]);
 const rim=parameters(shape('Halo','外围柔光',.96,tint),{radius:.88,width:.06,strength:.45});rim.opacity=.4;
 root.children=[rim,ring];return root;
}
function glow(){
 const root=group('亮核与外晕');
 const outer=disc('外晕：单独调整范围与颜色',.96,'#447aff');outer.opacity=.65;
 const inner=disc('亮核：单独调整大小与颜色',.3,'#efffff');
 for(const [n,base]of [[outer,.65],[inner,1]])track(n,'opacity',[[0,base*.65],[.5,base],[1,base*.65]]);
 root.children=[outer,inner];return root;
}
// Closed smooth time curves keep seeded noise motion and all layers continuous at the seam.
function sway(n,offset=0,range=.5){clock(n,[[0,offset],[.25,offset+range],[.5,offset+range*2],[.75,offset+range],[1,offset]]);n.tracks['shapeClock.value'].ease='smooth';return n;}
function curtain(kind){
 const names=['极光帘','圣光幕','能量屏障'],colors=[['#36dcaa','#558eff','#cf83e9'],['#f4c86b','#fff0b4','#ffdab0'],['#36cbff','#6e76ff','#a0edff']];
 const root=group(names[kind]);
 for(let i=0;i<3;i++){
  const n=parameters(shape('AuroraVeil',['后景光带','中景光带','前景光带'][i],1,colors[kind][i]),{curtainScale:2+i*.8,flowSpeed:.4+i*.13,verticalDensity:1.3+i*.5,contrast:1.15,curtainModel:1,bandPosition:.18+i*.08,curtainHeight:kind===1?.72:.55,rayDensity:(kind===2?110:65)+i*17});
  Object.assign(n.transform,{width:.92,height:kind===1?.96:.86,y:.48+i*.025,rotation:(i-1)*7});n.opacity=[.55,.72,.9][i];
  sway(n,i*1.7,.7+i*.2);
  track(n,'transform.rotation',[[0,(i-1)*7],[.5,(i-1)*7+(i%2?3:-3)],[1,(i-1)*7]]);
  root.children.push(n);
 }
 const membrane=parameters(shape('RefractionMembrane','折光薄膜',.9),{seed:490+kind,waveAmplitude:.025,waveCount:.7,bandWidth:.3,foldAmount:.15,interiorOpacity:.015,edgeBrightness:.2,baseTint:parseInt(colors[kind][0].slice(1),16),edgeTint:parseInt(colors[kind][2].slice(1),16),motionSpeed:.25});
 membrane.opacity=.22;sway(membrane,1,.5);root.children.push(membrane);
 const threads=parameters(shape('ParticleStrands','前景粒子细丝',.94,colors[kind][1]),{seed:183+kind,strandCount:64,strandWidth:.0007,strandOpacity:.07,waveAmplitude:.03,waveCount:.7,bandWidth:.3,motionSpeed:.4,exposure:1.2});
 threads.opacity=.18;sway(threads,2,.8);root.children.push(threads);
 const dust=parameters(shape('BokehDust','景深浮尘',.94,colors[kind][2]),{seed:191+kind,density:.12,size:.35,softness:.4,fiberAmount:0,brightness:1.3,motionSpeed:.2});
 dust.opacity=.35;sway(dust,3,.4);root.children.push(dust);
 if(kind===1){const light=disc('圣光柔核',.5,'#fff1c7');light.opacity=.4;root.children.unshift(light);}
 if(kind===2){const grid=parameters(shape('ShieldHex','屏障能量网格',.86,'#4a88e2'),{gridDensity:8,gridLineWidth:.02,pulsationSpeed:0,pulsationStrength:0});grid.opacity=.15;grid.mask=disc('网格软边',1,'#ffffff');root.children.unshift(grid);}
 return root;
}

export function effectSamples(){
 const make=(id,root,category,seconds,loopExport,tags)=>({name:root.name,nameKey:`examples.${id}.name`,description:`examples.${id}.description`,root,category,tags,previewTime:.3,
  output:{mode:'color',alpha:true,width:loopExport?256:512,height:loopExport?256:512,fps:30,seconds,exportSeconds:seconds,frames:Math.round(seconds*30)+(loopExport?0:1),columns:8,loopExport}});
 return [
  ...[['lightningStrike',lightning(),1.2],['frostNova',frost(),1.6],['fireExplosion',explosion(),1.8],['holographicImpact',shieldImpact(),1.4]].map(([id,root,seconds])=>make(id,root,'vfx',seconds,false,['examples.completeAbility','examples.oneShotAnimation'])),
  make('replaceableDotArray',dotArray(),'arrangement',3,true,['examples.replaceableUnit','examples.mixedChildInstances']),
  ...[[1,'cleanRings','干净冲击环','#8cdfff'],[2,'liquidRipples','液态波纹','#59cbdc'],[0,'energyPulses','能量脉冲','#9f8bff']].map(([mode,id,name,tint])=>make(id,rings(mode,name,tint),'composition',4,true,['examples.waveformFlow','examples.loopingAnimation'])),
  make('coreHalo',glow(),'composition',3,true,['examples.independentCoreHalo','examples.loopingAnimation']),
  ...['auroraCurtain','holyCurtain','energyBarrier'].map((id,i)=>make(id,curtain(i),'composition',6,true,['examples.layeredCurtains','examples.loopingAnimation'])),
 ];
}
