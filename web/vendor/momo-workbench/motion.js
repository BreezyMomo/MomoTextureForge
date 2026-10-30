// Presentation helpers extracted from MomoTextureForge. Consumers own authored data.
export function createMotion({view}={}){
 let disposed=false;
 const running=new WeakMap(),animations=new Map(),scrolls=new Set(),previews=new Set(),disclosures=new Set();
 const preference=view?.matchMedia?.('(prefers-reduced-motion: reduce)');
 const reducedMotion=()=>preference?.matches??false;
 function forget(animation){
  const entry=animations.get(animation);if(!entry)return;
  animations.delete(animation);if(running.get(entry.element)===animation)running.delete(entry.element);
  animation.removeEventListener?.('finish',entry.done);animation.removeEventListener?.('cancel',entry.done);
 }
 function cancelAnimation(animation){if(!animation)return;try{animation.cancel();}finally{forget(animation);}}
 function cancelAnimations(){for(const animation of [...animations.keys()])cancelAnimation(animation);}
 const preferenceChanged=()=>{if(reducedMotion())cancelAnimations();};
 if(preference?.addEventListener)preference.addEventListener('change',preferenceChanged);
 else preference?.addListener?.(preferenceChanged);
 function animateUI(element,frames,{duration=160,...options}={}){
  cancelAnimation(running.get(element));
  if(disposed||reducedMotion()||typeof element?.animate!=='function')return null;
  const animation=element.animate(frames,{duration,easing:'cubic-bezier(.2,.75,.25,1)',...options});
  const done=()=>forget(animation);running.set(element,animation);animations.set(animation,{element,done});
  animation.addEventListener('finish',done,{once:true});animation.addEventListener('cancel',done,{once:true});
  return animation;
 }
 function layoutRects(elements,key=element=>element){
  return new Map([...elements].filter(element=>typeof element?.getBoundingClientRect==='function').map(element=>[key(element),element.getBoundingClientRect()]));
 }
 function animateLayout(elements,before,{key=element=>element,resize=false,duration=160}={}){
  let changed=false;
  for(const element of elements){
   const old=before.get(key(element));if(!old)continue;
   const next=element.getBoundingClientRect();if(!old.width||!old.height||!next.width||!next.height)continue;
   const dx=old.left-next.left,dy=old.top-next.top,sx=resize?old.width/next.width:1,sy=resize?old.height/next.height:1;
   if(Math.abs(dx)<.5&&Math.abs(dy)<.5&&Math.abs(sx-1)<.005&&Math.abs(sy-1)<.005)continue;
   changed=!!animateUI(element,[{transformOrigin:'0 0',transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`},{transformOrigin:'0 0',transform:'none'}],{duration})||changed;
  }
  return changed;
 }
 function dragAutoScroll(scroller,onScroll=()=>{}){
  let y=null,frame=null,active=false;
  const request=callback=>view?.requestAnimationFrame?.(callback)??null;
  const stop=()=>{active=false;if(frame!==null)view?.cancelAnimationFrame?.(frame);frame=null;scrolls.delete(stop);};
  function tick(){
   frame=null;if(disposed||!active){stop();return;}
   const box=scroller.getBoundingClientRect(),band=32,speed=y<box.top+band?-Math.min(12,(box.top+band-y)/3):y>box.bottom-band?Math.min(12,(y-box.bottom+band)/3):0;
   if(!speed){stop();return;}const before=scroller.scrollTop;scroller.scrollTop+=speed;
   if(scroller.scrollTop===before){stop();return;}onScroll();if(active&&!disposed)frame=request(tick);
  }
  return {update(clientY){
   if(disposed||!Number.isFinite(clientY))return;y=clientY;const box=scroller.getBoundingClientRect();
   if(y<box.top+32||y>box.bottom-32){active=true;scrolls.add(stop);if(frame===null)frame=request(tick);}else stop();
  },stop};
 }
 const computedTransform=element=>view?.getComputedStyle?.(element)?.transform??element.style.transform??'none';
 function createReorderPreview(host,items,source,{headingSelector=':scope > summary',summarySelector=':scope > summary',placeholderClass='momo-reorder-placeholder',draggingClass='momo-dragging'}={}){
  if(disposed)throw new Error('Motion service is disposed');
  const list=[...items];if(!list.length||!list.includes(source))throw new TypeError('Reorder source must belong to the item list');
  const rects=layoutRects(list),origin=host.getBoundingClientRect().top;
  if(rects.size!==list.length)throw new TypeError('Reorder items need measurable elements');
  const originalTransforms=new Map(list.map(element=>[element,{value:element.style.getPropertyValue?.('transform')??element.style.transform??'',priority:element.style.getPropertyPriority?.('transform')??'',computed:computedTransform(element)}]));
  const gaps=list.slice(1).map((element,index)=>rects.get(element).top-rects.get(list[index]).bottom).sort((a,b)=>a-b),gap=gaps[Math.floor(gaps.length/2)]??0;
  const placeholder=host.ownerDocument.createElement('div');placeholder.className=placeholderClass;placeholder.setAttribute('aria-hidden','true');placeholder.inert=true;
  const heading=headingSelector&&source.querySelector(headingSelector);if(heading)placeholder.append(heading.cloneNode(true));
  const rect=rects.get(source),hostRect=host.getBoundingClientRect();Object.assign(placeholder.style,{left:(rect.left-hostRect.left)+'px',top:(rect.top-origin)+'px',width:rect.width+'px',height:rect.height+'px'});host.append(placeholder);
  let order=list,active=true;
  function preview(clientY){
   if(disposed||!active)return;
   const y=clientY-(host.getBoundingClientRect().top-origin),rest=list.filter(element=>element!==source);
   let index=rest.findIndex(element=>{const rect=rects.get(element),heading=summarySelector&&element.querySelector(summarySelector);return y<rect.top+(heading?.offsetHeight??rect.height)/2;});if(index<0)index=rest.length;
   const next=[...rest.slice(0,index),source,...rest.slice(index)];if(next.every((element,i)=>element===order[i]))return;order=next;
   let top=rects.get(list[0]).top;
   for(const element of order){
    if(element===source)placeholder.style.top=(top-origin)+'px';
    else{const original=originalTransforms.get(element).computed,translate=`translateY(${top-rects.get(element).top}px)`,target=original&&original!=='none'?`${translate} ${original}`:translate,from=computedTransform(element);element.style.transform=target;animateUI(element,[{transform:from},{transform:target}]);}
    top+=rects.get(element).height+gap;
   }
  }
  function clear(){
   if(!active)return;active=false;previews.delete(clear);placeholder.remove();
   for(const element of list){cancelAnimation(running.get(element));const original=originalTransforms.get(element);if(original.value)element.style.setProperty('transform',original.value,original.priority);else element.style.removeProperty('transform');if(draggingClass)element.classList.remove(draggingClass);}
  }
  previews.add(clear);
  return {preview,placeholder,dragImage:placeholder.firstElementChild,
   commit(){if(!active||disposed)return;const before=layoutRects(list);before.set(source,placeholder.getBoundingClientRect());clear();for(const element of order)host.append(element);animateLayout(list,before);},
   cancel(){if(!active||disposed)return;const before=layoutRects(list);clear();animateLayout(list,before);animateUI(source,[{opacity:0},{opacity:1}],{duration:120});}};
 }
 function bindDisclosure(details,{bodySelector=':scope > .momo-disclosure-body'}={}){
  if(disposed)throw new Error('Motion service is disposed');
  const body=details.querySelector(bodySelector);if(!body)throw new TypeError('Disclosure body is missing');
  const initial=body.inert;let active=true;
  const sync=()=>{if(active)body.inert=!details.open;};sync();
  const Observer=view?.MutationObserver,observer=Observer?new Observer(sync):null;observer?.observe(details,{attributes:true,attributeFilter:['open']});
  const summary=details.querySelector(':scope > summary'),afterClick=()=>Promise.resolve().then(sync);
  details.addEventListener('toggle',sync);summary?.addEventListener('click',afterClick);
  const cleanup=()=>{if(!active)return;active=false;observer?.disconnect();details.removeEventListener('toggle',sync);summary?.removeEventListener('click',afterClick);body.inert=initial;disclosures.delete(cleanup);};
  disclosures.add(cleanup);return cleanup;
 }
 function dispose(){
  if(disposed)return;disposed=true;
  for(const cleanup of [...previews])cleanup();for(const stop of [...scrolls])stop();for(const cleanup of [...disclosures])cleanup();cancelAnimations();
  if(preference?.removeEventListener)preference.removeEventListener('change',preferenceChanged);else preference?.removeListener?.(preferenceChanged);
 }
 return {animateUI,layoutRects,animateLayout,dragAutoScroll,createReorderPreview,bindDisclosure,reducedMotion,dispose};
}
