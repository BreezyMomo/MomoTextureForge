import {uiText,uiFormat,uiError} from './ui-language.js';
import {interfaceLanguage} from './language.js';
import {EFFECT_CATEGORIES,matchingEffects} from './post-effect-catalog.js';
import {effectPreviewSpec,EFFECT_PREVIEW_SIZE} from './post-effect-specimens.js';
import {makeDialogMovable} from './movable-dialog.js';
let active=null;
export function reconcilePostEffectPicker(context){if(!active)return;if(active.context!==context||active.language!==interfaceLanguage())active.close(false);else active.refresh();}
export function openPostEffectPicker({document:doc,anchor,context,present,onAdd}){
 active?.close(false);const language=interfaceLanguage(),dialog=doc.createElement('dialog');
 dialog.className='post-effect-picker';dialog.setAttribute('aria-label',uiText('fx.addEffects'));
 const el=(tag,className,text)=>{const e=doc.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
 const button=(text,label,action)=>{const b=el('button','',text);b.type='button';b.setAttribute('aria-label',label);b.onclick=action;return b;};
 const header=el('header'),title=el('strong','',uiText('fx.addEffects')),closeButton=button('×',uiText('common.close'),()=>close());header.append(title,closeButton);
 const searchRow=el('div','post-effect-picker-search'),search=el('input');search.type='search';search.maxLength=200;search.placeholder=uiText('fx.searchPlaceholder');search.setAttribute('aria-label',uiText('fx.searchEffects'));
 const clear=button('×',uiText('fx.clearSearch'),()=>{search.value='';render();search.focus();});searchRow.append(search,clear);
 const filters=el('div','post-effect-picker-filters'),category=el('select');category.setAttribute('aria-label',uiText('fx.category'));
 for(const key of ['all',...EFFECT_CATEGORIES]){const option=el('option','',uiText('fx.category.'+key));option.value=key;category.append(option);}
 const resultCount=el('span','tree-note');resultCount.setAttribute('aria-live','polite');filters.append(category,resultCount);
 const note=el('p','tree-note',uiText('fx.previewSpecimen')),grid=el('div','post-effect-picker-grid'),status=el('p','tree-note post-effect-picker-status');status.setAttribute('aria-live','polite');
 dialog.append(header,searchRow,filters,note,grid,status);doc.body.append(dialog);
 let closed=false,preview=null,initializing=null,running=false,observer=null;const queue=[],cache=new Map(),view=doc.defaultView,motionPreference=view.matchMedia('(prefers-reduced-motion: reduce)');let moving=null,motionFrame=0,motionStart=0,lastFrame=0;
 function clamp(){if(closed)return;const box=dialog.getBoundingClientRect();dialog.style.left=Math.max(8,Math.min(box.left,view.innerWidth-box.width-8))+'px';dialog.style.top=Math.max(8,Math.min(box.top,view.innerHeight-box.height-8))+'px';}
 function close(focus=true){if(closed)return;closed=true;stopMotion();observer?.disconnect();queue.length=0;preview?.destroy();preview=null;doc.removeEventListener('keydown',escape,true);view.removeEventListener('resize',clamp);view.removeEventListener('blur',stopMotion);view.removeEventListener('focus',resumeMotion);doc.removeEventListener('visibilitychange',visibility);motionPreference.removeEventListener('change',motionChanged);if(dialog.open)dialog.close();dialog.remove();if(active?.dialog===dialog)active=null;if(focus){const target=anchor.isConnected?anchor:doc.querySelector('#inspector .post-effects-add');target?.focus({preventScroll:true});}}
 function escape(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}
 function paint(entry,data){
  entry.data=data;const ctx=entry.canvas.getContext('2d'),split=Math.round(entry.canvas.width*Number(entry.compare.value)/100);
  ctx.putImageData(data.before,0,0);if(split<entry.canvas.width)ctx.putImageData(data.after,0,0,split,0,entry.canvas.width-split,entry.canvas.height);
  entry.image.style.setProperty('--compare-position',entry.compare.value+'%');entry.beforeLabel.hidden=Number(entry.compare.value)<15;entry.afterLabel.hidden=Number(entry.compare.value)>85;entry.label.hidden=true;entry.compare.disabled=false;entry.item.dataset.previewState='ready';
 }
 function stopMotion(){
  view.cancelAnimationFrame(motionFrame);motionFrame=0;if(moving){moving.image.dataset.animating='false';if(moving.canvas.isConnected&&cache.has(moving.id))paint(moving,cache.get(moving.id));}moving=null;
 }
 function animate(now){
  const entry=moving;if(!entry||closed||!entry.canvas.isConnected||!entry.visible||doc.hidden){stopMotion();return;}
  if(now-lastFrame>=125){try{paint(entry,preview.pair(entry.id,.85+(now-motionStart)/1000));lastFrame=now;}catch(error){entry.motionFailed=true;stopMotion();entry.canvas.title=uiError(error);return;}}
  motionFrame=view.requestAnimationFrame(animate);
 }
 function startMotion(entry){
  if(!preview||!entry.data||!entry.visible||!entry.demo.motion||entry.motionFailed||motionPreference.matches||doc.hidden||moving===entry||(!entry.hovered&&!entry.focused))return;
  stopMotion();moving=entry;entry.image.dataset.animating='true';motionStart=view.performance.now();lastFrame=0;motionFrame=view.requestAnimationFrame(animate);
 }
 function resumeMotion(){const entry=[...grid.querySelectorAll('canvas')].map(c=>c.effectPreview).find(e=>e.hovered||e.focused);if(entry)startMotion(entry);}
 function visibility(){if(doc.hidden)stopMotion();else resumeMotion();}
 function motionChanged(){stopMotion();for(const badge of grid.querySelectorAll('.post-effect-motion-hint'))badge.hidden=motionPreference.matches;resumeMotion();}
 async function drain(){
  if(running||closed)return;running=true;
  try{
   initializing??=import('./post-effect-preview.js');const {createPostEffectPreview}=await initializing;if(closed)return;
   preview??=createPostEffectPreview(doc);
   while(queue.length&&!closed){const entry=queue.shift();entry.queued=false;if(!entry.canvas.isConnected)continue;
    try{const data=cache.get(entry.id)??preview.pair(entry.id);cache.set(entry.id,data);paint(entry,data);startMotion(entry);}catch(error){entry.label.textContent=uiText('fx.previewUnavailable');entry.canvas.hidden=true;entry.canvas.title=uiError(error);entry.item.dataset.previewState='error';}
    await new Promise(resolve=>setTimeout(resolve,0));
   }
  }catch(error){if(!closed)for(const label of grid.querySelectorAll('.post-effect-preview-state'))label.textContent=uiText('fx.previewUnavailable');}
  finally{running=false;}
 }
 function observe(entry){
  entry.canvas.effectPreview=entry;if(cache.has(entry.id))paint(entry,cache.get(entry.id));observer.observe(entry.canvas);
 }
 function comparison(image,canvas,label,item,id){
  const compare=el('input','post-effect-comparison');compare.type='range';compare.min='0';compare.max='100';compare.value='25';compare.disabled=true;compare.setAttribute('aria-label',uiFormat('fx.comparePreview',uiText('fx.effect.'+id)));
  const before=el('span','post-effect-compare-label post-effect-compare-before',uiText('fx.previewBefore')),after=el('span','post-effect-compare-label post-effect-compare-after',uiText('fx.previewAfter')),divider=el('span','post-effect-compare-divider');divider.setAttribute('aria-hidden','true');
  const entry={id,canvas,label,image,item,compare,beforeLabel:before,afterLabel:after,demo:effectPreviewSpec(id),visible:false,hovered:false,focused:false};
  image.dataset.transparency=String(entry.demo.transparency);image.dataset.animating='false';image.style.setProperty('--compare-position',compare.value+'%');image.append(before,after,divider,compare);
  if(entry.demo.motion){const badge=el('span','post-effect-motion-hint',uiText('fx.previewMotion'));badge.hidden=motionPreference.matches;image.append(badge);}
  compare.oninput=()=>{if(entry.data)paint(entry,entry.data);};
  image.onpointerenter=()=>{entry.hovered=true;startMotion(entry);};image.onpointerleave=()=>{entry.hovered=false;if(moving===entry&&!entry.focused)stopMotion();};
  compare.onfocus=()=>{entry.focused=compare.matches(':focus-visible');startMotion(entry);};compare.onblur=()=>{entry.focused=false;if(moving===entry&&!entry.hovered)stopMotion();};
  const move=event=>{if(compare.disabled)return;const rect=image.getBoundingClientRect();compare.value=Math.max(0,Math.min(100,Math.round((event.clientX-rect.left)/rect.width*100)));compare.oninput();};
  let pointer=null;image.onpointerdown=event=>{if(event.button!==0||compare.disabled)return;event.preventDefault();event.stopPropagation();pointer=event.pointerId;compare.focus({preventScroll:true});image.setPointerCapture(pointer);move(event);};image.onpointermove=event=>{if(event.pointerId===pointer)move(event);};
  const release=event=>{if(event.pointerId!==pointer)return;pointer=null;if(image.hasPointerCapture(event.pointerId))image.releasePointerCapture(event.pointerId);};image.onpointerup=release;image.onpointercancel=release;image.onlostpointercapture=()=>{pointer=null;};
  return entry;
 }
 function refreshActions(){for(const item of grid.querySelectorAll('[data-effect-choice]')){const state=present(item.dataset.effectChoice),action=item.querySelector('button'),name=item.querySelector('strong').textContent;action.disabled=state===true;action.textContent=uiText(state===true?'fx.alreadyAdded':state===undefined?'fx.addToAll':'fx.addEffect');action.setAttribute('aria-label',uiFormat(state===undefined?'fx.addNamedToAll':'fx.addNamed',name));}}
 function render(){
  stopMotion();observer?.disconnect();queue.length=0;grid.replaceChildren();clear.disabled=!search.value;
  observer=new IntersectionObserver(entries=>{for(const observed of entries){const entry=observed.target.effectPreview;entry.visible=observed.isIntersecting;if(!entry.visible){if(moving===entry)stopMotion();continue;}if(!entry.data&&!entry.queued){entry.queued=true;queue.push(entry);}else startMotion(entry);}if(queue.length)void drain();},{root:grid,rootMargin:'40px'});
  const effects=matchingEffects(search.value,category.value);resultCount.textContent=uiFormat('fx.resultCount',effects.length);
  if(!effects.length)grid.append(el('p','tree-note post-effect-picker-empty',uiText('fx.noMatches')));
  for(const spec of effects){
   const item=el('article','post-effect-choice');item.dataset.effectChoice=spec.id;
   const image=el('div','post-effect-choice-image'),canvas=el('canvas'),label=el('span','tree-note post-effect-preview-state',uiText('fx.previewLoading'));[canvas.width,canvas.height]=EFFECT_PREVIEW_SIZE;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',uiFormat('fx.previewOf',uiText(spec.label)));image.append(canvas,label);
   const name=el('strong','',uiText(spec.label)),description=el('p','tree-note',uiText('fx.summary.'+spec.id)),state=present(spec.id);
   const action=button(uiText(state===true?'fx.alreadyAdded':state===undefined?'fx.addToAll':'fx.addEffect'),uiFormat(state===undefined?'fx.addNamedToAll':'fx.addNamed',uiText(spec.label)),()=>{
    if(closed)return;const added=onAdd(spec.id);if(closed)return;if(added===false){status.textContent=uiText('fx.addBlocked');return;}status.textContent=uiFormat('fx.addedNamed',uiText(spec.label));refreshActions();
   });action.disabled=state===true;item.dataset.previewState='loading';item.append(image,name,description,action);grid.append(item);observe(comparison(image,canvas,label,item,spec.id));
  }
 }
 search.oninput=()=>{grid.scrollTop=0;render();};category.onchange=()=>{grid.scrollTop=0;render();};
 dialog.addEventListener('close',()=>close(false));dialog.addEventListener('keydown',event=>event.stopPropagation());doc.addEventListener('keydown',escape,true);
 view.addEventListener('blur',stopMotion);view.addEventListener('focus',resumeMotion);doc.addEventListener('visibilitychange',visibility);motionPreference.addEventListener('change',motionChanged);
 active={context,language,dialog,close,refresh:refreshActions};dialog.show();makeDialogMovable(dialog);
 const a=anchor.getBoundingClientRect(),box=dialog.getBoundingClientRect();view.addEventListener('resize',clamp);
 Object.assign(dialog.style,{position:'fixed',margin:'0',inset:'auto',left:Math.max(8,Math.min(a.left-box.width-12,view.innerWidth-box.width-8))+'px',top:Math.max(8,Math.min(a.top,view.innerHeight-box.height-8))+'px'});
 render();search.focus();return {close,dialog};
}
