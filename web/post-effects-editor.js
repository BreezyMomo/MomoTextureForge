import {editorIcon} from './editor-icons.js';
import {uiText,uiFormat} from './ui-language.js';
import {EFFECT_BY_ID,effectOrder,effectEnabled,effectPresent} from './post-effect-specs.js';
import {compactEffectSummary} from './post-effect-catalog.js';
import {openPostEffectPicker} from './post-effect-picker.js';
import {hasPostEffectShader} from './post-effect-shader.js';
import {createShaderBadge} from './shader-badge.js';
import {dragAutoScroll,createReorderPreview,animateUI,animateLayout,layoutRects} from './editor-motion.js';
const expanded=new Map(),helpOpen=new Set(),pendingMotion=new Map(),pendingFocus=new Map();let closeActions=null;
// One shared editor is used by the inspector, multi-selection and pinned node controls.
export function createPostEffectsEditor({document:doc,host,node,scope=node.id,context=node.id,getNodes=()=>[node],prepare=()=>{},buildParameters,onAdd,onRemove,onToggle,onReset,onOrder,onResetAll,enabled=id=>effectEnabled(node,id),present=id=>effectPresent(node,id),summary=id=>compactEffectSummary(getNodes(),id),locked=()=>false,allowShaderExport=true}){
 prepare();
 const el=(tag,attrs={})=>{const e=doc.createElement(tag);for(const [key,value]of Object.entries(attrs))if(key==='text')e.textContent=value;else e.setAttribute(key,value);return e;};
 const panel=el('div',{class:'post-effects-editor'}),toolbar=el('div',{class:'post-effects-toolbar'}),list=el('div',{class:'post-effects-list','aria-label':uiText('fx.order')});host.append(panel);panel.append(toolbar,el('p',{class:'tree-note',text:uiText('fx.hint')}),list);
 const button=(text,label,action)=>{const b=el('button',{type:'button',text,title:label,'aria-label':label});b.onclick=e=>{e.preventDefault();e.stopPropagation();action();};return b;};
 const count=el('span',{class:'post-effects-count'}),add=button(uiText('fx.addEffects'),uiText('fx.addEffects'),()=>openPostEffectPicker({document:doc,anchor:add,context,present,onAdd:id=>{expanded.set(scope+':'+id,true);return onAdd(id);}}));add.className='post-effects-add';
 const resetAll=button('↺',uiText('fx.resetAll'),onResetAll);resetAll.className='post-effects-reset';toolbar.append(count,add,resetAll);
 const items=()=>[...list.children].filter(e=>e.dataset.effect),motionKey=e=>e.dataset.effect;
 const initialOrder=effectOrder(node.effectOrder).filter(id=>present(id)!==false),order=()=>items().map(motionKey);
 const remember=before=>{if(before)pendingMotion.set(scope,before);onOrder(order());if(panel.isConnected&&before){pendingMotion.delete(scope);animateLayout(items(),before,{key:motionKey});}};
 for(const id of initialOrder){
  const spec=EFFECT_BY_ID.get(id),key=scope+':'+id,name=uiText(spec.label),item=el('section',{class:'post-effect','data-effect':id}),details=el('details'),summary=el('summary'),body=el('div',{class:'post-effect-body'}),input=el('input',{type:'checkbox','aria-label':uiFormat('fx.enable',name)}),state=enabled(id);
  input.dataset.effectEnabled=id;input.checked=state===true;input.indeterminate=state===undefined;input.disabled=locked('postEffects.'+id+'.enabled');input.onclick=e=>e.stopPropagation();input.onchange=()=>{expanded.set(key,true);onToggle(id,input.checked);};
  const grip=button('⠿',uiFormat('fx.move',name),()=>{});grip.className='post-effect-grip';grip.replaceChildren(editorIcon('drag',doc));grip.style.touchAction='none';
  const title=el('span',{class:'post-effect-title',text:name}),heading=el('span',{class:'post-effect-heading'}),caption=el('span',{class:'post-effect-current'}),help=el('p',{class:'tree-note post-effect-help',text:uiText(spec.description)});heading.append(title,caption);help.hidden=!helpOpen.has(key);
  const info=button('?',uiFormat('fx.info',name),()=>{help.hidden=!help.hidden;info.setAttribute('aria-expanded',String(!help.hidden));help.hidden?helpOpen.delete(key):helpOpen.add(key);});info.replaceChildren(editorIcon('help',doc));info.setAttribute('aria-expanded',String(!help.hidden));
  const reset=button('↺',uiFormat('fx.reset',name),()=>onReset(id));reset.replaceChildren(editorIcon('reset',doc));reset.disabled=spec.parameters.some(p=>locked(p.path));
  grip.onkeydown=event=>{
   if(!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopPropagation();
   const target=event.key==='ArrowUp'?item.previousElementSibling:item.nextElementSibling;if(!target)return;
   const before=layoutRects(items(),motionKey);event.key==='ArrowUp'?list.insertBefore(item,target):list.insertBefore(target,item);pendingFocus.set(scope,id);remember(before);
   if(panel.isConnected){pendingFocus.delete(scope);grip.focus({preventScroll:true});}
  };
  const more=button('⋯',uiFormat('fx.actions',name),()=>{
   closeActions?.();const menu=el('div',{class:'post-effect-actions-menu',popover:'auto','data-effect-actions':id}),close=()=>{if(menu.matches(':popover-open'))menu.hidePopover();menu.remove();if(closeActions===close)closeActions=null;};
   closeActions=close;const explain=button(uiText('fx.showHelp'),uiFormat('fx.info',name),()=>{close();info.click();}),restore=button(uiText('fx.resetParameters'),uiFormat('fx.reset',name),()=>{close();onReset(id);}),remove=button(uiText('fx.removeEffect'),uiFormat('fx.removeNamed',name),()=>{close();onRemove(id);});restore.disabled=reset.disabled;
   menu.append(explain,restore,remove);doc.body.append(menu);menu.onkeydown=e=>e.stopPropagation();menu.addEventListener('toggle',event=>{if(event.newState==='closed')close();});menu.showPopover();const a=more.getBoundingClientRect(),r=menu.getBoundingClientRect();Object.assign(menu.style,{position:'fixed',inset:'auto',margin:'0',left:Math.max(8,Math.min(a.right-r.width,doc.defaultView.innerWidth-r.width-8))+'px',top:Math.max(8,Math.min(a.bottom+4,doc.defaultView.innerHeight-r.height-8))+'px'});
  });more.className='post-effect-more';
  summary.append(grip,input,heading,more);details.append(summary,body);item.append(details,help);list.append(item);details.open=expanded.get(key)??state===true;
  if(hasPostEffectShader(id)){const nameRow=el('span',{class:'post-effect-name-row'});title.replaceWith(nameRow);nameRow.append(title,createShaderBadge(doc,{className:'post-effect-shader',label:uiText('fx.shaderBadge'),hint:uiText('fx.shaderHint')}));if(id!=='sketch'&&allowShaderExport)body.append(button(uiText('fx.downloadShader'),uiText('fx.downloadShader'),()=>doc.dispatchEvent(new doc.defaultView.CustomEvent('momo-download-postprocess-module',{detail:{nodeId:node.id,effectId:id}}))));}
  details.ontoggle=()=>{if(details.isConnected)expanded.set(key,details.open);};
  if(id!=='sketch')buildParameters(body,spec);else{
   const groups={outline:['maxRandomnessOffset','preserveVertices','strokeDashPattern','strokeDashOffset'],fill:['fillMultiStroke','fillShapeRoughnessGain','fillDashPattern','fillDashOffset','curveStepCount','curveFitting','curveTightness'],path:['source','threshold','simplify','pathSimplification','fixedDecimalPlaceDigits']},advanced=new Set(Object.values(groups).flat());
   buildParameters(body,{...spec,parameters:spec.parameters.filter(p=>!advanced.has(p.key))});
   for(const [group,keys]of Object.entries(groups)){
    const disclosure=el('details',{class:'post-effect-advanced','data-sketch-group':group}),content=el('div'),groupKey=key+':'+group;disclosure.append(el('summary',{text:uiText('fx.group.'+group)}),content);body.append(disclosure);buildParameters(content,{...spec,parameters:spec.parameters.filter(p=>keys.includes(p.key))});
    if(!content.childElementCount){disclosure.remove();continue;}disclosure.open=expanded.get(groupKey)??false;disclosure.ontoggle=()=>{if(disclosure.isConnected)expanded.set(groupKey,disclosure.open);};
   }
  }
  if(id==='sketch'&&allowShaderExport){
   const input=el('select',{'aria-label':uiText('handdrawn.inputAdapter')});for(const [value,key]of [['auto','handdrawn.input.auto'],['generator','handdrawn.input.generator'],['texture','handdrawn.input.texture'],['external','handdrawn.input.external']]){const option=el('option',{value,text:uiText(key)});input.append(option);}
   const exportButton=button(uiText('handdrawn.download'),uiText('handdrawn.download'),()=>doc.dispatchEvent(new doc.defaultView.CustomEvent('momo-download-handdrawn-postprocess',{detail:{nodeId:node.id,handdrawnInput:input.value}})));
   body.append(el('p',{class:'tree-note',text:uiText('handdrawn.description')}),input,exportButton);
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
 if(!initialOrder.length)list.append(el('p',{class:'tree-note post-effects-empty',text:uiText('fx.emptyStack')}));
 panel.refreshEffectState=()=>{
  prepare();
  resetAll.disabled=effectOrder(node.effectOrder).some(id=>locked('postEffects.'+id+'.enabled')||EFFECT_BY_ID.get(id).parameters.some(p=>locked(p.path)));
  let active=0,mixed=0;for(const item of items()){const id=item.dataset.effect,state=enabled(id),caption=item.querySelector('.post-effect-current');if(state===true)active++;if(state===undefined)mixed++;const label=present(id)===undefined?uiText('fx.partialNodes'):state===undefined?uiText('fx.mixedState'):state?summary(id):uiText('fx.bypassedRetained');if(caption.textContent!==label){caption.textContent=label;caption.title=label;}const value=state===undefined?'mixed':state?'active':'bypassed';if(item.dataset.effectState!==value)item.dataset.effectState=value;}
  const label=mixed?uiFormat('fx.stackMixedCount',active,initialOrder.length,mixed):uiFormat('fx.stackCount',active,initialOrder.length);if(count.textContent!==label)count.textContent=label;
 };
 panel.refreshEffectState();
 const motion=pendingMotion.get(scope);if(motion){pendingMotion.delete(scope);queueMicrotask(()=>{if(panel.isConnected)animateLayout(items(),motion,{key:motionKey});});}
 const focus=pendingFocus.get(scope);if(focus){pendingFocus.delete(scope);queueMicrotask(()=>{if(panel.isConnected)list.querySelector('[data-effect="'+focus+'"] .post-effect-grip')?.focus({preventScroll:true});});}
 return panel;
}
