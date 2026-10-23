import {onLanguageChange} from './language.js';
import {uiText,uiFormat} from './ui-language.js';
import {animateUI,animateLayout,layoutRects,reducedMotion} from './editor-motion.js';
import {PANEL_IDS,PANEL_TITLES,LAYOUT_KEY,layoutPreset,sanitizeLayoutSettings,panelStack,findLayoutNode,closePanel,activatePanel,dockPanel,floatPanel,showPanel} from './dock-layout.js';
import {createSplitResize} from './dock-resize.js';

const element=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text)e.textContent=uiText(text);return e;};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const splitPercent=ratio=>String(Math.round(ratio*10000)/100);

// Move the existing elements: controls, canvas contexts, selection and animation retain their owners.
export function createDockWorkspace({host,menuHost,panels,onChange=()=>{},onMessage=()=>{},onVisibility=()=>{}}){
 let settings,drag=null,overlay=null,ghost=null,target=null,restoring=false;
 try{const raw=localStorage.getItem(LAYOUT_KEY);settings=sanitizeLayoutSettings(raw&&raw.length<100000?JSON.parse(raw):null);}catch{settings=sanitizeLayoutSettings(null);onMessage(uiText("layout.couldNotReadLayoutSettingsRestoredTheDefaultLayout"));}
 let layout=settings.current;
 const parking=element('div');parking.hidden=true;parking.id='dock-panel-parking';host.after(parking);host.classList.add('dock-workspace');
 const shells=new Map();for(const id of PANEL_IDS){
  const body=element('div','dock-panel-body');body.id='dock-content-'+id;body.setAttribute('role','tabpanel');body.setAttribute('aria-label',uiText(PANEL_TITLES[id]));body.append(panels[id]);shells.set(id,body);
 }
 const menu=element('details','header-dropdown dock-layout-menu');menu.id='workspace-layout-menu';menu.append(element('summary','', uiText("menu.layout")));
 const menuBody=element('div','header-dropdown-panel');menu.append(menuBody);menuHost.append(menu);
 const tip=element('p','dock-menu-tip',uiText("layout.dragPanelTabsToDockAltDragToFloat"));menuBody.append(tip);
 const button=(text,fn)=>{const b=element('button','',text);b.type='button';b.onclick=fn;return b;};
 for(const [id,title]of [['default',"layout.restoreDefaultLayout"],['browse',"workspace.browseLayout"],['animation',"layout.animationLayout"],['focus',"layout.focusCanvas"]])menuBody.append(button(uiText(title),()=>{apply(layoutPreset(id));menu.open=false;}));
 menuBody.append(element('hr'));const visibility=element('div','dock-panel-toggles');menuBody.append(visibility);
 const checks=new Map();for(const id of PANEL_IDS){const label=element('label'),input=element('input');input.type='checkbox';input.setAttribute('aria-label',uiFormat("layout.showPanel",uiText(PANEL_TITLES[id])));input.onchange=()=>input.checked?show(id):apply(closePanel(layout,id));label.append(input,document.createTextNode(uiText(PANEL_TITLES[id])));visibility.append(label);checks.set(id,input);}
 menuBody.append(element('hr'));
 const saveForm=element('form','dock-save-form'),name=element('input');name.placeholder=uiText("layout.eGMyTwoColumnLayout");name.maxLength=32;name.setAttribute('aria-label',uiText("layout.layoutName"));const save=element('button','',uiText("layout.saveCurrentLayout"));save.type='submit';saveForm.append(name,save);menuBody.append(saveForm);
 const named=element('select');named.setAttribute('aria-label',uiText("layout.savedLayouts"));menuBody.append(named);
 const actions=element('div','dock-saved-actions'),load=button(uiText("layout.applyLayout"),()=>{const saved=settings.named.find(s=>s.name===named.value);if(saved)apply(structuredClone(saved.layout));}),remove=button(uiText("layout.deleteSavedLayout"),()=>{settings.named=settings.named.filter(s=>s.name!==named.value);persist();updateMenu();});actions.append(load,remove);menuBody.append(actions);
 const status=element('p','dock-menu-tip',uiText("layout.layoutIsSavedInThisBrowserSeparatelyFromTheCanvasProject"));status.setAttribute('role','status');menuBody.append(status);
 saveForm.onsubmit=e=>{e.preventDefault();const title=name.value.trim();if(!title){status.textContent=uiText("layout.enterALayoutName");name.focus();return;}const existing=settings.named.find(s=>s.name===title);if(!existing&&settings.named.length>=12){status.textContent=uiText("layout.upToLayoutsDeleteAnUnusedLayoutFirst");return;}const item={name:title,layout:structuredClone(layout)};if(existing)settings.named[settings.named.indexOf(existing)]=item;else settings.named.push(item);const saved=persist();updateMenu(title);if(saved)status.textContent=(uiText("layout.layoutSaved") + title);};
 function updateMenu(selected=named.value){for(const id of PANEL_IDS)checks.get(id).checked=!!panelStack(layout,id);named.replaceChildren();if(!settings.named.length){const o=element('option','',uiText("layout.noSavedLayouts"));o.value='';named.append(o);}else for(const item of settings.named){const o=element('option');o.textContent=item.name;o.value=item.name;named.append(o);}if(settings.named.some(n=>n.name===selected))named.value=selected;load.disabled=remove.disabled=!settings.named.length;}
 function persist(){settings.current=layout;try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(settings));return true;}catch{status.textContent=uiText("layout.couldNotSaveTheLayoutCurrentLayoutIsStillUsable");return false;}}
 let motionTimer;
 const stackKey=element=>element.querySelector('.dock-tab[aria-selected=true]')?.dataset.panelTab;
 function apply(next,{focus=null,motion=true}={}){const before=motion?layoutRects(host.querySelectorAll('.dock-stack'),stackKey):null;layout=next;render();persist();if(before&&animateLayout(host.querySelectorAll('.dock-stack'),before,{key:stackKey,resize:true,duration:200})){clearTimeout(motionTimer);host.classList.add('dock-motion');motionTimer=setTimeout(()=>host.classList.remove('dock-motion'),220);}if(focus)host.querySelector(`[data-panel-tab="${focus}"]`)?.focus();}
 function show(id){apply(showPanel(layout,id),{focus:id});}
 function active(id){const stack=panelStack(layout,id);return stack?.active===id;}
 function render(){
  restoring=true;for(const body of shells.values()){body.hidden=true;parking.append(body);}host.replaceChildren();
  if(layout.root)host.append(renderTree(layout.root));else{const empty=element('div','dock-empty',uiText("layout.allDockedPanelsAreClosedReopenThemFromLayoutAbove"));empty.setAttribute('role','status');host.append(empty);}
  for(const f of layout.floats){
   const win=element('div','dock-floating');win.dataset.floatId=f.id;placeFloat(win,f);win.append(renderTree(f.root));
   const move=element('button','dock-window-move','⠿');move.type='button';move.setAttribute('aria-label',uiText("layout.moveFloatingWindow"));move.title=uiText("layout.dragToMoveFloatingWindow");move.onpointerdown=e=>windowGesture(e,win,f,'move');win.querySelector('.dock-stack-header').prepend(move);
   const footer=element('div','dock-window-footer'),size=element('button','dock-window-resize','◢');size.type='button';size.setAttribute('aria-label',uiText("layout.resizeFloatingWindow"));size.title=uiText("layout.resizeFloatingWindow");size.onpointerdown=e=>windowGesture(e,win,f,'resize');footer.append(size);win.append(footer);
   win.addEventListener('pointerdown',()=>{const i=layout.floats.indexOf(f);if(i!==layout.floats.length-1){layout.floats.splice(i,1);layout.floats.push(f);for(const w of host.querySelectorAll('.dock-floating'))w.style.zIndex=String(20+layout.floats.findIndex(x=>x.id===w.dataset.floatId));persist();}},{capture:true});host.append(win);
  }
  for(const id of PANEL_IDS)onVisibility(id,active(id));restoring=false;updateMenu();onChange();
 }
 function renderTree(n){
  if(n.kind==='split'){
   const container=element('div','dock-split dock-split-'+n.axis);container.dataset.splitId=n.id;
   const first=element('div','dock-branch'),second=element('div','dock-branch');first.style.flex=`0 0 calc(${n.ratio*100}% - 3px)`;second.style.flex='1 1 0';first.append(renderTree(n.first));second.append(renderTree(n.second));
   const handle=element('div','dock-splitter');handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-label',(n.axis==='x' ? uiText("layout.resizePanelWidth") : uiText("layout.resizePanelHeight")));handle.setAttribute('aria-orientation',n.axis==='x'?'vertical':'horizontal');handle.setAttribute('aria-valuemin','1');handle.setAttribute('aria-valuemax','99');handle.setAttribute('aria-valuenow',splitPercent(n.ratio));
   handle.onfocus=()=>prepareSplitResize(container,n);
   handle.onpointerdown=e=>splitGesture(e,container,n);handle.onkeydown=e=>{const keys=n.axis==='x'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];if(![...keys,'Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const resize=prepareSplitResize(container,n);resize.update(e.key==='Home'?resize.minDelta:e.key==='End'?resize.maxDelta:resize.size*(e.key===keys[0]?-.02:.02));apply(layout,{motion:false});host.querySelector(`[data-split-id="${n.id}"] > .dock-splitter`)?.focus();};container.append(first,handle,second);return container;
  }
  const container=element('section','dock-stack');container.dataset.stackId=n.id;
  const head=element('div','dock-stack-header'),tabs=element('div','dock-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',uiText("layout.panelTabs"));
  for(const id of n.panels){const tab=element('button','dock-tab',PANEL_TITLES[id]);tab.type='button';tab.dataset.panelTab=id;tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(n.active===id));tab.setAttribute('aria-controls','dock-content-'+id);tab.title=uiText("layout.dragToDockAltDragToFloat");tab.onclick=()=>{if(!drag)apply(activatePanel(layout,id),{focus:id});};tab.onpointerdown=e=>panelGesture(e,id);tab.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.stopPropagation();return;}if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();const index=(n.panels.indexOf(id)+(e.key==='ArrowLeft'?-1:1)+n.panels.length)%n.panels.length;const next=n.panels[index];apply(activatePanel(layout,next),{focus:next});};tabs.append(tab);}
  head.append(tabs);const actions=element('div','dock-stack-actions');const float=button('↗',()=>apply(floatPanel(layout,n.active)));float.setAttribute('aria-label',uiFormat("layout.floatPanel",uiText(PANEL_TITLES[n.active])));float.title=uiText("layout.floatThisPanelInsideTheWebpage");const close=button('×',()=>apply(closePanel(layout,n.active)));close.setAttribute('aria-label',uiFormat("layout.closePanel",uiText(PANEL_TITLES[n.active])));close.title=uiText("layout.closePanelReopenFromLayout");actions.append(float,close);head.append(actions);container.append(head);
  for(const id of n.panels){const body=shells.get(id);body.hidden=n.active!==id;container.append(body);}return container;
 }
 function placeFloat(win,f){win.style.left=f.x*100+'%';win.style.top=f.y*100+'%';win.style.width=f.w*100+'%';win.style.height=f.h*100+'%';win.style.zIndex=String(20+layout.floats.indexOf(f));}
 function listenGesture(e,move,end,cancel){
  const controller=new AbortController(),opts={signal:controller.signal,capture:true};
  const cleanup=()=>{controller.abort();document.body.classList.remove('dock-is-dragging');};
  document.addEventListener('pointermove',move,opts);document.addEventListener('pointerup',event=>{if(event.pointerId!==e.pointerId)return;cleanup();end(event);},opts);
  document.addEventListener('pointercancel',event=>{if(event.pointerId!==e.pointerId)return;cleanup();cancel();},opts);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cleanup();cancel();}},opts);
 }
 function prepareSplitResize(container,n){
  const dimension=n.axis==='x'?'width':'height',size=container.getBoundingClientRect()[dimension],handle=container.querySelector(':scope > .dock-splitter');
  const resize=createSplitResize(n,size,{gap:handle.getBoundingClientRect()[dimension]});
  handle.setAttribute('aria-valuemin',splitPercent(n.ratio+resize.minDelta/size));handle.setAttribute('aria-valuemax',splitPercent(n.ratio+resize.maxDelta/size));
  const elements=new Map([container,...container.querySelectorAll('.dock-split')].map(e=>[e.dataset.splitId,e]));
  const views=resize.splits.map(({node})=>({node,first:elements.get(node.id).firstElementChild,handle:elements.get(node.id).querySelector(':scope > .dock-splitter')}));
  return {...resize,size,update(delta){resize.resize(delta);for(const view of views){view.first.style.flexBasis=`calc(${view.node.ratio*100}% - 3px)`;view.handle.setAttribute('aria-valuenow',splitPercent(view.node.ratio));}}};
 }
 function splitGesture(e,container,n){
  if(e.button!==0)return;e.preventDefault();e.stopPropagation();const resize=prepareSplitResize(container,n),start=n.axis==='x'?e.clientX:e.clientY;document.body.classList.add('dock-is-dragging');
  listenGesture(e,event=>{if(event.pointerId!==e.pointerId)return;resize.update((n.axis==='x'?event.clientX:event.clientY)-start);onChange();},()=>apply(layout,{motion:false}),()=>{resize.restore();render();});
 }
 function windowGesture(e,win,f,kind){
  if(e.button!==0)return;e.preventDefault();e.stopPropagation();const rect=host.getBoundingClientRect(),before={x:f.x,y:f.y,w:f.w,h:f.h};document.body.classList.add('dock-is-dragging');
  listenGesture(e,event=>{if(event.pointerId!==e.pointerId)return;const dx=(event.clientX-e.clientX)/Math.max(1,rect.width),dy=(event.clientY-e.clientY)/Math.max(1,rect.height);
   if(kind==='move'){f.x=clamp(before.x+dx,0,1-f.w);f.y=clamp(before.y+dy,0,1-f.h);}else{f.w=clamp(before.w+dx,.2,1-f.x);f.h=clamp(before.h+dy,.15,1-f.y);}placeFloat(win,f);onChange();
  },()=>{persist();onChange();},()=>{const current=layoutRects([win]);Object.assign(f,before);placeFloat(win,f);animateLayout([win],current,{resize:true});onChange();});
 }
 function dropTarget(x,y,forceFloat){
  if(forceFloat)return null;const rect=host.getBoundingClientRect();if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
  const outer=22;if(x<rect.left+outer)return {id:'root',edge:'left',rect};if(x>rect.right-outer)return {id:'root',edge:'right',rect};if(y<rect.top+outer)return {id:'root',edge:'top',rect};if(y>rect.bottom-outer)return {id:'root',edge:'bottom',rect};
  const hit=document.elementFromPoint(x,y)?.closest('.dock-stack');if(!hit||!host.contains(hit))return null;const r=hit.getBoundingClientRect(),dx=(x-r.left)/r.width,dy=(y-r.top)/r.height;
  const edge=dx<.23?'left':dx>.77?'right':dy<.23?'top':dy>.77?'bottom':'center';return {id:hit.dataset.stackId,edge,rect:r};
 }
 function drawDrop(){
  if(!target){overlay?.remove();overlay=null;return;}const root=host.getBoundingClientRect(),r=target.rect;if(!overlay){overlay=element('div','dock-drop-preview');host.append(overlay);}overlay.textContent=(target.edge==='center' ? uiText("layout.mergeAsTabs") : uiText(({left:"layout.dockLeft",right:"layout.dockRight",top:"layout.dockAbove",bottom:"layout.dockBelow"})[target.edge]));
  const width=['left','right'].includes(target.edge)?r.width*.3:r.width,height=['top','bottom'].includes(target.edge)?r.height*.3:r.height;
  Object.assign(overlay.style,{left:(r.left-root.left+(target.edge==='right'?r.width-width:0))+'px',top:(r.top-root.top+(target.edge==='bottom'?r.height-height:0))+'px',width:width+'px',height:height+'px'});
 }
 function clearDrag(cancel=false){const source=drag&&host.querySelector(`[data-panel-tab="${drag.panel}"]`);drag=null;target=null;overlay?.remove();if(ghost&&cancel&&source&&!reducedMotion()){const image=ghost,from=image.getBoundingClientRect(),to=source.getBoundingClientRect(),animation=animateUI(image,[{transform:'none',opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px)`,opacity:0}],{duration:180});if(animation)animation.finished.then(()=>image.remove(),()=>image.remove());else image.remove();}else ghost?.remove();overlay=ghost=null;}
 function panelGesture(e,id){
  if(e.button!==0)return;const start={x:e.clientX,y:e.clientY};let moved=false;
  listenGesture(e,event=>{if(event.pointerId!==e.pointerId)return;if(!moved&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<6)return;
   if(!moved){moved=true;drag={panel:id};document.body.classList.add('dock-is-dragging');ghost=element('div','dock-drag-ghost',PANEL_TITLES[id]);document.body.append(ghost);}event.preventDefault();ghost.style.left=(event.clientX+14)+'px';ghost.style.top=(event.clientY+14)+'px';target=dropTarget(event.clientX,event.clientY,event.altKey);drawDrop();
  },event=>{if(!moved)return;const dest=target,rect=host.getBoundingClientRect();clearDrag();if(dest)apply(dockPanel(layout,id,dest.id,dest.edge));else apply(floatPanel(layout,id,{x:(event.clientX-rect.left-80)/rect.width,y:(event.clientY-rect.top-15)/rect.height,w:.45,h:.6}));
   // Suppress the click generated after a completed drag, preserving the drop destination.
   const suppress=event=>{event.preventDefault();event.stopImmediatePropagation();};
   document.addEventListener('click',suppress,{once:true,capture:true});setTimeout(()=>document.removeEventListener('click',suppress,true),0);
  },()=>clearDrag(true));
 }
 onLanguageChange(()=>{menu.querySelector('summary').textContent=uiText("menu.layout");tip.textContent=uiText("layout.dragPanelTabsToDockAltDragToFloat");for(const [i,title]of ["layout.restoreDefaultLayout","workspace.browseLayout","layout.animationLayout","layout.focusCanvas"].entries())menuBody.querySelectorAll(':scope > button')[i].textContent=uiText(title);for(const id of PANEL_IDS){const input=checks.get(id);input.nextSibling.nodeValue=uiText(PANEL_TITLES[id]);input.setAttribute('aria-label',uiText("layout.show")+uiText(PANEL_TITLES[id]));shells.get(id).setAttribute('aria-label',uiText(PANEL_TITLES[id]));}name.placeholder=uiText("layout.eGMyTwoColumnLayout");name.setAttribute('aria-label',uiText("layout.layoutName"));named.setAttribute('aria-label',uiText("layout.savedLayouts"));status.textContent=uiText("layout.layoutIsSavedInThisBrowserSeparatelyFromTheCanvasProject");save.textContent=uiText("layout.saveCurrentLayout");load.textContent=uiText("layout.applyLayout");remove.textContent=uiText("layout.deleteSavedLayout");render();});
 render();return {show,hide:id=>apply(closePanel(layout,id)),toggle:id=>panelStack(layout,id)?apply(closePanel(layout,id)):show(id),active,has:id=>!!panelStack(layout,id),isRestoring:()=>restoring};
}

export function installEditorDocking({onChange,onMessage}){
 const host=document.querySelector('.tree-workspace'),left=host.querySelector('.tree-left'),preview=host.querySelector('.tree-preview'),inspector=host.querySelector('.tree-inspector');
 const nodes=element('div','tree-left dock-nodes-content'),library=element('div','tree-left dock-library-content');let intoLibrary=false;
 for(const child of [...left.childNodes]){if(child.nodeType===1&&child.tagName==='HR'){intoLibrary=true;continue;}(intoLibrary?library:nodes).append(child);}left.remove();
 const timeline=document.getElementById('animation-panel'),summary=timeline.querySelector('summary');summary.hidden=true;
 const controls=document.getElementById('node-animation-editor');controls.classList.add('dock-animation-content');
 const timelineButton=element('button','dock-open-timeline',uiText("editor.animationEditorTimeline"));timelineButton.type='button';timelineButton.id='open-docked-timeline';timeline.before(timelineButton);timeline.remove();
 let manager;manager=createDockWorkspace({host,menuHost:document.querySelector('.tree-tool-actions'),panels:{nodes,library,canvas:preview,inspector,timeline},onChange,onMessage,onVisibility:(id,visible)=>{if(id==='timeline'){timeline.open=visible;timelineButton.setAttribute('aria-expanded',String(visible));}}});
 timelineButton.onclick=()=>manager.toggle('timeline');onLanguageChange(()=>timelineButton.textContent=uiText("editor.animationEditorTimeline"));
 new MutationObserver(()=>{if(timeline.open&&!manager.isRestoring()&&!manager.active('timeline'))manager.show('timeline');}).observe(timeline,{attributes:true,attributeFilter:['open']});
 return manager;
}
