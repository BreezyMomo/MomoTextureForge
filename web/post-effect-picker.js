import {uiText,uiFormat,uiError} from './ui-language.js';
import {interfaceLanguage} from './language.js';
import {EFFECT_CATEGORIES,matchingEffects} from './post-effect-catalog.js';
import {makeDialogMovable} from './movable-dialog.js';
let active=null;
export function reconcilePostEffectPicker(context){if(!active)return;if(active.context!==context||active.language!==interfaceLanguage())active.close(false);else active.refresh();}
export function openPostEffectPicker({document:doc,anchor,context,settings,present,onAdd}){
 active?.close(false);const language=interfaceLanguage(),snapshot=structuredClone(settings),dialog=doc.createElement('dialog');
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
 let closed=false,preview=null,initializing=null,running=false,observer=null;const queue=[],cache=new Map(),view=doc.defaultView;
 function clamp(){if(closed)return;const box=dialog.getBoundingClientRect();dialog.style.left=Math.max(8,Math.min(box.left,view.innerWidth-box.width-8))+'px';dialog.style.top=Math.max(8,Math.min(box.top,view.innerHeight-box.height-8))+'px';}
 function close(focus=true){if(closed)return;closed=true;observer?.disconnect();queue.length=0;preview?.destroy();preview=null;doc.removeEventListener('keydown',escape,true);view.removeEventListener('resize',clamp);if(dialog.open)dialog.close();dialog.remove();if(active?.dialog===dialog)active=null;if(focus){const target=anchor.isConnected?anchor:doc.querySelector('#inspector .post-effects-add');target?.focus({preventScroll:true});}}
 function escape(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}
 async function drain(){
  if(running||closed)return;running=true;
  try{
   initializing??=import('./post-effect-preview.js');const {createPostEffectPreview}=await initializing;if(closed)return;
   preview??=createPostEffectPreview(doc,snapshot);
   while(queue.length&&!closed){const {id,canvas,label}=queue.shift();if(!canvas.isConnected)continue;
    try{const data=cache.get(id)??preview.draw(id);cache.set(id,data);canvas.getContext('2d').putImageData(data,0,0);label.hidden=true;}catch(error){label.textContent=uiText('fx.previewUnavailable');canvas.hidden=true;canvas.title=uiError(error);}
    await new Promise(resolve=>setTimeout(resolve,0));
   }
  }catch(error){if(!closed)for(const label of grid.querySelectorAll('.post-effect-preview-state'))label.textContent=uiText('fx.previewUnavailable');}
  finally{running=false;}
 }
 function observe(canvas,label,id){
  if(cache.has(id)){canvas.getContext('2d').putImageData(cache.get(id),0,0);label.hidden=true;return;}
  canvas.effectPreview={id,canvas,label};observer.observe(canvas);
 }
 function refreshActions(){for(const item of grid.querySelectorAll('[data-effect-choice]')){const state=present(item.dataset.effectChoice),action=item.querySelector('button'),name=item.querySelector('strong').textContent;action.disabled=state===true;action.textContent=uiText(state===true?'fx.alreadyAdded':state===undefined?'fx.addToAll':'fx.addEffect');action.setAttribute('aria-label',uiFormat(state===undefined?'fx.addNamedToAll':'fx.addNamed',name));}}
 function render(){
  observer?.disconnect();queue.length=0;grid.replaceChildren();clear.disabled=!search.value;
  observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);queue.push(entry.target.effectPreview);}void drain();},{root:grid,rootMargin:'80px'});
  const effects=matchingEffects(search.value,category.value);resultCount.textContent=uiFormat('fx.resultCount',effects.length);
  if(!effects.length)grid.append(el('p','tree-note post-effect-picker-empty',uiText('fx.noMatches')));
  for(const spec of effects){
   const item=el('article','post-effect-choice');item.dataset.effectChoice=spec.id;
   const image=el('div','post-effect-choice-image'),canvas=el('canvas'),label=el('span','tree-note post-effect-preview-state',uiText('fx.previewLoading'));canvas.width=120;canvas.height=90;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',uiFormat('fx.previewOf',uiText(spec.label)));image.append(canvas,label);
   const name=el('strong','',uiText(spec.label)),description=el('p','tree-note',uiText('fx.summary.'+spec.id)),state=present(spec.id);
   const action=button(uiText(state===true?'fx.alreadyAdded':state===undefined?'fx.addToAll':'fx.addEffect'),uiFormat(state===undefined?'fx.addNamedToAll':'fx.addNamed',uiText(spec.label)),()=>{
    if(closed)return;const added=onAdd(spec.id);if(closed)return;if(added===false){status.textContent=uiText('fx.addBlocked');return;}status.textContent=uiFormat('fx.addedNamed',uiText(spec.label));refreshActions();
   });action.disabled=state===true;item.append(image,name,description,action);grid.append(item);observe(canvas,label,spec.id);
  }
 }
 search.oninput=()=>{grid.scrollTop=0;render();};category.onchange=()=>{grid.scrollTop=0;render();};
 dialog.addEventListener('close',()=>close(false));dialog.addEventListener('keydown',event=>event.stopPropagation());doc.addEventListener('keydown',escape,true);
 active={context,language,dialog,close,refresh:refreshActions};dialog.show();makeDialogMovable(dialog);
 const a=anchor.getBoundingClientRect(),box=dialog.getBoundingClientRect();view.addEventListener('resize',clamp);
 Object.assign(dialog.style,{position:'fixed',margin:'0',inset:'auto',left:Math.max(8,Math.min(a.left-box.width-12,view.innerWidth-box.width-8))+'px',top:Math.max(8,Math.min(a.top,view.innerHeight-box.height-8))+'px'});
 render();search.focus();return {close,dialog};
}
