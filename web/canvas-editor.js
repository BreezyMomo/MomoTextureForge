import {find} from './tree-model.js';
import {selectionRegions} from './tree-view.js';
import {BY_ID} from './catalog.js';
import {contains,sub,moveTransform,pivotTransform,rotateTransform,resizeTransform,bounds,snapMove} from './canvas-transform.js';

const handles=[[0,0],[.5,0],[1,0],[1,.5],[1,1],[.5,1],[0,1],[0,.5]];
export function createCanvasEditor(surface,api){
 const doc=surface.ownerDocument,ns='http://www.w3.org/2000/svg';
 const svg=doc.createElementNS(ns,'svg');svg.id='canvas-controls';svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-label','画布编辑控制点');surface.append(svg);
 const toolbar=doc.querySelector('.tree-toolbar'),button=(id,text,fn)=>{const b=doc.createElement('button');b.id=id;b.textContent=text;b.onclick=fn;return b;};
 let mode='transform',scope=null,activeCopy=0,gesture=null,space=false,hover=false,snap=true,guides=[],cycle=null,menu=null;
 const transform=button('canvas-transform','选择 / 变换',()=>setMode('transform')),pivot=button('canvas-pivot','编辑轴心',()=>setMode('pivot')),snapping=button('canvas-snap','吸附',()=>{snap=!snap;snapping.setAttribute('aria-pressed',String(snap));});
 toolbar.prepend(transform,pivot,snapping);snapping.setAttribute('aria-pressed','true');
 const getScope=()=>find(api.project().root,scope)?.node??api.project().root;
 const regionList=id=>selectionRegions(api.project(),id,api.time(),{solo:api.solo(),records:api.records}).regions;
 const hitContains=(id,region,p)=>contains(region,p,BY_ID.get(find(api.project().root,id)?.node.type)?.definition.renderPadding??0);
 function setMode(next){api.leaveOtherTools();mode=next;transform.setAttribute('aria-pressed',String(mode==='transform'));pivot.setAttribute('aria-pressed',String(mode==='pivot'));draw();}
 function enabled(){return !api.blocked()&&!space;}
 function point(e){const b=surface.getBoundingClientRect();return [(e.clientX-b.left)/Math.max(1,b.width),1-(e.clientY-b.top)/Math.max(1,b.height)];}
 function elements(){const all=[];for(const n of api.nodes())for(const [copy,r]of regionList(n.id).entries())all.push({id:n.id,copy,...r});return all;}
 function activeRegions(){const items=elements(),primary=api.primary();return items.map(r=>({...r,active:r.id===primary&&r.copy===Math.min(activeCopy,items.filter(x=>x.id===primary).length-1)}));}
 function add(tag,attrs){const e=doc.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);return e;}
 const screen=p=>[p[0]*1000,(1-p[1])*1000];
 function draw(){
  transform.setAttribute('aria-pressed',String(enabled()&&mode==='transform'));pivot.setAttribute('aria-pressed',String(enabled()&&mode==='pivot'));
  svg.replaceChildren();if(!enabled())return;const rs=activeRegions(),rect=surface.getBoundingClientRect(),sx=1000/Math.max(1,rect.width),sy=1000/Math.max(1,rect.height);
  for(const r of rs){add('polygon',{points:r.corners.map(screen).map(p=>p.join(',')).join(' '),class:'canvas-region'+(r.active?' active':''),'data-copy':r.copy});
   if(!r.active||api.nodes().length!==1)continue;
   if(mode==='pivot'){const p=screen(r.pivot);add('ellipse',{cx:p[0],cy:p[1],rx:9*sx,ry:9*sy,class:'canvas-handle pivot-handle','data-action':'pivot',tabindex:0,'aria-label':'拖动轴心（保持图形位置）'});continue;}
   for(const [i,h]of handles.entries()){const p=screen(r.point(h));add('rect',{x:p[0]-4*sx,y:p[1]-4*sy,width:8*sx,height:8*sy,class:'canvas-handle','data-action':'resize','data-handle':i,'aria-label':'调整区域 '+i});}
   const top=screen(r.point([.5,1])),center=screen(r.center),dx=(top[0]-center[0])/sx,dy=(top[1]-center[1])/sy,l=Math.hypot(dx,dy)||1,p=[top[0]+dx/l*25*sx,top[1]+dy/l*25*sy];
   add('path',{d:`M${top} L${p}`,class:'canvas-rotation-line'});add('ellipse',{cx:p[0],cy:p[1],rx:6*sx,ry:6*sy,class:'canvas-handle','data-action':'rotate','aria-label':'拖动旋转，Shift 按15度吸附'});
  }
  for(const g of guides)add('path',{d:g.axis===0?`M${g.value*1000},0v1000`:`M0,${(1-g.value)*1000}h1000`,class:'canvas-snap-line'});
  if(gesture?.kind==='marquee'){const a=screen(gesture.start),b=screen(gesture.end??gesture.start);add('rect',{x:Math.min(a[0],b[0]),y:Math.min(a[1],b[1]),width:Math.abs(a[0]-b[0]),height:Math.abs(a[1]-b[1]),class:'canvas-marquee'});}
 }
 function navigation(){
  const nav=doc.getElementById('breadcrumbs');if(getScope().id===api.project().root.id)return;
  nav.prepend(button('canvas-back','← 返回上层',()=>{scope=find(api.project().root,getScope().id)?.parent?.id??null;api.refresh();}),Object.assign(doc.createElement('span'),{textContent:'编辑范围：'+getScope().name+' · '}));
 }
 function candidates(p){
  const nodes=api.solo()?[find(api.project().root,api.primary())?.node].filter(Boolean):getScope().children,found=[];
  for(const n of [...nodes].reverse()){const regions=regionList(n.id);for(let i=regions.length-1;i>=0;i--)if(hitContains(n.id,regions[i],p)){found.push({id:n.id,copy:i,region:regions[i]});break;}}
  return found;
 }
 function hits(p){return candidates(p).filter(c=>api.hit(c.id,p));}
 function choose(e,p){
  const found=hits(p);if(!found.length)return null;
  const same=cycle&&Math.hypot(e.clientX-cycle.x,e.clientY-cycle.y)<5&&JSON.stringify(found.map(c=>c.id))===cycle.ids;
  const index=e.altKey&&same?(cycle.index+1)%found.length:0;cycle={x:e.clientX,y:e.clientY,index,ids:JSON.stringify(found.map(c=>c.id))};return found[index];
 }
 function begin(e,kind,r){
  const rs=api.nodes().map(n=>({id:n.id,region:n.id===r?.id?r.region:regionList(n.id)[0]})).filter(x=>x.region);
  const paths=kind==='move'?['x','y']:kind==='rotate'?['rotation']:kind==='pivot'?['pivotX','pivotY','x','y']:['width','height','x','y'];
  try{api.check(rs.map(x=>x.id),paths);api.begin();gesture={kind,regions:rs,start:point(e),pointer:e.pointerId,handle:handles[+e.target.dataset.handle],moved:false};surface.setPointerCapture?.(e.pointerId);e.preventDefault();}catch(error){api.notify(error.message);}
 }
 surface.addEventListener('pointerdown',e=>{
  if(e.button!==0||!enabled())return;closeMenu();const p=point(e),action=e.target.dataset.action;
  if(action){const r=activeRegions().find(r=>r.active);if(r)begin(e,action,{id:r.id,region:r});return;}
  let hit;try{
   // A node selected in the tree remains directly editable even outside the
   // current group scope. Alt explicitly returns to overlap cycling.
   if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey)for(const n of [...api.nodes()].reverse()){const rs=regionList(n.id),copy=rs.findIndex(r=>hitContains(n.id,r,p));if(copy>=0&&api.hit(n.id,p)){hit={id:n.id,copy,region:rs[copy]};break;}}
   hit??=choose(e,p);
  }catch(error){api.notify('无法选择：'+error.message);return;}
  if(hit){activeCopy=hit.copy;if(e.ctrlKey||e.metaKey||e.shiftKey){api.toggle(hit.id);draw();return;}if(!api.ids().includes(hit.id))api.select([hit.id],hit.id);begin(e,'move',hit);}
  else{gesture={kind:'marquee',start:p,end:p,pointer:e.pointerId,add:e.ctrlKey||e.metaKey||e.shiftKey,previous:api.ids()};surface.setPointerCapture?.(e.pointerId);e.preventDefault();}
 });
 surface.addEventListener('pointermove',e=>{
  if(!gesture)return;const g=gesture,p=point(e);if(g.kind==='marquee'){g.end=p;draw();return;}
  const rect=surface.getBoundingClientRect();if(!g.moved&&Math.hypot((p[0]-g.start[0])*rect.width,(p[1]-g.start[1])*rect.height)<3)return;g.moved=true;
  try{let delta=sub(p,g.start);guides=[];if(g.kind==='move'&&e.shiftKey)delta=Math.abs(delta[0]*rect.width)>Math.abs(delta[1]*rect.height)?[delta[0],0]:[0,delta[1]];
   if(g.kind==='move'&&snap&&!e.altKey){const selected=new Set(api.ids()),targets=[[0,.5,1],[0,.5,1]];for(const n of getScope().children){if(selected.has(n.id)||api.nodes().some(s=>find(s,n.id)))continue;const b=bounds(regionList(n.id));if(b)for(let axis=0;axis<2;axis++)targets[axis].push(b.min[axis],(b.min[axis]+b.max[axis])/2,b.max[axis]);}const result=snapMove(g.regions.map(x=>x.region),delta,targets,[6/Math.max(1,rect.width),6/Math.max(1,rect.height)]);delta=result.delta;guides=result.guides;}
   const changes=g.regions.map(({id,region})=>({id,progress:region.progress,values:g.kind==='move'?moveTransform(region,delta):g.kind==='pivot'?pivotTransform(region,p):g.kind==='rotate'?rotateTransform(region,g.start,p,e.shiftKey):resizeTransform(region,g.start,p,g.handle,e.shiftKey)}));api.apply(changes);api.render();
  }catch(error){cancel();api.notify(error.message);}
 });
 function release(g){if(surface.hasPointerCapture?.(g.pointer))surface.releasePointerCapture(g.pointer);}
 function finish(){if(!gesture)return;const g=gesture;gesture=null;guides=[];release(g);if(g.kind==='marquee'){const min=[Math.min(g.start[0],g.end[0]),Math.min(g.start[1],g.end[1])],max=[Math.max(g.start[0],g.end[0]),Math.max(g.start[1],g.end[1])];const ids=getScope().children.filter(n=>regionList(n.id).some(r=>r.corners.every(p=>p[0]>=min[0]&&p[0]<=max[0]&&p[1]>=min[1]&&p[1]<=max[1]))).map(n=>n.id);api.select([...new Set([...(g.add?g.previous:[]),...ids])]);}else api.end();draw();}
 function cancel(){if(!gesture)return;const g=gesture;gesture=null;guides=[];release(g);if(g.kind!=='marquee')api.cancel();draw();}
 surface.addEventListener('pointerup',finish);surface.addEventListener('pointercancel',cancel);surface.addEventListener('lostpointercapture',()=>{if(gesture)cancel();});
 surface.addEventListener('dblclick',e=>{if(!enabled())return;const n=find(api.project().root,api.primary())?.node;if(n?.kind==='group'){scope=n.id;api.select([]);}});
 function closeMenu(){menu?.remove();menu=null;}
 surface.addEventListener('contextmenu',e=>{if(!enabled())return;e.preventDefault();closeMenu();try{const found=hits(point(e));if(!found.length)return;menu=doc.createElement('div');menu.className='canvas-pick-menu';menu.style.left=e.clientX+'px';menu.style.top=e.clientY+'px';for(const h of found)menu.append(button('',find(api.project().root,h.id).node.name,()=>{activeCopy=h.copy;api.select([h.id],h.id);closeMenu();}));doc.body.append(menu);}catch(error){api.notify(error.message);}});
 surface.addEventListener('pointerenter',()=>hover=true);surface.addEventListener('pointerleave',()=>hover=false);
 doc.addEventListener('keydown',e=>{
  if(surface.hidden||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||api.busy())return;
  if(e.key==='Escape'&&gesture){e.preventDefault();e.stopImmediatePropagation();cancel();return;}
  if(e.key==='Escape'&&menu){e.preventDefault();e.stopImmediatePropagation();closeMenu();return;}
  if(e.code==='Space'&&hover&&!gesture){e.preventDefault();e.stopImmediatePropagation();if(!space){space=true;api.pan(true);draw();}return;}
  if(e.target.closest('#node-animation-editor')||e.target.closest('#global-panel'))return;
  if(e.key==='Escape'&&getScope().id!==api.project().root.id){e.preventDefault();e.stopImmediatePropagation();scope=find(api.project().root,getScope().id)?.parent?.id??null;api.refresh();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();api.select(getScope().children.map(n=>n.id));}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();doc.getElementById('duplicate').click();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='g'){e.preventDefault();doc.getElementById('group-selected').click();}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();doc.getElementById('delete').click();}
 },true);
 function endPan(){if(space){space=false;api.pan(false);draw();}}
 doc.addEventListener('keyup',e=>{if(e.code==='Space')endPan();});window.addEventListener('blur',()=>{cancel();endPan();});
 setMode('transform');return {draw,navigation,interacting:()=>!!gesture,reset(){cancel();scope=null;activeCopy=0;closeMenu();},deactivate(){transform.setAttribute('aria-pressed','false');pivot.setAttribute('aria-pressed','false');draw();}};
}
