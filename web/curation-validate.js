import {TreeRenderer} from './tree-renderer.js';
import {project,node,expandInstances,sanitizeTree} from './tree-model.js';
import {BY_ID} from './catalog.js';
const result=document.getElementById('result'),gallery=document.getElementById('gallery');
document.getElementById('run').onclick=async()=>{
 const logs=[],canvas=document.createElement('canvas'),r=new TreeRenderer(canvas),p=project();
 const assert=(v,msg)=>{if(!v)throw Error(msg);logs.push('PASS '+msg);result.textContent=logs.join('\n');};
 const draw=(n,size=128)=>{p.root.children=[n];return r.draw(p,size,size,{read:true,quality:1,time:.25});};
 const area=pix=>pix.reduce((s,v,i)=>s+(i%4===3?v:0),0)/(pix.length/4);
 const diff=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
 const show=(name,pix,size)=>{const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),image=ctx.createImageData(size,size);image.data.set(pix.map(v=>Math.round(Math.max(0,Math.min(1,v))*255)));ctx.putImageData(image,0,0);const f=document.createElement('figure'),label=document.createElement('figcaption');label.textContent=name;f.append(c,label);gallery.append(f);};
 try{
 gallery.replaceChildren();
 const n=node();n.color={...n.color,mode:'own',fill:'solid',high:'#33aaff'};const base=draw(n),areas={none:area(base)};show('原始',base,128);
 for(const mode of ['dilate','erode','outline']){n.contour={mode,radius:.03};const pix=draw(n);areas[mode]=area(pix);show(mode,pix,128);assert(pix.every(Number.isFinite),mode+' finite');if(mode==='outline')assert(pix[(64*128+64)*4+3]<.001,'outline hollow centre');assert(Math.abs(area(draw(n,256))-area(pix))<.012,mode+' resolution invariant');const round=sanitizeTree(p);assert(diff(r.draw(round,128,128,{read:true,quality:1,time:.25}),pix)<1e-5,mode+' save/load');}
 assert(areas.erode<areas.none&&areas.none<areas.dilate,'erosion < original < dilation');
 assert(Math.abs(areas.outline-(areas.dilate-areas.none))<.001,'outer outline equals alpha difference');
 const group=node('group');group.children=[node(),node()];group.children[0].transform.x=.38;group.children[1].transform.x=.62;group.contour={mode:'outline',radius:.02};const gp=draw(group);show('组合外描边',gp,128);assert(gp[(64*128+64)*4+3]<.001,'group union has no internal outline');
 const arranged=node();arranged.arrange[0]=1;arranged.arrange[1]=2;arranged.arrange[2]=2;arranged.contour={mode:'outline',radius:.015};const before=draw(arranged);expandInstances(p.root,arranged.id,.25);assert(diff(r.draw(p,128,128,{read:true,quality:1,time:.25}),before)<.025,'expanded arrangement applies contour once');
 for(const id of ['IrisBlades','RoundedPolygon','LightningBranch','SlotVent','ArcRing','PieSlice','SunburstRays','CompassTick','Dots','Halftone','RingPulse','ConeGradient','Gear','GearTeeth','LineSegment']){const shape=node('shape',id);if(id==='Dots')shape.params[4]=.5;if(id==='Gear')shape.params[8]=1;const image=draw(shape,192);assert(image.every(Number.isFinite),id+' WebGL');show(BY_ID.get(id).zh,image,192);await new Promise(requestAnimationFrame);}
 const arc=node('shape','ArcRing');arc.params[4]=360;const full=draw(arc);arc.params[4]=180;assert(Math.abs(area(draw(arc))/area(full)-.5)<.025,'arc span is solid half of full circle');arc.params[4]=0;assert(area(draw(arc))<1e-6,'zero arc empty');
 const segment=node('shape','LineSegment');segment.params[2]=segment.params[0];segment.params[3]=segment.params[1];assert(draw(segment).every(Number.isFinite),'zero length segment finite');
 result.textContent='ALL PASS\n'+logs.join('\n');
 }catch(e){result.textContent='FAIL '+e.stack+'\n'+logs.join('\n');}finally{r.destroy();}
};
