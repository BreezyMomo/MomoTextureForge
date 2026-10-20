// Deterministic geometry builders. No WebGL state or frame history is required.
export function generatorRandom(seed){let state=seed>>>0;return()=>{state=(state+0x9e3779b9)>>>0;let n=state;n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return ((n^(n>>>15))>>>0)/4294967296;};}
const tau=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
function noiseTable(random){const values=Array.from({length:64},()=>random()*2-1);return t=>{t=((t%1)+1)%1*62;const i=Math.floor(t),f=t-i;return lerp(values[i],values[i+1],f*f*(3-2*f));};}
const record=(a,b,color=[1,1,1],soft=.5)=>[...a,...b,...color,soft];
function cloud(p){
 const random=generatorRandom(p.seed),profile=noiseTable(generatorRandom(p.seed+7)),lobesRandom=generatorRandom(p.seed+3);
 const angle=p.direction*Math.PI/180,axis=[Math.cos(angle),Math.sin(angle)],side=[-axis[1],axis[0]];
 const lobes=Array.from({length:4+Math.floor(lobesRandom()*5)},()=>{const a=lobesRandom()*tau,r=lobesRandom()*p.width*.25;return [Math.cos(a)*r,Math.sin(a)*r*p.length/Math.max(p.width,.01)*.7,.04+lobesRandom()*.08];});
 const records=[];
 for(let i=0;i<Math.round(p.count);i++){
  let x,y,radius,opacity,soft;
  if(p.style<.5){
   const t=random(),peak=clamp(.5+p.taper*.4,.01,.99);
   let envelope=Math.abs(p.taper)>.01?Math.pow(t,peak*2)*Math.pow(1-t,(1-peak)*2)/(Math.pow(peak,peak*2)*Math.pow(1-peak,(1-peak)*2)):Math.sin(t*Math.PI);
   envelope=Math.max(0,envelope*(1+p.billow*profile(t)*.8)*(1+t*p.expansion*2));
   const longitudinal=(t-.5)*p.length*.76,curve=Math.sin(t*Math.PI)*p.curve*.25+p.drift*t*t*.3;
   const a=random()*tau,radial=Math.pow(random(),.5+p.clumpiness*1.5),spread=envelope*p.width*.5;
   const along=longitudinal+Math.sin(a)*radial*spread*.6,across=curve+Math.cos(a)*radial*spread;
   x=.5+axis[0]*along+side[0]*across;y=.5+axis[1]*along+side[1]*across;
   radius=lerp(p.minSize,p.maxSize,1-radial)*(.5+random()*.8);
   opacity=p.puffOpacity*Math.pow(envelope,.6)*(1-radial*.4)*(.6+random()*.8);soft=.3+radial*.7;
  }else if(p.style<1.5){
   const a=random()*tau,r=Math.pow(random(),.4+p.clumpiness);
   const envelope=(1+r*p.expansion*2.5)*(1+p.billow*profile(a/tau)*.5);
   let lx=Math.cos(a)*r*p.width*.48*envelope,ly=Math.sin(a)*r*p.length*.48*envelope;
   if(random()<.3){const l=lobes[Math.floor(random()*lobes.length)];lx=l[0]+Math.cos(a)*r*l[2];ly=l[1]+Math.sin(a)*r*l[2]*.8;}
   const drift=(p.drift*.3+p.taper*.35)*r;
   lx+=drift;ly+=Math.sin(r*Math.PI)*p.curve*.35;
   x=.5+lx*axis[0]-ly*axis[1];y=.45+lx*axis[1]+ly*axis[0];
   radius=lerp(p.minSize,p.maxSize,1-r*.6)*(.5+random()*.9)*1.1;opacity=p.puffOpacity*(1-r*.45)*(.6+random()*.8)*1.2;soft=.25+r*.55;
  }else{
   const t=Math.pow(random(),1.8),height=.55+p.width*.2;
   y=t*height-.04;x=random();x+=profile(y*3.)*p.billow*.12+p.drift*t*t*.25;x=.5+(x-.5)*(1+t*p.expansion*1.2);
   radius=lerp(p.minSize,p.maxSize,random())*(1-t*.3)*1.8;opacity=p.puffOpacity*(1-t)*(.5+random()*.7)*1.4;soft=.2+random()*.5;
  }
  records.push(record([x,y,radius,opacity],[x,y,radius,opacity],[1,1,1],soft));
 }
 return records;
}
function boltPath(random,start,end,segments,jagged){
 const dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy),normal=[-dy/Math.max(length,.001),dx/Math.max(length,.001)];
 const amplitude=length*jagged*.12,offsets=new Float64Array(segments+1),waveCount=2+Math.floor(random()*3);
 for(let i=1;i<segments;i++){const t=i/segments,envelope=Math.sin(t*Math.PI);offsets[i]+=(random()*2-1)*amplitude*envelope*Math.sin(t*waveCount*Math.PI+random()*tau)*.5;}
 for(const gain of [.6,.25])for(let i=1;i<segments;i++)offsets[i]+=(random()*2-1)*amplitude*gain*(gain>.3?Math.sin(i/segments*Math.PI):1);
 let kink=0;for(let i=1;i<segments;i++){if(random()<.15+jagged*.2)kink+=(random()<.5?-1:1)*(.3+random()*.7)*amplitude*.4;kink*=.95;offsets[i]+=kink*Math.sin(i/segments*Math.PI);}
 return Array.from(offsets,(offset,i)=>{const t=i/segments;return [lerp(start[0],end[0],t)+normal[0]*offset,lerp(start[1],end[1],t)+normal[1]*offset,t];});
}
function lightning(p){
 const random=generatorRandom(p.seed),paths=[],segments=Math.round(p.segments);
 const primary=boltPath(random,[.5,.92],[.5,.1],segments,p.jaggedness);
 paths.push({points:primary,width:1,brightness:1,depth:0},{points:boltPath(random,[.5+(random()-.5)*.01,.92],[.5+(random()-.5)*.02,.1],segments,p.jaggedness*.8),width:.6,brightness:.4,depth:0});
 for(let i=0;i<Math.round(p.branches);i++){
  const t=.05+random()*.75,root=primary[Math.floor(t*segments)],angle=-Math.PI/2+(random()<.5?-1:1)*(.3+random()*.8)*p.spread*2;
  const length=(.15+.35*(1-t))*lerp(1-p.lengthVariation*.7,1+p.lengthVariation*1.2,random()),n=Math.max(6,Math.floor(segments*length*1.5));
  const branch=boltPath(random,root,[root[0]+Math.cos(angle)*length,root[1]+Math.sin(angle)*length],n,p.jaggedness*1.1),brightness=.6+random()*.2;
  paths.push({points:branch,width:.4+random()*.2,brightness,depth:1});
  for(let depth=2;depth<=3;depth++)if(p.branches>(depth===2?4:10)&&random()<(depth===2?.6:.4)){
   const root=branch[Math.floor((.15+random()*.5)*n)],childAngle=angle+(random()-.5)*p.spread*1.5,childLength=length*(.15+random()*(.3+p.lengthVariation*.4));
   paths.push({points:boltPath(random,root,[root[0]+Math.cos(childAngle)*childLength,root[1]+Math.sin(childAngle)*childLength],Math.max(3,Math.floor(n/(depth+1))),p.jaggedness*(1+depth*.1)),width:.3/depth+random()*.1,brightness:brightness*.7/depth,depth});
  }
 }
 const hue=p.hue*6,s=p.saturation,value=1;const rgb=[5,3,1].map(shift=>{const k=(shift+hue)%6;return value*(1-s*Math.max(0,Math.min(k,4-k,1)));});
 const records=[];for(const path of paths){const n=path.points.length-1;for(let i=0;i<n;i++){const a=path.points[i],b=path.points[i+1],width=p.thickness*.003*path.width,taper=path.depth===0?.3:.6+path.depth*.2,light=path.brightness*(.85+random()*.15);records.push(record([a[0],a[1],width*(1-a[2]*taper),light*(1-Math.pow(a[2],3))],[b[0],b[1],width*(1-b[2]*taper),light*(1-Math.pow(b[2],3))],rgb,.25));}
  const root=path.points[0],r=p.thickness*.003*path.width*p.coreGlow*(path.depth? .8:1.2);records.push(record([root[0],root[1],r,path.brightness*.6],[root[0],root[1],r,path.brightness*.6],rgb,-1));
 }
 return records;
}
function sparks(p){
 const random=generatorRandom(p.seed),records=[],angle=p.direction*Math.PI/180,gravity=.001+p.gravity*.006;
 const logRandom=(a,b)=>a*Math.pow(b/a,random());
 const angleSample=()=>{const band=random(),spread=band<.15?10+p.spread*15:band<.8?80+p.spread*80:200+p.spread*100;return angle+(random()-.5)*spread*Math.PI/180;};
 const field=noiseTable(generatorRandom(p.seed+7919));
 const paths=[];
 const groups=[{count:Math.max(3,Math.floor((6+10*p.amount)*p.amount)),speed:[.012,.024],steps:[20,45],drag:.975,width:[.002,.005],light:[.8,1.2],heat:[.8,1]},
 {count:Math.floor((120+200*p.amount)*p.amount),speed:[.006,.02],steps:[5,20],drag:.96525,width:[.001,.003],light:[.15,.6],heat:[.4,.8]},
 {count:Math.floor((600+3000*p.dust)*p.amount),speed:[.002,.008],steps:[2,6],drag:.98475,width:[.0004,.0012],light:[.03,.12],heat:[.2,.6]}];
 let id=0;for(const [groupIndex,g]of groups.entries())for(let j=0;j<g.count;j++){
  const across=(random()-.5)*p.emitWidth,origin=[.5-Math.sin(angle)*across+(random()-.5)*.005,-.12+Math.cos(angle)*across+(random()-.5)*.008];
  const direction=groupIndex===2?random()*tau:angleSample(),speed=lerp(...g.speed,random());let vx=Math.cos(direction)*speed,vy=Math.sin(direction)*speed,x=origin[0],y=origin[1];
  const count=Math.max(2,Math.floor(lerp(...g.steps,random())*p.length)),points=[];
  for(let step=0;step<count;step++){points.push([x,y]);vx*=g.drag;vy=vy*g.drag+gravity*(groupIndex===2?.4:groupIndex===1?1.2:1);vx+=field(y*30+id*.137)*(.005+p.chaos*.015);vy-=field(x*30+id*.137+.37)*(.005+p.chaos*.015);x+=vx;y+=vy;}
  paths.push({points,width:logRandom(...g.width)*(1+p.glow*.5),light:logRandom(...g.light),heat:lerp(...g.heat,random())*p.heat});id++;
 }
 // Secondary fragments detach from existing paths instead of independent straight rays.
 for(let i=0,count=Math.floor(paths.length*(.03+p.chaos*.04));i<count;i++){const parent=paths[Math.floor(random()*Math.min(paths.length,groups[0].count+groups[1].count))];if(parent.points.length<6)continue;const at=Math.floor(parent.points.length*(.3+random()*.4)),root=parent.points[at],previous=parent.points[at-1],turn=Math.atan2(root[1]-previous[1],root[0]-previous[0])+(random()-.5)*1.5;const points=[root];for(let k=1;k<6;k++)points.push([root[0]+Math.cos(turn)*k*.006,root[1]+Math.sin(turn)*k*.006]);paths.push({points,width:parent.width*.4,light:parent.light*.3,heat:parent.heat*.5});}
 for(const path of paths){let gap=0,run=0;const count=path.points.length-1;for(let i=0;i<count;i++){
  const t=i/count,next=(i+1)/count;if(p.segments>1&&((t*p.segments)%1)>.6)continue;if(gap){gap--;continue;}
  if(t>.1&&run>=Math.max(1,Math.floor(p.length*3))&&random()<p.breaks*.7){gap=1+Math.floor(random()*(1+p.breaks*4));run=0;continue;}run++;
  const a=path.points[i],b=path.points[i+1],light=path.light*(.5+random()*.5),heat=clamp(path.heat*(1-t*.8));
  const color=[1,.25+heat*.65,.025+heat*.6];records.push(record([a[0],a[1],path.width*Math.pow(1-t,1.7),light*Math.pow(1-t,2)],[b[0],b[1],path.width*Math.pow(1-next,1.7),light*Math.pow(1-next,2)],color,.35));
 }}
 for(let i=0;i<Math.round(p.emberCount);i++){let x=.5+(random()-.5)*(.25+p.emberDrift*.35)*2,y=-.12+random()*(.4+p.emberDrift*.55),vx=(random()-.5)*.002,vy=.001+random()*.004*p.emberDrift;for(let k=0,n=20+Math.floor(random()*50);k<n;k++){x+=vx;y+=vy;vx=vx*.97+(random()-.5)*.0006;vy*=.985;}const size=logRandom(.008,.05)*p.emberSize,light=logRandom(.1,.55),heat=p.emberHeat*(.3+random()*.7);records.push(record([x,y,size*.15,light],[x+vx*size*400,y+vy*size*400,size*.15,light*.1],[1,.3+heat*.35,.05+heat*.15],.8));}
 return records;
}
export function generatorGeometry(effect,parameters){
 const p={...parameters};if(Object.values(p).some(v=>!Number.isFinite(v)))throw Error('生成器参数包含非有限数值');
 // These limits bound CPU work even when a resource supplies broader UI ranges.
 p.count=Math.round(clamp(p.count??310,1,2000));p.amount=clamp(p.amount??1,.1,2);p.dust=clamp(p.dust??.7,0,1);p.emberCount=Math.round(clamp(p.emberCount??0,0,500));p.length=clamp(p.length??.5,.05,1.5);p.branches=Math.round(clamp(p.branches??8,0,20));p.segments=Math.round(clamp(p.segments??45,1,effect==='lightning'?128:8));
 const rows=effect==='smoke'?cloud(p):effect==='sparks'?sparks(p):effect==='lightning'?lightning(p):[];return new Float32Array(rows.flat());
}
