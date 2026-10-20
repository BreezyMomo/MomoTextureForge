import {TreeRenderer} from './tree-renderer.js';
import {project,node,shapeDefaults} from './tree-model.js';
import {sampleProject} from './tree-samples.js';
const button=document.getElementById('run'),result=document.getElementById('result');
button.onclick=async()=>{button.disabled=true;const checks=[];let hot,reference;
try{
 const Reference=new URLSearchParams(location.search).has('baseline')?(await import('./.perf-baseline/tree-renderer.js')).TreeRenderer:TreeRenderer;
 hot=new TreeRenderer(document.createElement('canvas'));reference=new Reference(document.createElement('canvas'));
 const compare=(name,p,t=.35,w=96,h=80)=>{reference.clearCache();const a=reference.draw(p,w,h,{time:t,read:true}),b=hot.draw(p,w,h,{time:t,read:true});let max=0;for(let i=0;i<a.length;i++){if(!Number.isFinite(a[i])||!Number.isFinite(b[i]))throw Error(name+': nonfinite');max=Math.max(max,Math.abs(a[i]-b[i]));}if(max>1e-6)throw Error(name+': max difference '+max);checks.push({name,maxDifference:max});};
 const p=project(),n=p.root.children[0];n.arrange[0]=5;n.arrange[3]=64;n.arrange[4]=.07;n.arrange[5]=.38;
 compare('initial spiral',p);for(let i=0;i<5;i++){n.arrange[5]=.25+i*.03;compare('radius '+i,p);}
 n.arrange[16]=282.85;n.arrange[19]=2;compare('angle orientation',p);
 n.uv[2]=.17;compare('UV invalidation',p);n.params[0]=.23;compare('shape invalidation',p);
 n.color.mode='own';n.color.stops=[{position:0,color:'#000000'},{position:.5,color:'#ff0000'},{position:1,color:'#00ffff'}];compare('palette invalidation',p);
 n.seamless=true;n.seamMode=1;n.seamBlend=.3;compare('seamless',p);n.polar=true;compare('polar',p);
 n.post[0]=.2;n.invert=true;n.mask=node();n.mask.transform.width=.4;n.maskInvert=true;compare('post and mask',p);
 n.type='HeartLeafTeardrop';n.params=shapeDefaults('HeartLeafTeardrop');compare('type change',p);
 for(const mode of ['height','normal','rgba','color']){p.output.mode=mode;compare('output '+mode,p,.35,128,64);}
 p.output.alpha=false;p.output.background='#aabbcc';compare('opaque background',p);n.arrange[0]=0;compare('disable arrangement',p);n.arrange[0]=5;compare('reenable arrangement',p);
 const q=sampleProject(0);q.root.arrange[0]=1;q.root.arrange[1]=2;q.root.arrange[2]=2;
 for(const time of [0,.25,.6,1])compare('animated group '+time,q,time);
 q.root.instancePhase=.13;compare('independent instance phase',q,.3);q.root.instancePhase=0;q.root.children[0].opacity=.4;compare('child mutation',q,.3);compare('portrait resize',q,.3,64,128);
 for(const size of [128,1024]){hot.clearCache();const probe=project(),leaf=probe.root.children[0];leaf.arrange[0]=5;leaf.arrange[3]=64;leaf.arrange[4]=.07;
 for(let i=0;i<3;i++){leaf.arrange[5]=.2+i*.01;hot.draw(probe,size,size);}
 let allocations=0,contentDraws=0,uniformQueries=0;const gl=hot.gl,create=gl.createTexture.bind(gl),get=gl.getUniformLocation.bind(gl),base=hot.base.draw.bind(hot.base);
 gl.createTexture=(...args)=>{allocations++;return create(...args);};gl.getUniformLocation=(...args)=>{uniformQueries++;return get(...args);};hot.base.draw=(...args)=>{contentDraws++;return base(...args);};
 try{leaf.arrange[5]=.3;hot.draw(probe,size,size);}finally{gl.createTexture=create;gl.getUniformLocation=get;hot.base.draw=base;}
 if(contentDraws!==0||allocations>(size===128?1:5)||uniformQueries!==0)throw Error('warm reuse failed '+JSON.stringify({contentDraws,allocations,uniformQueries}));checks.push({name:'warm radius reuse',size,contentDraws,allocations,uniformQueries});
 hot.clearCache();if(hot.allocated!==0)throw Error('clearCache retained idle resources');for(let i=0;i<12;i++)hot.draw(probe,i%2?128:64,96,{read:true});if(hot.allocated>128*1024*1024)throw Error('retained budget exceeded');}
 hot.clearCache();hot.usedKeys.clear();hot.budget=1024*1024;const consumed=hot.target(128,128);hot.cache.set('content:test',consumed);hot.usedKeys.add('content:test');hot.reclaimable.add(consumed);const next=hot.target(160,160);if(hot.cache.has('content:test'))throw Error('consumed content blocked allocation');hot.release(next);checks.push({name:'consumed source evicted under budget pressure'});
 result.textContent=JSON.stringify({passed:true,checks},null,2);
}catch(e){result.textContent=JSON.stringify({passed:false,error:e.stack,checks},null,2);}
finally{hot?.destroy();reference?.destroy();result.textContent+='\n'+JSON.stringify({allocatedAfterDestroy:hot?.allocated,referenceAfterDestroy:reference?.allocated});button.disabled=false;}};
