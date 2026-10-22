import {messageError} from './message-catalog.js';
import {uiText} from './ui-language.js';
import {intervalProjection} from './animation-intervals.js';
import {find,localClock,pathGet,keyValue,animationType,ANIMATION_ENUMS,ANIMATION_BOOLS,fieldSpec,walk} from './tree-model.js';
import {timeKey} from './animation-values.js';
import {affineClock,recordValue,editKeys,convertTrack,animatablePaths,snapTime,roundTime,sameTime,templateTracks,ANIMATION_TEMPLATES} from './animation-editing.js';
import {animationCurveView} from './animation-curve-view.js';
export function intervalChange(start,end,delta,edge='move'){
 if(edge==='start')return [Math.max(0,Math.min(end-.001,start+delta)),end];
 if(edge==='end')return [start,Math.min(1,Math.max(start+.001,end+delta))];
 const d=Math.max(-start,Math.min(1-end,delta));return [start+d,end+d];
}
// Invert each monotonic piece of the clock, including all loop occurrences.
// Constant spans have one representative marker; discontinuities create no invented keys.
export function mappedKeyTimes(chain,key){
 const unique=list=>[...new Set(list.map(t=>Math.round(t*1e9)/1e9))].sort((a,b)=>a-b);
 const invertEase=(v,ease)=>{if(v<0||v>1)return [];if(ease==='hold')return v===0?[0]:v===1?[1]:[];if(ease!=='smooth')return [v];let lo=0,hi=1;for(let i=0;i<40;i++){const m=(lo+hi)/2;if(m*m*(3-2*m)<v)lo=m;else hi=m;}return [(lo+hi)/2];};
 function parents(n,target){const t=n.timing,span=t.end-t.start,verify=p=>{const v=localClock(t,p);return v.visible&&Math.abs(v.progress-target)<1e-6;};
  if(t.frozen||t.from===t.to||span<=0){const points=[0,t.start,t.end,1].filter(p=>p>=0&&p<=1&&verify(p));return points.length?[points[0]]:[];}
  const wanted=(target-t.from)/(t.to-t.from),progress=[];
  if(t.curve?.length){const keys=t.curve;if(Math.abs(wanted-keys[0][1])<1e-9)progress.push(0);for(let i=1;i<keys.length;i++){const a=keys[i-1],b=keys[i];if(a[1]===b[1]){if(Math.abs(wanted-a[1])<1e-9)progress.push(a[0]);}else for(const u of invertEase((wanted-a[1])/(b[1]-a[1]),t.ease))progress.push(a[0]+u*(b[0]-a[0]));}if(Math.abs(wanted-keys.at(-1)[1])<1e-9)progress.push(keys.at(-1)[0]);}
  else progress.push(...invertEase(wanted,t.ease));
  const raw=[];for(const p of unique(progress)){if(t.loop){for(let cycle=0;cycle<=Math.ceil(t.cycles);cycle++){const q=cycle+(t.pingpong&&cycle%2?1-p:p);if(q>=0&&q<=t.cycles)raw.push(t.start+q/t.cycles*span);}}else if(p<=t.cycles)raw.push(t.start+p/t.cycles*span);}
  if(verify(0))raw.push(t.offset===0?0:t.offset); // Boundary states outside the active interval.
  const result=[];for(const x of raw)for(const k of [-1,0,1]){const p=x-t.offset+k;if(p>=0&&p<=1&&verify(p))result.push(p);}return unique(result);
 }
 let times=[key],dense=false;for(const n of [...chain].reverse()){const next=[];for(const t of times){next.push(...parents(n,t));if(next.length>20000){dense=true;break;}}times=unique(next);}
 // Keep DOM work bounded by distinguishable normalized positions, explicitly signal dense previews.
 if(times.length>2000){const stride=Math.ceil(times.length/2000);times=times.filter((_,i)=>i%stride===0);dense=true;}Object.defineProperty(times,'dense',{value:dense});return times;
}

export function createAnimationWorkspace(host,api){
 let scope=api.getRoot().id,view='keys',filter='all',snap='grid',zoom=1,start=0,signature='',dragging=false,selection=[],clipboard=null,curvePath=null;
 const folded=new Set(),maps=new Map();let extraOpen=false,lastClick=null;
 const el=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(text,fn,title=text)=>{const b=el('button',text);b.type='button';b.title=title;b.setAttribute('aria-label',title);b.onclick=fn;return b;};
 const choice=(name,items,value,fn)=>{const s=el('select');s.setAttribute('aria-label',uiText(name));for(const [v,t]of items){const o=el('option',(String(v).startsWith('params.') ? t : uiText(t)));o.value=v;s.append(o);}s.value=value;s.onchange=()=>fn(s.value);return s;};
 const number=(name,value,fn,min,max,step=.001)=>{const e=el('input');e.type='number';e.step=step;if(min!==undefined)e.min=min;if(max!==undefined)e.max=max;e.value=value;e.setAttribute('aria-label',uiText(name));e.title=uiText(name);e.onchange=()=>{const v=+e.value;if(Number.isFinite(v))fn(v);};return e;};
 const fail=e=>(api.notify??(()=>{}))(e.message??String(e));
 const change=fn=>{try{api.change(fn);signature='';update(true);}catch(e){fail(e);}};
 const resetSelection=()=>{selection=[];signature='';};
 const root=()=>find(api.getRoot(),scope)?.node??api.getRoot();
 const progress=()=>api.progressNode(scope);
 const seek=t=>{api.seekNode(scope,roundTime(t));};
 const pos=t=>(t-start)*zoom*100;
 const active=(id,path,time)=>selection.some(s=>s.id===id&&s.path===path&&sameTime(s.time,time));
 const pick=(id,path,time,add=false)=>{if(!add)selection=[];const i=selection.findIndex(s=>s.id===id&&s.path===path&&sameTime(s.time,time));if(i>=0&&add)selection.splice(i,1);else if(i<0)selection.push({id,path,time});curvePath={id,path};};
 function enter(id){const next=find(api.getRoot(),id)?id:api.getRoot().id,t=api.progressNode(next);scope=next;selection=[];zoom=1;start=0;signature='';api.selectNode(scope);seek(t);update(true);}
 function mapFor(id){return maps.get(id)?.affine;}
 const snapAt=(t,exclude=[])=>snapTime(t,snap,[...host.querySelectorAll('.animation-key:not(.mapped)')].filter(k=>!exclude.some(s=>s.id===k.dataset.id&&s.path===k.dataset.path&&sameTime(s.time,+k.dataset.time))).map(k=>+k.dataset.view),api.frames?.()??30,.008/zoom);
 const begin=()=>{dragging=true;api.beginGesture?.();};
 const preview=fn=>{if(api.previewGesture)api.previewGesture(fn);else fn();};
 const end=()=>{dragging=false;api.endGesture?.();signature='';update(true);};
 const cancel=()=>{dragging=false;api.cancelGesture?.();signature='';update(true);};
 function deleteSelected(){if(!selection.length)return;const edits=selection.map(s=>({...s,from:s.time,remove:true}));change(()=>editKeys(api.getRoot(),edits));resetSelection();update(true);}
 function copy(){if(!selection.length)return;const items=selection.map(s=>{const n=find(api.getRoot(),s.id)?.node,t=n?.tracks[s.path],key=t?.keys.find(k=>sameTime(k[0],s.time)),m=mapFor(s.id);return key&&m?{...s,value:key[1],segment:t.segments?.[timeKey(s.time)],mode:t.mode,type:animationType(n,s.path),view:m.inverse(s.time)}:null;}).filter(Boolean);if(!items.length)return;const first=Math.min(...items.map(s=>s.view));clipboard=items.map(s=>({...s,offset:s.view-first}));signature='';update(true);}
 function paste(){if(!clipboard?.length)return;try{const ids=new Set(clipboard.map(s=>s.id)),retarget=ids.size===1&&!ids.has(api.getNode().id),dest=api.getNode();
  const edits=clipboard.map(s=>{const id=retarget?dest.id:s.id,n=find(api.getRoot(),id)?.node,m=mapFor(id);if(!n||!m||!fieldSpec(n,s.path)||animationType(n,s.path)!==s.type)throw messageError("timeline.trackTypesAreIncompatibleOrTimeCannotBeInvertedEnterThe");return {id,path:s.path,to:m.forward(progress()+s.offset),value:s.value,segment:s.segment};});
  // Missing tracks are created transactionally by the application's undo boundary.
  change(()=>{for(const e of edits){const n=find(api.getRoot(),e.id).node,s=clipboard.find(s=>s.path===e.path);n.tracks[e.path]??={mode:s.mode,ease:s.type==='discrete'?'hold':'linear',keys:[],...(s.type!=='number'?{type:s.type}:{})};}selection=editKeys(api.getRoot(),edits);});
 }catch(e){fail(e);}}
 function moveSelection(delta){try{const edits=selection.map(s=>{const m=mapFor(s.id);if(!m)throw messageError("timeline.enterTheNodeSLocalTimeToEdit");return {...s,from:s.time,to:m.forward(m.inverse(s.time)+delta)};});change(()=>{selection=editKeys(api.getRoot(),edits);});}catch(e){fail(e);}}
 function trackTools(n,path,left){const t=n.tracks[path];left.append(button('＋',()=>change(()=>{recordValue(n,path,api.progressNode(n.id),api.value?.(n.id,path)??pathGet(n,path));}), (uiText("timeline.addAtCurrentProgress") + api.label(path,n))),button(t.muted?'○':'●',()=>change(()=>{if(t.muted)delete t.muted;else t.muted=true;}),(uiText("timeline.enableTrack") + api.label(path,n))),button('×',()=>{if(api.confirm?.(((uiText("library.delete") + api.label(path,n)) + uiText("timeline.andItsEntireAnimationTrack")))===false)return;change(()=>delete n.tracks[path]);},(uiText("timeline.deleteTrack") + api.label(path,n))));}
 function update(force=false){
 const r=root();scope=r.id;selection=selection.filter(s=>find(api.getRoot(),s.id)?.node.tracks[s.path]?.keys.some(k=>sameTime(k[0],s.time)));
 const sig=JSON.stringify([scope,view,filter,snap,zoom,start,api.getNode().id,r,selection,api.editMode?.(),curvePath,!!clipboard]);
 if(!dragging&&(!api.isInteracting?.()||force)&&(force||sig!==signature)){
 signature=sig;host.replaceChildren();host.className='animation-workspace';host.tabIndex=0;maps.clear();
 const nav=el('div','','animation-tools');host.append(nav);nav.append(el('strong',uiText("timeline.editingScope")));
 const ancestry=[];let f=find(api.getRoot(),scope);while(f){ancestry.unshift(f.node);f=f.parent?find(api.getRoot(),f.parent.id):null;}
 for(const n of ancestry)nav.append(button((api.isVirtualRoot?.(n) ? uiText("timeline.allContent") : n.name),()=>enter(n.id)));
 nav.append(button(uiText("timeline.returnToCanvasTime"),()=>{scope=api.getRoot().id;api.returnWork();resetSelection();update(true);}),button(uiText("timeline.enterSelectedNode"),()=>enter(api.getNode().id)),button(uiText("editor.keyframe"),()=>{view='keys';signature='';update(true);}),button(uiText("timeline.curves"),()=>{view='curves';if(!curvePath){const n=api.getNode(),path=Object.keys(n.tracks)[0];if(path)curvePath={id:n.id,path};}if(curvePath&&scope!==curvePath.id){const t=api.progressNode(curvePath.id);scope=curvePath.id;api.selectNode(scope);seek(t);selection=selection.filter(s=>s.id===scope);}signature='';update(true);}));
 const tools=el('div','','animation-tools');host.append(tools);
 const mode=api.editMode?.()??'normal';for(const [v,title]of [['record',"editor.record"],['base',"editor.editBaseValue"]]){const b=button(uiText(title),()=>api.setEditMode?.(mode===v?'normal':v));b.title=(v==='record' ? (mode==='record' ? uiText("editor.stopRecordingAndReturnToNormalEditing") : uiText("editor.recordParameterChangesAsKeyframes")) : (mode==='base' ? uiText("editor.exitBaseValueEditing") : uiText("editor.editBaseValuesRecordingOff")));b.className=v===mode?(v==='record'?'active recording':'active'):'';b.setAttribute('aria-pressed',String(v===mode));tools.append(b);}
 tools.append(choice(uiText("timeline.trackFilter"),[['all',"timeline.allNodes"],['selected',"timeline.selectionSubtree"],['animated',"timeline.animatedNodes"]],filter,v=>{filter=v;signature='';update(true);}),choice(uiText("timeline.timeSnapping"),[['grid',"timeline.snapToGrid"],['keys',"timeline.snapToKeyframesOnly"],['frames',"timeline.snapToExportFPS"],['off',"timeline.noSnapping"]],snap,v=>{snap=v;signature='';update(true);}),number(uiText("timeline.timelineZoom"),zoom,v=>{zoom=Math.max(1,Math.min(20,v));start=Math.min(start,1-1/zoom);signature='';update(true);},1,20,.5));
 if(zoom>1)tools.append(number(uiText("timeline.timelineStart"),start,v=>{start=Math.max(0,Math.min(1-1/zoom,v));signature='';update(true);},0,1-1/zoom,.01));
 const cursor=number(uiText("editor.scopeProgress"),progress(),seek,0,1);cursor.dataset.animationCursor='true';tools.append(cursor);
 const editbar=el('div','','animation-tools');host.append(editbar);editbar.append(button(uiText("timeline.copy"),copy),button(uiText("timeline.paste"),paste),button(uiText("timeline.deleteKeyframe"),deleteSelected,uiText("timeline.deleteSelectedKeyframes")),el('span',(selection.length + uiText("timeline.keyframesSelectedShiftToMultiselectDragEmptySpaceToBoxSelect"))));
 const selected=api.getNode();if(!api.isVirtualRoot?.(selected)){const extras=el('details','','animation-extra');extras.append(el('summary',uiText("timeline.addTrackAnimationTemplate")));const extraTools=el('div','','animation-tools');extras.append(extraTools);host.append(extras);extras.open=extraOpen;extras.ontoggle=()=>{extraOpen=extras.open;};
 const paths=animatablePaths(selected),add=choice(uiText("timeline.addAnimatedProperty"),paths.map(p=>[p,api.label(p,selected)]),paths[0],()=>{});extraTools.append(add,button(uiText("timeline.addTrack"),()=>change(()=>{recordValue(selected,add.value,api.progressNode(selected.id),api.value?.(selected.id,add.value)??pathGet(selected,add.value));curvePath={id:selected.id,path:add.value};})));
 const templates=choice(uiText("timeline.animationTemplate"),ANIMATION_TEMPLATES,'pulse',()=>{});extraTools.append(templates,button(uiText("timeline.applyTemplate"),()=>{const tracks=templateTracks(selected,templates.value);if(Object.keys(tracks).some(p=>selected.tracks[p])&&api.confirm?.(uiText("timeline.thisTemplateReplacesTracksForMatchingParametersAndRetainsOtherTracks"))===false)return;change(()=>{Object.assign(selected.tracks,tracks);selected.animationEnabled=true;});}));
 }
 const scroll=el('div','','animation-tracks');host.append(scroll);
 function row(title,depth=0){const row=el('div','','animation-track'),left=el('div','','animation-track-name'),lane=el('div','','animation-lane');left.style.paddingLeft=(6+depth*12)+'px';left.append(title);row.append(left,lane);scroll.append(row);const head=el('div','','animation-playhead');lane.append(head);return {left,lane,row};}
 const ruler=row(el('span',uiText("timeline.currentScope")));ruler.row.classList.add('animation-ruler');for(let i=0;i<=10;i++){const tick=el('span',(start+i/10/zoom).toFixed(2),'animation-tick');tick.style.left=i*10+'%';ruler.lane.append(tick);}
 const at=(e,lane)=>start+(e.clientX-lane.getBoundingClientRect().left)/Math.max(1,lane.getBoundingClientRect().width)/zoom;
 ruler.lane.onpointerdown=e=>{dragging=true;ruler.lane.setPointerCapture?.(e.pointerId);seek(snapAt(at(e,ruler.lane)));ruler.lane.onpointermove=e=>seek(snapAt(at(e,ruler.lane)));ruler.lane.onpointerup=()=>{ruler.lane.onpointermove=null;dragging=false;signature='';update(true);};ruler.lane.onpointercancel=cancel;};
 function visit(n,chain,depth){
 const affine=affineClock(chain),timeCache=new Map();const keyTimes=t=>{if(!timeCache.has(t))timeCache.set(t,mappedKeyTimes(chain,t));return timeCache.get(t);};maps.set(n.id,{affine,chain});const selectedTree=find(selected,n.id),ancestor=find(n,selected.id);
 const anyAnimated=x=>Object.keys(x.tracks).length||x.children.some(anyAnimated)||x.mask&&anyAnimated(x.mask);
 if(filter==='selected'&&!selectedTree&&!ancestor)return;if(filter==='animated'&&!anyAnimated(n))return;
 const name=button(n.name,()=>{api.selectNode(n.id);signature='';update(true);});const nr=row(name,depth);nr.row.dataset.node=n.id;if(n.id===selected.id)nr.row.classList.add('selected');
 nr.left.prepend(button(folded.has(n.id)?'▸':'▾',()=>{folded.has(n.id)?folded.delete(n.id):folded.add(n.id);signature='';update(true);}));nr.left.append(button(uiText("timeline.enter"),()=>enter(n.id),((uiText("canvas.enterGroupPrefix") + n.name) + uiText("timeline.localTime"))));
 const parent=find(api.getRoot(),n.id)?.parent,enterParent=()=>{if(parent)enter(parent.id);};
 if(!chain.length){const bar=el('div',uiText("timeline.nodeLocalTime"),'animation-interval context');bar.style.left=pos(0)+'%';bar.style.width=zoom*100+'%';bar.title=uiText("timeline.nodeSLocalScopeEnterItsParentToAdjustThePlayback");bar.ondblclick=enterParent;nr.lane.append(bar);if(parent)nr.left.append(button(uiText("timeline.parent"),enterParent,uiText("timeline.enterParentToEditPlaybackInterval")));}
 else {
 const projection=intervalProjection(chain.slice(0,-1),n.timing.start,n.timing.end),label=n.timing.start.toFixed(2)+' — '+n.timing.end.toFixed(2);
 if(chain.length>1)nr.left.append(button(uiText("timeline.parent"),enterParent,uiText("timeline.enterParentToEditPlaybackInterval")));
 if(!projection.ranges.length){const hint=button((projection.dense ? uiText("timeline.repeatsTooDenseEditInParent") : uiText("timeline.intervalOutsideThisScopeEditInParent")),enterParent);hint.className='animation-interval-hint';nr.lane.append(hint);}
 for(const [from,to]of projection.ranges){
 const bar=el('div',(projection.editable ? label : (uiText("timeline.readOnly") + label)),'animation-interval'+(projection.editable?'':' readonly'));bar.dataset.node=n.id;bar.setAttribute('aria-label',((n.name + uiText("timeline.playbackInterval")) + (projection.editable ? '' : uiText("library.readOnlySuffix"))));bar.setAttribute('aria-readonly',String(!projection.editable));
 bar.title=(projection.editable ? ((uiText("timeline.parentProgress") + label) + uiText("timeline.dragToMoveResizeEndsToRetimeDoubleClickToEnter")) : ((uiText("timeline.intervalProjectedThroughParentLoopingCurvesOrClippingParentProgress") + label) + uiText("timeline.doubleClickToEditInParent")));
 const place=(a,b)=>{bar.style.left=pos(a)+'%';bar.style.width=Math.max(0,b-a)*zoom*100+'%';};place(from,to);nr.lane.append(bar);bar.ondblclick=projection.editable?()=>enter(n.id):enterParent;
 if(!projection.editable)continue;
 const mapping=projection.map;
 for(const edge of ['start','end']){const side=projection.reversed?(edge==='start'?'end':'start'):edge,h=el('span','','animation-handle '+side);h.dataset.edge=edge;bar.append(h);}
 bar.onpointerdown=e=>{e.stopPropagation();begin();bar.setPointerCapture?.(e.pointerId);const x=e.clientX,a=n.timing.start,b=n.timing.end,edge=e.target.dataset.edge??'move',anchor=edge==='end'?b:a;let moved=false,next=[a,b];
 bar.onpointermove=e=>{if(Math.abs(e.clientX-x)<3&&!moved)return;const delta=(e.clientX-x)/Math.max(1,nr.lane.getBoundingClientRect().width||nr.lane.clientWidth)/zoom,view=mapping.inverse(anchor),sd=mapping.forward(snapAt(view+delta))-anchor;next=intervalChange(a,b,sd,edge);moved=true;preview(()=>{n.timing.start=next[0];n.timing.end=next[1];});const mapped=next.map(mapping.inverse);place(Math.min(...mapped),Math.max(...mapped));};
 bar.onpointerup=()=>{bar.onpointermove=null;if(!moved){dragging=false;api.discardGesture?.();return;}if(api.endGesture)end();else{dragging=false;change(()=>{n.timing.start=next[0];n.timing.end=next[1];});update(true);}};bar.onpointercancel=cancel;};
 }
 }
 if(folded.has(n.id))return;
 for(const [path,t]of Object.entries(n.tracks)){
 const title=api.label(path,n),tr=row(button(title,()=>{api.selectNode(n.id);curvePath={id:n.id,path};signature='';update(true);}),depth+1);tr.row.dataset.track=n.id+'|'+path;if(t.muted)tr.row.classList.add('muted');trackTools(n,path,tr.left);
 for(const key of t.keys){const times=affine?[affine.inverse(key[0])]:keyTimes(key[0]);if(times.dense&&!tr.left.dataset.dense){tr.left.dataset.dense='true';tr.left.append(el('small',uiText("timeline.repeatsTooDenseEnterLocalTimeToViewAllSourceKeys")));}for(const vt of times){if(vt<0||vt>1||vt<start-1e-6||vt>start+1/zoom+1e-6)continue;
 const k=button('◆',()=>{},((((title + uiText("timeline.keyframe")) + key[0].toFixed(3)) + uiText("timeline.value")) + key[1]));k.className='animation-key'+(affine?'':' mapped');k.style.left=pos(vt)+'%';Object.assign(k.dataset,{id:n.id,path,time:key[0],view:vt});k.setAttribute('aria-pressed',String(active(n.id,path,key[0])));k.title=(affine ? uiText("timeline.dragKeyframesShiftToMultiselect") : uiText("timeline.loopedOrNonlinearMappingDoubleClickToEditInNodeLocal"));tr.lane.append(k);
 k.onclick=e=>{if(!affine){const stamp=n.id+'|'+path+'|'+key[0],now=Date.now();if(lastClick?.stamp===stamp&&now-lastClick.at<450){enter(n.id);pick(n.id,path,key[0]);seek(key[0]);update(true);lastClick=null;return;}lastClick={stamp,at:now};api.selectNode(n.id);seek(vt);return;}pick(n.id,path,key[0],e.shiftKey||e.ctrlKey||e.metaKey);api.selectNode(n.id);seek(vt);signature='';update(true);};k.ondblclick=()=>{enter(n.id);pick(n.id,path,key[0]);seek(key[0]);update(true);};
 if(!affine)continue;
 k.onpointerdown=e=>{e.stopPropagation();const initialSelection=[...selection],addClick=e.shiftKey||e.ctrlKey||e.metaKey;if(!active(n.id,path,key[0]))pick(n.id,path,key[0],e.shiftKey||e.ctrlKey||e.metaKey);begin();k.setPointerCapture?.(e.pointerId);const originals=selection.map(s=>({...s})),x=e.clientX;let moved=false,current=originals,valid=true;
 k.onpointermove=e=>{if(Math.abs(e.clientX-x)<3&&!moved)return;moved=true;const delta=snapAt(vt+(e.clientX-x)/Math.max(1,tr.lane.getBoundingClientRect().width)/zoom,originals)-vt;
 try{const edits=originals.map((s,i)=>{const m=mapFor(s.id);if(!m)throw messageError("timeline.nonlinearlyMappedKeyframesCannotBeDraggedDirectly");return {...s,from:current[i].time,to:m.forward(m.inverse(s.time)+delta)};});preview(()=>{current=editKeys(api.getRoot(),edits);selection=current;});valid=true;for(const [i,s]of originals.entries()){const dom=[...host.querySelectorAll('.animation-key')].find(d=>d.dataset.id===s.id&&d.dataset.path===s.path&&sameTime(+d.dataset.time,s.time));if(dom)dom.style.left=pos(mapFor(s.id).inverse(current[i].time))+'%';}seek(roundTime(vt+delta));}catch(error){valid=false;fail(error);}};
 k.onpointerup=()=>{k.onpointermove=null;if(moved){k.onclick=null;if(valid)end();else{selection=originals;cancel();}}else{dragging=false;api.discardGesture?.();k.onclick=null;selection=initialSelection;pick(n.id,path,key[0],addClick);const stamp=n.id+'|'+path+'|'+key[0],now=Date.now();if(lastClick?.stamp===stamp&&now-lastClick.at<450){enter(n.id);pick(n.id,path,key[0]);seek(key[0]);lastClick=null;}else{lastClick={stamp,at:now};api.selectNode(n.id);seek(vt);}signature='';update(true);}};k.onpointercancel=()=>{selection=originals;cancel();};};
 }}
 }
 for(const child of [...n.children,...(n.mask?[n.mask]:[])])visit(child,[...chain,child],depth+1);
 }
 if(api.isVirtualRoot?.(r))for(const n of r.children)visit(n,[n],0);else visit(r,[],0);
 // Rectangle selection across parameter lanes. Alt scrubs without selecting.
 scroll.onpointerdown=e=>{if(!e.target.classList?.contains('animation-lane')||e.target===ruler.lane)return;const lane=e.target;if(e.altKey){seek(snapAt(at(e,lane)));return;}
 const x=e.clientX,y=e.clientY,old=e.shiftKey?[...selection]:[];let moved=false;const rect=el('div','','animation-selection-box');host.append(rect);scroll.setPointerCapture?.(e.pointerId);
 scroll.onpointermove=e=>{moved=true;const l=Math.min(x,e.clientX),r=Math.max(x,e.clientX),t=Math.min(y,e.clientY),b=Math.max(y,e.clientY);Object.assign(rect.style,{left:l+'px',top:t+'px',width:(r-l)+'px',height:(b-t)+'px'});selection=[...old];for(const k of scroll.querySelectorAll('.animation-key:not(.mapped)')){const q=k.getBoundingClientRect();if(q.right>=l&&q.left<=r&&q.bottom>=t&&q.top<=b&&!active(k.dataset.id,k.dataset.path,+k.dataset.time))selection.push({id:k.dataset.id,path:k.dataset.path,time:+k.dataset.time});k.setAttribute('aria-pressed',String(active(k.dataset.id,k.dataset.path,+k.dataset.time)));}};
 scroll.onpointerup=e=>{scroll.onpointermove=null;scroll.onpointerup=null;rect.remove();if(!moved){selection=[];seek(snapAt(at(e,lane)));}signature='';update(true);};scroll.onpointercancel=()=>{scroll.onpointermove=null;rect.remove();selection=old;update(true);};};
 if(selection.length){const s=selection[0],n=find(api.getRoot(),s.id)?.node,t=n?.tracks[s.path],key=t?.keys.find(k=>sameTime(k[0],s.time));if(key){
 const panel=el('div','','animation-tools animation-key-properties');host.append(panel);panel.append(el('strong',((api.label(s.path,n) + ' · ') + (selection.length>1 ? uiText("timeline.batchSelection") : uiText("timeline.localKeyframes")))));
 panel.append(number(uiText("timeline.keyframeTime"),key[0],v=>{const map=mapFor(s.id);if(map)moveSelection(map.inverse(v)-map.inverse(s.time));},0,1));
 const setValue=v=>change(()=>{selection=editKeys(api.getRoot(),selection.map(s=>({...s,from:s.time,to:s.time,value:v})));});
 const type=animationType(n,s.path);if(selection.length===1){if(type==='color'){const color=el('input');color.type='color';color.value=key[1];color.setAttribute('aria-label',uiText("timeline.keyframeColor"));color.onchange=()=>setValue(color.value);panel.append(color);}else if(ANIMATION_ENUMS[s.path])panel.append(choice(uiText("timeline.keyframeOption"),ANIMATION_ENUMS[s.path].map(v=>[v,v]),key[1],setValue));else if(ANIMATION_BOOLS.includes(s.path))panel.append(choice(uiText("timeline.keyframeSwitch"),[['true',"timeline.on"],['false',"common.close"]],String(key[1]),v=>setValue(v==='true')));else panel.append(number(uiText("timeline.keyframeValue"),key[1],setValue));}
 if(type==='number'){
 const segment=t.segments?.[timeKey(s.time)]??{ease:t.ease};panel.append(choice(uiText("timeline.segmentInterpolation"),[['linear',"editor.linear"],['smooth',"editor.smooth"],['hold',"editor.hold"],['cubic',"timeline.customTangents"]],segment.ease,v=>change(()=>{for(const s of selection){const n=find(api.getRoot(),s.id).node,t=n.tracks[s.path];if(animationType(n,s.path)==='number'){t.segments??={};t.segments[timeKey(s.time)]={...t.segments[timeKey(s.time)],ease:v};}}})),choice(uiText("timeline.trackOperation"),[['absolute',"timeline.absolute"],['add',"timeline.addToBaseValue"],['multiply',"timeline.multiplyBaseValue"]],t.mode,v=>change(()=>convertTrack(n,s.path,v))));
 if(segment.ease==='cubic')for(const [k,title]of [['out',"timeline.outgoingTangentSlope"],['in',"timeline.nextKeyIncomingTangentSlope"]])panel.append(number(uiText(title),segment[k]??0,v=>change(()=>{t.segments[timeKey(s.time)][k]=v;})));
 }
 }}
 if(view==='curves'&&curvePath){const n=find(api.getRoot(),curvePath.id)?.node;if(n?.tracks[curvePath.path]?.keys.length){if(scope!==n.id)host.append(button(uiText("timeline.enterLocalCurveEditing"),()=>{scope=n.id;seek(0);signature='';update(true);}));else animationCurveView(host,{node:n,path:curvePath.path,selectedTime:selection.find(s=>s.id===n.id&&s.path===curvePath.path)?.time??n.tracks[curvePath.path].keys[0]?.[0],onSelect:(t,rebuild=true)=>{pick(n.id,curvePath.path,t);if(rebuild){seek(t);signature='';update(true);}},change,begin,preview,end,cancel,getRoot:api.getRoot,notify:fail});}}
 const note=el('p',uiText("timeline.clickTheRulerToSeekDragBlueIntervalsStripedIntervalsAre"),'tree-note');host.append(note);
 }
 host.querySelectorAll('.animation-playhead').forEach(e=>e.style.left=pos(progress())+'%');const cursor=host.querySelector('[data-animation-cursor]');if(cursor&&document.activeElement!==cursor)cursor.value=progress().toFixed(3);
 host.onkeydown=e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='c'){e.preventDefault();copy();}else if(mod&&e.key.toLowerCase()==='v'){e.preventDefault();paste();}else if(mod&&e.key.toLowerCase()==='a'){e.preventDefault();selection=[...host.querySelectorAll('.animation-key:not(.mapped)')].map(k=>({id:k.dataset.id,path:k.dataset.path,time:+k.dataset.time}));signature='';update(true);}else if(['Delete','Backspace'].includes(e.key)){e.preventDefault();deleteSelected();}else if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const d=(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?.1:snap==='frames'?1/(api.frames?.()??30):.01);if(selection.length)moveSelection(d);else seek(progress()+d);}else if(e.key==='Escape'){cancel();}else if(e.code==='Space'){e.preventDefault();api.togglePlay?.();}};
 }
 return {update,reset(){selection=[];signature='';},setScope(id){scope=id;selection=[];signature='';},getScope:()=>scope,enter};
}
