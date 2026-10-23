import {uiText,uiFormat} from './ui-language.js';
import {EFFECT_BY_ID,effectOrder,effectEnabled} from './post-effect-specs.js';
import {dragAutoScroll,createReorderPreview,animateUI,animateLayout,layoutRects} from './editor-motion.js';
const expanded=new Map(),helpOpen=new Set(),pendingMotion=new Map(),pendingFocus=new Map();
// One shared editor is used by the inspector, multi-selection and pinned node controls.
export function createPostEffectsEditor({document:doc,host,node,scope=node.id,buildParameters,onToggle,onReset,onOrder,onResetAll,enabled=id=>effectEnabled(node,id),locked=()=>false}){
 const el=(tag,attrs={})=>{const e=doc.createElement(tag);for(const [key,value]of Object.entries(attrs))if(key==='text')e.textContent=value;else e.setAttribute(key,value);return e;};
 const panel=el('div',{class:'post-effects-editor'}),toolbar=el('div',{class:'post-effects-toolbar'}),list=el('div',{class:'post-effects-list','aria-label':uiText('fx.order')});host.append(panel);panel.append(toolbar,el('p',{class:'tree-note',text:uiText('fx.hint')}),list);
 const button=(text,label,action)=>{const b=el('button',{type:'button',text,title:label,'aria-label':label});b.onclick=e=>{e.preventDefault();e.stopPropagation();action();};return b;};
 toolbar.append(button(uiText('fx.resetAll'),uiText('fx.resetAll'),onResetAll));
 const items=()=>[...list.children].filter(e=>e.dataset.effect),motionKey=e=>e.dataset.effect;
 const initialOrder=effectOrder(node.effectOrder),order=()=>items().map(motionKey);
 const remember=before=>{if(before)pendingMotion.set(scope,before);onOrder(order());if(panel.isConnected&&before){pendingMotion.delete(scope);animateLayout(items(),before,{key:motionKey});}};
 for(const id of initialOrder){
  const spec=EFFECT_BY_ID.get(id),key=scope+':'+id,name=uiText(spec.label),item=el('section',{class:'post-effect','data-effect':id}),details=el('details'),summary=el('summary'),body=el('div',{class:'post-effect-body'}),input=el('input',{type:'checkbox','aria-label':uiFormat('fx.enable',name)}),state=enabled(id);
  input.dataset.effectEnabled=id;input.checked=state===true;input.indeterminate=state===undefined;input.disabled=locked('postEffects.'+id+'.enabled');input.onclick=e=>e.stopPropagation();input.onchange=()=>{expanded.set(key,true);onToggle(id,input.checked);};
  const grip=button('⠿',uiFormat('fx.move',name),()=>{});grip.className='post-effect-grip';grip.style.touchAction='none';
  const title=el('span',{class:'post-effect-title',text:name}),help=el('p',{class:'tree-note post-effect-help',text:uiText(spec.description)});help.hidden=!helpOpen.has(key);
  const info=button('?',uiFormat('fx.info',name),()=>{help.hidden=!help.hidden;info.setAttribute('aria-expanded',String(!help.hidden));help.hidden?helpOpen.delete(key):helpOpen.add(key);});info.setAttribute('aria-expanded',String(!help.hidden));
  const reset=button('↺',uiFormat('fx.reset',name),()=>onReset(id));reset.disabled=spec.parameters.some(p=>locked(p.path));
  grip.onkeydown=event=>{
   if(!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopPropagation();
   const target=event.key==='ArrowUp'?item.previousElementSibling:item.nextElementSibling;if(!target)return;
   const before=layoutRects(items(),motionKey);event.key==='ArrowUp'?list.insertBefore(item,target):list.insertBefore(target,item);pendingFocus.set(scope,id);remember(before);
   if(panel.isConnected){pendingFocus.delete(scope);grip.focus({preventScroll:true});}
  };
  summary.append(grip,input,title,info,reset);details.append(summary,body);item.append(details,help);list.append(item);details.open=expanded.get(key)??state===true;
  details.ontoggle=()=>{if(details.isConnected)expanded.set(key,details.open);};
  if(id!=='sketch')buildParameters(body,spec);else{
   const groups={outline:['maxRandomnessOffset','preserveVertices','strokeDashPattern','strokeDashOffset'],fill:['fillMultiStroke','fillShapeRoughnessGain','fillDashPattern','fillDashOffset','curveStepCount','curveFitting','curveTightness'],path:['source','threshold','simplify','pathSimplification','fixedDecimalPlaceDigits']},advanced=new Set(Object.values(groups).flat());
   buildParameters(body,{...spec,parameters:spec.parameters.filter(p=>!advanced.has(p.key))});
   for(const [group,keys]of Object.entries(groups)){
    const disclosure=el('details',{class:'post-effect-advanced','data-sketch-group':group}),content=el('div'),groupKey=key+':'+group;disclosure.append(el('summary',{text:uiText('fx.group.'+group)}),content);body.append(disclosure);buildParameters(content,{...spec,parameters:spec.parameters.filter(p=>keys.includes(p.key))});
    if(!content.childElementCount){disclosure.remove();continue;}disclosure.open=expanded.get(groupKey)??false;disclosure.ontoggle=()=>{if(disclosure.isConnected)expanded.set(groupKey,disclosure.open);};
   }
  }
  grip.onpointerdown=start=>{
   if(start.button!==0)return;start.preventDefault();start.stopPropagation();const before=order(),events=new AbortController(),options={capture:true,signal:events.signal};let pointerY=start.clientY,preview=null,ghost=null;
   const scroller=host.closest('.tree-inspector,.tree-left')??host,scroll=dragAutoScroll(scroller,()=>preview?.preview(pointerY));
   grip.setPointerCapture?.(start.pointerId);
   const finish=commit=>{
    events.abort();scroll.stop();if(grip.hasPointerCapture?.(start.pointerId))grip.releasePointerCapture(start.pointerId);
    const motion=preview&&layoutRects(items(),motionKey);if(preview&&commit)motion.set(id,preview.placeholder.getBoundingClientRect());
    if(commit)preview?.commit();else preview?.cancel();
    if(ghost){const image=ghost,from=image.getBoundingClientRect(),to=summary.getBoundingClientRect(),animation=animateUI(image,[{transform:'none',opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px)`,opacity:0}],{duration:commit?100:160});if(animation)animation.finished.then(()=>image.remove(),()=>image.remove());else image.remove();}
    if(commit&&preview&&order().join()!==before.join())remember(motion);
   };
   doc.addEventListener('pointermove',event=>{if(event.pointerId!==start.pointerId)return;event.preventDefault();if(!preview){if(Math.hypot(event.clientX-start.clientX,event.clientY-start.clientY)<6)return;preview=createReorderPreview(list,items(),item,{headingSelector:':scope>details>summary',summarySelector:':scope>details>summary',placeholderClass:'module-sort-placeholder post-effect-placeholder'});item.classList.add('module-dragging');ghost=el('div',{class:'module-drag-ghost post-effect-drag-ghost','aria-hidden':'true'});ghost.inert=true;ghost.append(preview.dragImage.cloneNode(true));ghost.style.width=item.getBoundingClientRect().width+'px';doc.body.append(ghost);}pointerY=event.clientY;ghost.style.left=Math.max(8,Math.min(event.clientX-20,doc.defaultView.innerWidth-ghost.offsetWidth-8))+'px';ghost.style.top=(event.clientY-12)+'px';preview.preview(pointerY);scroll.update(pointerY);},options);
   doc.addEventListener('pointerup',event=>{if(event.pointerId!==start.pointerId)return;const r=scroller.getBoundingClientRect();finish(event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom);},options);
   doc.addEventListener('pointercancel',()=>finish(false),options);doc.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false);}},options);doc.defaultView.addEventListener('blur',()=>finish(false),{signal:events.signal});doc.defaultView.addEventListener('resize',()=>finish(false),{signal:events.signal});grip.addEventListener('lostpointercapture',()=>finish(false),{signal:events.signal});
  };
 }
 const motion=pendingMotion.get(scope);if(motion){pendingMotion.delete(scope);queueMicrotask(()=>{if(panel.isConnected)animateLayout(items(),motion,{key:motionKey});});}
 const focus=pendingFocus.get(scope);if(focus){pendingFocus.delete(scope);queueMicrotask(()=>{if(panel.isConnected)list.querySelector('[data-effect="'+focus+'"] .post-effect-grip')?.focus({preventScroll:true});});}
 return panel;
}
