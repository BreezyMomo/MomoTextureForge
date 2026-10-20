import {arrangementSamples} from "./authoring-samples.js";
import { defaults, newLayer } from "./state.js";
import { BY_ID } from "./catalog.js";

export async function checkAuthoring(renderer, progress=()=>{}) {
  const checks=[], pause=()=>new Promise((r)=>setTimeout(r,0));
  const assert=(ok,text)=>{if(!ok)throw new Error(text);};
  const read=(s,offset=[0,0],time=0)=>renderer.draw(s,128,128,{read:true,float:renderer.float,sampleOffset:offset,time});
  const difference=(a,b)=>a.reduce((n,v,i)=>n+(i%4===0&&Math.abs(v-b[i])>.02?1:0),0)/(a.length/4);
  const equal=(a,b)=>a.every((v,i)=>Number.isFinite(v)&&Math.abs(v-b[i])<.01);
  const state=(type)=>{const s=defaults();s.layers[0]=newLayer(type);s.output.mode=1;return s;};
  const probe=(s,x,y)=>renderer.draw(s,2,2,{read:true,float:renderer.float,sampleOffset:[(x+1)*.5-.25,(y+1)*.5-.75],time:0})[0];
  const check=async(name,fn)=>{try{await fn();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:error.message});}progress(`${checks.filter(c=>!c.timings).length}/18 图形专项完成`);await pause();};
  const components=(pixels)=>{
    const seen=new Uint8Array(128*128);let count=0;
    for(let i=0;i<seen.length;i++)if(!seen[i]&&pixels[i*4]>.5){count++;const queue=[i];seen[i]=1;
      for(let k=0;k<queue.length;k++){const n=queue[k],x=n%128,y=Math.floor(n/128);
        for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,j=yy*128+xx;if(xx>=0&&xx<128&&yy>=0&&yy<128&&!seen[j]&&pixels[j*4]>.5){seen[j]=1;queue.push(j);}}
      }
    }return count;
  };
  await check("gear root disk stays opaque across tooth boundaries with tree antialiasing",()=>{
    const s=state("Gear"),p=s.layers[0].params,size=256;
    p[0]=.8;p[1]=.25;p[3]=0;p[4]=.2;
    for(const count of [4,10,32])for(const top of [0,.5,1]){
      p[2]=count;p[6]=top;
      const pixels=renderer.draw(s,size,size,{read:true,float:renderer.float,treeEdges:true});
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const r=Math.hypot((x+.5)*2/size-1,(y+.5)*2/size-1),v=pixels[(y*size+x)*4];
        assert(Number.isFinite(v),"Non-finite gear pixel");
        if(r>.28&&r<.58)assert(v>.99,`Internal seam: teeth=${count}, top=${top}, r=${r}, value=${v}`);
        const angle=Math.abs(((Math.atan2((y+.5)*2/size-1,(x+.5)*2/size-1)%(2*Math.PI/count)+2*Math.PI/count)%(2*Math.PI/count))-Math.PI/count);
        // Probe the join itself, not just the safe interior of the root disk.
        if(Math.abs(r-.6)<.012 && angle<Math.PI*.5/count*.4)assert(v>.99,`Root join seam: teeth=${count}, top=${top}, value=${v}`);
        if(r<.22||r>.84)assert(v<.01,"Gear hole or exterior changed");
      }
    }
  });
  await check("leaf and teardrop have distinct outlines and every visible parameter changes pixels",async()=>{
    const drop=state("Teardrop"),leaf=state("Leaf");
    leaf.layers[0].params[5]=0;
    assert(difference(read(drop),read(leaf))>.02,"Leaf and drop collapsed to the same silhouette");
    assert(probe(drop,.1,.65)<probe(drop,.1,-.25),"Drop tip is not narrower than its body");
    for(const type of ["Teardrop","Leaf"]){const s=state(type),original=read(s);
      for(const p of BY_ID.get(type).parameters){const altered=structuredClone(s);altered.layers[0].params[p.slot]=p.min+(p.max-p.min)*.8;assert(difference(original,read(altered))>.0005,`${type}: ${p.label} ignored`);}
      progress(`已检查 ${type} 参数`);await pause();
    }
  });
  await check("straight Star edges are linear and round/legacy profiles differ",()=>{
    const s=state("Star"),p=s.layers[0].params;p[0]=.7;p[2]=5;p[3]=.001;p[4]=.45;p[5]=0;
    const a=[0,p[0]],b=[Math.sin(Math.PI/5)*p[0]*p[4],Math.cos(Math.PI/5)*p[0]*p[4]],edge=[b[0]-a[0],b[1]-a[1]],length=Math.hypot(...edge),normal=[-edge[1]/length,edge[0]/length];
    for(const t of [.25,.5,.75]){const x=a[0]+edge[0]*t,y=a[1]+edge[1]*t;assert(probe(s,x+normal[0]*.008,y+normal[1]*.008)<.01,"Star side bends outward");assert(probe(s,x-normal[0]*.008,y-normal[1]*.008)>.9,"Star side bends inward");}
    const straight=read(s);p[5]=1;p[1]=.12;assert(difference(straight,read(s))>.005,"Star rounding ignored");p[5]=2;assert(difference(straight,read(s))>.01,"Legacy Star not retained");
  });
  await check("cubic ribbon supports control points, taper, progress, caps, feather and keyframes",()=>{
    const s=state("BezierRibbon"),p=s.layers[0].params;
    p.splice(0,13,-.7,0,-.25,0,.25,0,.7,0,.16,.04,.005,1,0);
    assert(probe(s,-.4,.05)>.9&&probe(s,.4,.05)<.01,"Ribbon taper ignored");
    assert(probe(s,-.74,0)>.9,"Round start cap missing");p[12]=1;assert(probe(s,-.74,0)<.01,"Flat start cap ignored");p[12]=0;
    p[11]=.5;assert(probe(s,.45,0)<.01&&probe(s,-.45,0)>.9,"Draw progress ignored");p[11]=1;
    const line=read(s);p[3]=.9;p[5]=.9;assert(probe(s,0,.675)>.9&&difference(line,read(s))>.02,"Cubic control points ignored");
    const sharp=read(s);p[10]=.06;assert(difference(sharp,read(s))>.001,"Ribbon feather ignored");
    s.animation.tracks={"layers.0.params.11":[[0,.2],[3,1]]};assert(difference(read(s,[0,0],0),read(s,[0,0],3))>.005,"Progress keyframe ignored");
    s.animation.tracks={};p.splice(0,13,-.5,0,1,0,-1,.7,-.5,.7,.08,.08,.002,1,1);
    assert(probe(s,-.548,.6272)>.8,"Flat caps incorrectly clip a returning curve body");
    const mask=state("Circle");mask.layers[0].mask="BezierRibbon";mask.layers[0].maskParams=[...newLayer("BezierRibbon").params];
    const thin=read(mask);mask.layers[0].maskParams[8]=.3;assert(difference(thin,read(mask))>.003,"Extended curve mask width ignored");
    mask.animation.tracks={"layers.0.maskParams.11":[[0,0],[3,1]]};assert(difference(read(mask,[0,0],0),read(mask,[0,0],3))>.003,"Curve mask progress keyframe ignored");
  });
  await check("grid/radial counts and random seeded arrangement are real instances",()=>{
    const s=state("Circle"),a=s.layers[0].arrange;a[0]=1;a[1]=3;a[2]=2;a[4]=.18;
    assert(components(read(s))===6,"3x2 grid does not contain six circles");a[0]=2;a[3]=8;a[5]=.32;a[7]=0;assert(components(read(s))===8,"Radial count ignored");
    a[0]=3;a[3]=16;a[9]=.4;a[10]=90;const random=read(s);assert(equal(random,read(s)),"Same seed changes placement");a[11]=7;assert(difference(random,read(s))>.01,"Random seed ignored");
    s.layers[0]=newLayer("Leaf");s.layers[0].arrange[0]=2;s.layers[0].arrange[3]=7;const outward=read(s);s.layers[0].arrange[7]=0;assert(difference(outward,read(s))>.005,"Radial orientation ignored");
    s.layers[0]=newLayer("FBM");s.layers[0].arrange[0]=1;const source=read(s);s.layers[0].uv[2]=.2;assert(difference(source,read(s))>.001,"Source UV ignored");
  });
  await check("arrangements include masks, animated modes/counts, normals, alpha and seamless wrapping",async()=>{
    const s=state("Leaf"),l=s.layers[0];l.arrange[0]=2;l.arrange[3]=8;l.arrange[4]=.4;l.arrange[13]=.42;l.arrange[8]=.2;l.arrange[9]=.3;l.arrange[10]=40;
    l.mask="Circle";l.maskParams=[...newLayer("Circle").params];l.maskArrange[0]=1;l.maskArrange[1]=3;l.maskArrange[2]=2;l.maskArrange[4]=.7;
    const masked=read(s);l.mask="";assert(difference(masked,read(s))>.005,"Independent arranged mask ignored");l.mask="Circle";
    s.output.alpha=true;s.output.seamless=true;
    s.animation.tracks={"layers.0.arrange.3":[[0,4],[3,12]]};
    for(const mode of [0,1,2,3]){s.output.mode=mode;s.output.channels=[0,2,3,0];assert(equal(read(s,[0,0],1.5),read(s,[1,-1],1.5)),`Arranged output seam in mode ${mode}`);await pause();}
    s.output.mode=1;assert(difference(read(s,[0,0],0),read(s,[0,0],3))>.001,"Count animation ignored");
    const toggled=state("Circle");toggled.animation.tracks={"layers.0.arrange.0":[[0,0],[3,1]]};assert(components(read(toggled,[0,0],3))===16,"Animated off-to-grid mode did not allocate sources");
    const multiple=state("Circle");multiple.layers=[newLayer("Circle"),newLayer("Leaf"),newLayer("BezierRibbon")];
    multiple.output.seamless=true;multiple.output.mode=2;
    for(const layer of multiple.layers){layer.arrange[0]=2;layer.arrange[3]=5;layer.arrange[4]=.4;layer.arrange[5]=.25;layer.mask="Circle";layer.maskParams=[...newLayer("Circle").params];layer.maskArrange[0]=1;layer.maskArrange[1]=2;layer.maskArrange[2]=2;layer.maskArrange[4]=.5;layer.blend=1;layer.opacity=.5;}
    assert(equal(read(multiple),read(multiple,[1,1])),"Six source textures or combined normal pass failed");
  });
  await check("diagonal grid has half-row staggering, even seamless rows, mask and mode animation",()=>{
    const s=state("Circle"),l=s.layers[0],a=l.arrange;
    a[0]=4;a[1]=3;a[2]=4;a[4]=.10;a[5]=.5;s.output.seamless=true;
    let phase="initial diagonal";try {
    const diagonal=read(s);
    const at=(pixels,x,y)=>pixels[(Math.min(127,Math.floor((1-y)*128))*128+Math.min(127,Math.floor(x*128)))*4];
    for(let row=0;row<4;row++)for(let col=0;col<3;col++){
      const x=((col+.5+(row%2)*.5)/3)%1,y=(row+.5)/4;
      assert(at(diagonal,x,y)>.8,"Missing diagonal cell "+col+","+row);
    }
    assert(at(diagonal,1/6,3/8)<.05,"Alternate row was not shifted");
    assert(equal(diagonal,read(s,[1,-1])),"Diagonal seam mismatch");
    phase="odd row snap";a[2]=3;const odd=read(s);a[2]=4;assert(equal(odd,read(s)),"Odd rows were not snapped to even");
    phase="mode animation";s.animation.tracks={"layers.0.arrange.0":[[0,1],[3,4]]};
    assert(difference(read(s,[0,0],0),read(s,[0,0],3))>.005,"Diagonal mode animation ignored");
    s.animation.tracks={};l.arrange[0]=0;l.params[0]=2;
    l.mask="Circle";l.maskParams=[...newLayer("Circle").params];l.maskArrange=[...a];l.maskArrange[0]=4;
    phase="mask only";const masked=read(s);l.maskArrange[0]=1;
    assert(difference(masked,read(s))>.005,"Diagonal mask arrangement ignored");
    }catch(error){throw new Error(phase+": "+error.message);}
  });
  await check("golden-angle spiral count, controls, mask, animation and repeat",()=>{
    const s=state("Circle"),l=s.layers[0],a=l.arrange;
    a[0]=5;a[3]=21;a[4]=.055;a[5]=.36;
    a.push(137.507764,0,1,0);
    a[3]=256;a[4]=.021;
    assert(components(read(s))===256,"256 spiral instances missing");
    s.animation.tracks={"layers.0.arrange.3":[[0,64],[3,256]]};
    assert(components(read(s,[0,0],0))===64&&components(read(s,[0,0],3))===256,"256 count animation clamped");
    s.animation.tracks={};a[3]=21;a[4]=.055;
    const base=read(s);assert(components(base)===21,"Spiral instance count incorrect");
    for(const [slot,value] of [[16,100],[17,.6],[18,2]]){
      const old=a[slot];a[slot]=value;assert(difference(base,read(s))>.001,"Spiral control ignored: "+slot);a[slot]=old;
    }
    s.animation.tracks={"layers.0.arrange.16":[[0,110],[3,150]]};
    assert(difference(read(s,[0,0],0),read(s,[0,0],3))>.001,"Spiral angle animation ignored");
    s.animation.tracks={"layers.0.arrange.0":[[0,0],[3,5]]};
    assert(components(read(s,[0,0],3))===21,"Animated spiral mode failed");s.animation.tracks={};
    l.type="Leaf";l.params=[...newLayer("Leaf").params];a[4]=.14;
    const fixed=read(s);a[19]=1;const outward=read(s);a[19]=2;
    assert(difference(fixed,outward)>.001&&difference(outward,read(s))>.001,"Spiral orientation ignored");
    s.output.seamless=true;a[18]=3;a[4]=.7;
    assert(equal(read(s),read(s,[1,-1])),"Spiral periodic repeat failed");
    s.output.seamless=false;l.type="Circle";l.params=[...newLayer("Circle").params];l.params[0]=2;
    l.mask="Leaf";l.maskParams=[...newLayer("Leaf").params];l.maskArrange=[...a];l.maskArrange[4]=.12;a[0]=0;
    const mask=read(s);l.maskArrange[16]=90;assert(difference(mask,read(s))>.005,"Mask-only spiral ignored");
    l.maskArrange[3]=256;l.maskArrange[4]=.021;assert(read(s).some((v,i)=>i%4===0&&v>.1),"256 mask instances missing");
    l.maskArrange[3]=1;assert(read(s).every(Number.isFinite),"Single instance produced invalid pixels");
  });
  await check("spiral 64/256 synchronous draw benchmark",async()=>{
    const s=state("Leaf"),a=s.layers[0].arrange;a[0]=5;a[5]=.38;a.push(137.507764,0,1,2);
    const timings=[];
    for(const size of [512,1024])for(const count of [64,256]){
      a[3]=count;a[4]=.65/Math.sqrt(count);
      const draw=()=>renderer.draw(s,size,size,{read:true,float:renderer.float,time:0});
      draw();const samples=[];
      for(let i=0;i<3;i++){const start=performance.now();const pixels=draw();samples.push(performance.now()-start);assert(pixels.every(Number.isFinite),"Invalid benchmark output");await pause();}
      samples.sort((a,b)=>a-b);timings.push({size,count,medianMs:Math.round(samples[1]*10)/10});
    }
    checks.push({name:"spiral timings (CPU + submission + GPU completion + readback; 3 warm samples)",passed:true,timings});
  });
  for(const sample of arrangementSamples())await check(sample.title+" table layout, mask, animation, normals and repeat",async()=>{
    const s=structuredClone(sample.state),l=s.layers[0],a=l.arrange;s.output.mode=1;
    const base=read(s);assert(base.some((v,i)=>i%4===0&&v>.1)&&base.every(Number.isFinite),"Blank or invalid layout");
    assert(renderer.lastArrangementCounts[0]>0&&renderer.lastArrangementCounts[0]<=256,"Invalid instance count");
    const slot={6:23,7:11,8:34,9:35,10:34,11:38,12:40}[a[0]],old=a[slot];
    a[slot]=({6:-.9,7:8,8:50,9:5,10:50,11:1,12:1})[a[0]];
    assert(difference(base,read(s))>.001,"Layout parameter ignored");a[slot]=old;
    s.animation.tracks={"layers.0.arrange.6":[[0,0],[3,33]]};assert(difference(read(s,[0,0],0),read(s,[0,0],3))>.001,"Animation ignored");s.animation.tracks={};
    s.output.seamless=true;assert(equal(read(s),read(s,[1,-1])),"Repeat seam mismatch");
    s.output.mode=2;assert(read(s).every(Number.isFinite),"Normal pass invalid");s.output.mode=1;s.output.seamless=false;
    l.mask="Circle";l.maskParams=[...newLayer("Circle").params];l.maskArrange=[...a];l.arrange=[...newLayer("Circle").arrange];l.type="Circle";l.params=[...newLayer("Circle").params];l.params[0]=2;
    const mask=read(s);assert(renderer.lastArrangementCounts[3]>0&&mask.some((v,i)=>i%4===0&&v>.1),"Mask-only layout failed");
    l.maskArrange[6]=39;assert(difference(mask,read(s))>.001,"Mask rotation ignored");
    await pause();
  });
  await check("six table sources, density parameter animation and 256 table benchmark",async()=>{
    const samples=arrangementSamples(),s=structuredClone(samples[0].state);
    s.layers=samples.slice(0,3).map((sample,i)=>{const l=structuredClone(sample.state.layers[0]);l.mask="Circle";l.maskParams=[...newLayer("Circle").params];l.maskArrange=[...samples[i+3].state.layers[0].arrange];l.blend=1;return l;});
    s.output.mode=3;s.output.channels=[0,2,3,0];assert(read(s).every(Number.isFinite),"Six table source channel output invalid");
    const d=structuredClone(samples.at(-1).state);d.animation.tracks={"layers.0.arrange.42":[[0,.2],[3,1.2]]};
    assert(difference(read(d,[0,0],0),read(d,[0,0],3))>.001,"Density parameter keyframe ignored");
    const bench=structuredClone(samples[3].state);bench.layers[0].arrange[3]=256;bench.layers[0].arrange[4]=.025;
    const times=[];renderer.draw(bench,512,512,{read:true,float:renderer.float});
    for(let i=0;i<3;i++){const start=performance.now();const pixels=renderer.draw(bench,512,512,{read:true,float:renderer.float});times.push(performance.now()-start);assert(pixels.every(Number.isFinite),"Table benchmark invalid");await pause();}
    times.sort((a,b)=>a-b);checks.push({name:"256 table instances at 512 including CPU and readback",passed:true,timings:{medianMs:Math.round(times[1]*10)/10}});
  });
  await check("unified scatter zero spacing and ring coverage",async()=>{
    const s=structuredClone(arrangementSamples()[1].state),a=s.layers[0].arrange;
    a[32]=0;a[3]=256;assert(read(s).every(Number.isFinite),"Zero spacing invalid");
    assert(renderer.lastArrangementCounts[0]===256,"Zero spacing lost instances");
    const ring=structuredClone(arrangementSamples()[2].state);ring.layers[0].arrange[33]=1;
    const full=read(ring);ring.layers[0].arrange[15]=.5;
    assert(difference(full,read(ring))>.001,"Ring coverage ignored");
  });
  return checks;
}
