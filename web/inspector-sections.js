import {editorIcon} from './editor-icons.js';
import {uiText,uiFormat} from './ui-language.js';
import {hoverHelp} from './hover-help.js';
import {SHORTCUT_MODULES,shortcutControls} from './node-shortcuts.js';
import {animateUI,animateLayout,layoutRects,createReorderPreview,dragAutoScroll} from './editor-motion.js';

export const INSPECTOR_SECTIONS_KEY='momo-texture-tree:inspector-sections:v1';
export const INSPECTOR_ORDER_KEY='momo-texture-tree:inspector-module-order:v1';
export function inspectorSectionState(storage){
 let expanded={};try{const saved=JSON.parse(storage?.getItem(INSPECTOR_SECTIONS_KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))expanded=Object.fromEntries(Object.entries(saved).filter(([key,value])=>key.length<200&&typeof value==='boolean'));}catch{}
 let orders={};try{const saved=JSON.parse(storage?.getItem(INSPECTOR_ORDER_KEY)||'{}');for(const tab of ['shape','layout','animation','composite'])if(Array.isArray(saved?.[tab]))orders[tab]=[...new Set(saved[tab].filter(key=>typeof key==='string'&&key.length<200))];}catch{}
 return {
  open:(id,fallback)=>Object.hasOwn(expanded,id)?expanded[id]:fallback,
  remember(id,open){expanded[id]=open;try{storage?.setItem(INSPECTOR_SECTIONS_KEY,JSON.stringify(expanded));}catch{}},
  order(tab,keys){const saved=orders[tab]??[];return [...saved.filter(key=>keys.includes(key)),...keys.filter(key=>!saved.includes(key))];},
  rememberOrder(tab,keys){const remaining=[...keys],visible=new Set(keys);orders[tab]=(orders[tab]??[]).map(key=>visible.has(key)?remaining.shift():key).concat(remaining);try{storage?.setItem(INSPECTOR_ORDER_KEY,JSON.stringify(orders));}catch{}},
  resetOrder(tab){delete orders[tab];try{storage?.setItem(INSPECTOR_ORDER_KEY,JSON.stringify(orders));}catch{}}
 };
}
const descriptions={
 'modules.node':'modules.nodeHelp','modules.generator':'modules.generatorHelp','modules.shapeParameters':'modules.parametersHelp',
 'editor.opacity':'editor.overallNodeOpacityGroupsAffectTheWholeGroup','editor.nodeRegion':'editor.widthAndHeightAreRelativeToTheParentPositionAndPivot',
 'editor.contentArrangement':'editor.arrangementRepeatsTheEntireNodeContentGridsAllocateCellsFirstThen','editor.shapeUV':'modules.uvHelp',
 'editor.shapeAnimation':'editor.automaticMotionUsesElapsedSecondsSpeedOffsetAndContinuesAcrossTimeline',
 'editor.nodeColors':'modules.colorsHelp','editor.gradientEndpoints':'modules.gradientHelp','editor.gradientStops':'modules.gradientHelp','editor.colorPresets':'modules.presetsHelp',
 'modules.levels':'modules.levelsHelp','modules.invert':'modules.invertHelp','modules.imageFilters':'editor.appliesBlurBloomSharpeningDispersionAndToonLevelsInOrderRadii','modules.blending':'modules.blendingHelp','editor.contourProcessing':'editor.processesTheFinalNodeContourAfterChildCompositingForGroupsOutline',
 'editor.postProcessingBrightnessLevelsInvert':'editor.appliesBlurBloomSharpeningDispersionAndToonLevelsInOrderRadii',
 'editor.playbackInParent':'editor.theTimeBarPlacesThisNodeInItsParentTimelineResizing','editor.nodeParameterAnimation':'editor.enableRecordingAndAdjustAParameterToCreateKeyframesNormalMode',
 'editor.advancedTimeControls':'modules.timingHelp','editor.advancedRandomnessPosition':'modules.randomnessHelp','editor.layoutVariationGradientFlow':'modules.variationHelp',
 'selection.alignDistribute':'selection.alignsNodeRegionBoundsThreeOrMoreNodesCanBeEvenly','curves.title':'curves.hint'
};
// A view-only wrapper: inputs keep their existing handlers, reset buttons and keyframes.
export function groupInspectorSections(host,{tab,graphic,state,multiple=false,shortcuts=null}){
 const doc=host.ownerDocument,make=(tag,className)=>{const element=doc.createElement(tag);element.className=className;return element;};
 const scope=key=>key==='modules.shapeParameters'?key+':'+(graphic?.id??'selection'):key;
 function decorate(details,key,title,defaultOpen=true){
  details.classList.remove('arrangement-advanced');details.classList.add('inspector-module');details.dataset.module=key;const id=scope(key),summary=details.querySelector(':scope>summary'),label=make('span','inspector-module-title');label.textContent=title;label.title=title;
  const body=make('div','inspector-module-body');for(const child of [...details.childNodes])if(child!==summary)body.append(child);
  const secondary=[...body.querySelectorAll('[data-parameter-action]')];
  if(secondary.length){
   const footer=make('div','inspector-secondary-actions');
   for(const action of secondary){const parent=action.parentElement;footer.append(action);if(!parent.children.length)parent.remove();}
   body.append(footer);
  }
  for(const heading of body.querySelectorAll(':scope>h3[data-inspector-section]'))if(heading.dataset.inspectorSection===key)heading.remove();
  const help=make('span','tree-note inspector-module-description'),heading=make('span','inspector-module-heading'),button=make('button','inspector-module-help'),arrow=make('span','inspector-module-arrow');arrow.setAttribute('aria-hidden','true');arrow.append(editorIcon('chevron',doc));
  const notes=[...body.querySelectorAll(':scope>p[data-inspector-help]')];if(notes.length){help.textContent=notes.map(note=>note.textContent).join('\n');notes.forEach(note=>note.remove());}else help.textContent=uiText(descriptions[key]??'modules.sectionHelp');help.hidden=true;button.type='button';button.append(editorIcon('help',doc));button.setAttribute('aria-label',uiFormat('modules.helpTitle',title));hoverHelp(button,help.textContent);
  heading.append(label,button);if(shortcuts&&SHORTCUT_MODULES.includes(key))heading.append(shortcutControls(doc,{key,pinned:shortcuts.keys.includes(key),onToggle:shortcuts.toggle,global:shortcuts.global(key),onToggleAll:shortcuts.toggleAll}));heading.append(arrow);summary.replaceChildren(heading,help);summary.setAttribute('aria-label',title);details.append(body);details.open=state.open(id,defaultOpen);summary.setAttribute('aria-expanded',String(details.open));
  body.inert=!details.open;
  const remember=()=>{state.remember(id,details.open);summary.setAttribute('aria-expanded',String(details.open));body.inert=!details.open;};
  const previous=details.ontoggle;details.ontoggle=()=>{if(details.isConnected){summary.setAttribute('aria-expanded',String(details.open));body.inert=!details.open;previous?.();}};
  summary.onkeydown=event=>{if(event.key===' '||event.key==='Enter')event.stopPropagation();};
  summary.onclick=event=>{event.preventDefault();if(event.target.closest('.inspector-module-description'))return;details.open=!details.open;remember();};
  // The nested disclosure bodies were built before this wrapper was added.
  for(const nested of body.querySelectorAll('details[data-inspector-section]'))if(!nested.classList.contains('inspector-module'))decorate(nested,nested.dataset.inspectorSection,nested.firstElementChild.textContent,nested.open);
  return details;
 }
 const initial=multiple?'modules.node':({shape:'modules.node',color:'editor.opacity',composite:'modules.blending',layout:'modules.node',animation:'modules.node'}[tab]??'modules.node');
 let bucket=null;const result=[];
 function start(key,title){const details=make('details',''),summary=doc.createElement('summary');summary.textContent=title;details.append(summary);bucket={key,title,details};}
 function flush(){if(!bucket)return;const {key,title,details}=bucket;if(details.childNodes.length>1)result.push(decorate(details,key,title,key!=='modules.levels'));bucket=null;}
 for(const child of [...host.children]){
  if(child.matches('.inspector-animation-mode,.selection-summary,.animation-tools')){flush();result.push(child);continue;}
  if(child.matches('h3[data-inspector-section]')){flush();start(child.dataset.inspectorSection,child.textContent);continue;}
  if(child.matches('.channel-curves-editor')){flush();const title=child.querySelector('h3')?.textContent??uiText('curves.title');child.querySelector('h3')?.remove();start('curves.title',title);bucket.details.append(child);flush();continue;}
  if(child.matches('details[data-inspector-section="modules.imageFilters"]')){flush();result.push(decorate(child,child.dataset.inspectorSection,child.firstElementChild.textContent,child.open));continue;}
  if(!bucket)start(initial,uiText(initial));bucket.details.append(child);
 }
 flush();host.replaceChildren(...result);
 const modules=()=>[...host.children].filter(child=>child.matches('details.inspector-module'));
 const defaults=modules().map(module=>module.dataset.module);
 if(tab==='shape'){
  const priority=['modules.shapeParameters','editor.nodeColors','modules.node','modules.generator'];
  defaults.sort((a,b)=>(priority.includes(a)?priority.indexOf(a):priority.length)-(priority.includes(b)?priority.indexOf(b):priority.length));
 }
 const ordered=state.order(tab,defaults);
 const byKey=new Map(modules().map(module=>[module.dataset.module,module]));for(const key of ordered)host.append(byKey.get(key));
 let dragging=null,preview=null,dragEvents=null,ghost=null,capture=null,scroll=null;
 function save(){state.rememberOrder(tab,modules().map(module=>module.dataset.module));}
 function clear(commit=false){dragEvents?.abort();dragEvents=null;scroll?.stop();scroll=null;if(capture?.grip.hasPointerCapture?.(capture.id))capture.grip.releasePointerCapture(capture.id);capture=null;const source=dragging;if(commit)preview?.commit();else preview?.cancel();if(ghost){const image=ghost,from=image.getBoundingClientRect(),to=source?.querySelector(':scope>summary').getBoundingClientRect(),animation=to&&animateUI(image,[{transform:'none',opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px)`,opacity:0}],{duration:commit?100:160});if(animation)animation.finished.then(()=>image.remove(),()=>image.remove());else image.remove();}ghost=null;preview=null;dragging=null;}
 for(const module of modules()){
  const header=module.querySelector(':scope>summary .inspector-module-heading'),title=module.querySelector(':scope>summary .inspector-module-title').textContent;
  const grip=make('button','module-drag-handle'),actions=make('span','module-order-actions');grip.type='button';grip.draggable=false;grip.append(editorIcon('drag',doc));grip.title=uiFormat('modules.dragToReorder',title);grip.setAttribute('aria-label',grip.title);grip.onclick=event=>{event.preventDefault();event.stopPropagation();};
  grip.onpointerdown=start=>{
   if(start.button!==0)return;start.preventDefault();start.stopPropagation();clear();grip.setPointerCapture?.(start.pointerId);capture={grip,id:start.pointerId};dragEvents=new AbortController();const options={capture:true,signal:dragEvents.signal};
   let pointerY=start.clientY;
   document.addEventListener('pointermove',event=>{if(event.pointerId!==start.pointerId)return;event.preventDefault();if(!dragging){if(Math.hypot(event.clientX-start.clientX,event.clientY-start.clientY)<6)return;dragging=module;preview=createReorderPreview(host,modules(),module);scroll=dragAutoScroll(host.closest('.tree-inspector')??host,()=>preview?.preview(pointerY));module.classList.add('module-dragging');ghost=make('div','module-drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.append((preview.dragImage??header).cloneNode(true));ghost.style.width=module.getBoundingClientRect().width+'px';doc.body.append(ghost);}pointerY=event.clientY;ghost.style.left=Math.max(8,Math.min(event.clientX-20,window.innerWidth-ghost.offsetWidth-8))+'px';ghost.style.top=(event.clientY-12)+'px';preview.preview(pointerY);scroll.update(pointerY);},options);
   document.addEventListener('pointerup',event=>{if(event.pointerId!==start.pointerId)return;const bounds=(host.closest('.tree-inspector')??host).getBoundingClientRect(),commit=!!dragging&&dragging.isConnected&&event.clientX>=bounds.left&&event.clientX<=bounds.right&&event.clientY>=bounds.top&&event.clientY<=bounds.bottom;clear(commit);if(commit)save();grip.focus({preventScroll:true});},options);
   document.addEventListener('pointercancel',event=>{if(event.pointerId===start.pointerId)clear();},options);
   grip.addEventListener('lostpointercapture',()=>clear(),options);
   window.addEventListener('blur',()=>clear(),{signal:dragEvents.signal});
   window.addEventListener('resize',()=>clear(),{signal:dragEvents.signal});
   document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();clear();grip.focus({preventScroll:true});}else if(dragging){if([' ','Enter','Tab'].includes(event.key))event.preventDefault();event.stopPropagation();}},options);
  };
  grip.onkeydown=event=>{
   if(!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopPropagation();
   const list=modules(),direction=event.key==='ArrowUp'?-1:1,target=list[list.indexOf(module)+direction];if(!target)return;
   const before=layoutRects(list);direction<0?host.insertBefore(module,target):host.insertBefore(module,target.nextSibling);save();animateLayout(list,before);grip.focus({preventScroll:true});
  };
  const pins=header.querySelector(':scope>.shortcut-pin-controls');if(pins)actions.prepend(pins);
  header.prepend(grip);header.insertBefore(actions,header.querySelector('.inspector-module-arrow'));
 }
}
