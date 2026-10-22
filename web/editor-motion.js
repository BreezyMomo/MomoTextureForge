// Presentation only: these helpers never write projects, history or preferences.
const running=new WeakMap(),animations=new Set(),preference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
preference?.addEventListener('change',()=>{if(preference.matches)for(const animation of animations)animation.cancel();});
export const reducedMotion=()=>preference?.matches??false;
export function animateUI(element,frames,{duration=160,...options}={}){
 running.get(element)?.cancel();running.delete(element);
 if(reducedMotion()||!element.animate)return null;
 const animation=element.animate(frames,{duration,easing:'cubic-bezier(.2,.75,.25,1)',...options});running.set(element,animation);animations.add(animation);
 const done=()=>{animations.delete(animation);if(running.get(element)===animation)running.delete(element);};animation.addEventListener('finish',done,{once:true});animation.addEventListener('cancel',done,{once:true});return animation;
}
export function layoutRects(elements,key=element=>element){
 return new Map([...elements].filter(element=>element.getBoundingClientRect).map(element=>[key(element),element.getBoundingClientRect()]));
}
export function animateLayout(elements,before,{key=element=>element,resize=false,duration=160}={}){
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
export function dragAutoScroll(scroller,onScroll){
 let y=null,frame=0;
 const stop=()=>{cancelAnimationFrame(frame);frame=0;};
 function tick(){frame=0;const box=scroller.getBoundingClientRect(),band=32,speed=y<box.top+band?-Math.min(12,(box.top+band-y)/3):y>box.bottom-band?Math.min(12,(y-box.bottom+band)/3):0;if(!speed)return;const before=scroller.scrollTop;scroller.scrollTop+=speed;if(scroller.scrollTop!==before){onScroll();frame=requestAnimationFrame(tick);}}
 return {update(clientY){y=clientY;const box=scroller.getBoundingClientRect();if(y<box.top+32||y>box.bottom-32){if(!frame)frame=requestAnimationFrame(tick);}else stop();},stop};
}
// Preview a permutation with transforms. The source DOM order stays untouched
// until the owner commits the drop; cancellation restores that same order.
export function createReorderPreview(host,items,source){
 const list=[...items],rects=layoutRects(list),origin=host.getBoundingClientRect().top;
 const gaps=list.slice(1).map((element,index)=>rects.get(element).top-rects.get(list[index]).bottom).sort((a,b)=>a-b),gap=gaps[Math.floor(gaps.length/2)]??0;
 const placeholder=host.ownerDocument.createElement('div');placeholder.className='module-sort-placeholder';placeholder.setAttribute('aria-hidden','true');placeholder.inert=true;
 const heading=source.querySelector(':scope>summary .inspector-module-heading');if(heading)placeholder.append(heading.cloneNode(true));
 const rect=rects.get(source),hostRect=host.getBoundingClientRect();Object.assign(placeholder.style,{left:(rect.left-hostRect.left)+'px',top:(rect.top-origin)+'px',width:rect.width+'px',height:rect.height+'px'});host.append(placeholder);
 let order=list;
 function preview(clientY){
  const y=clientY-(host.getBoundingClientRect().top-origin),rest=list.filter(element=>element!==source);
  let index=rest.findIndex(element=>{const rect=rects.get(element),heading=element.querySelector(':scope>summary');return y<rect.top+(heading?.offsetHeight??rect.height)/2;});if(index<0)index=rest.length;
  const next=[...rest.slice(0,index),source,...rest.slice(index)];if(next.every((element,i)=>element===order[i]))return;order=next;
  let top=rects.get(list[0]).top;
  for(const element of order){if(element===source)placeholder.style.top=(top-origin)+'px';else{const target=`translateY(${top-rects.get(element).top}px)`,from=getComputedStyle(element).transform;element.style.transform=target;animateUI(element,[{transform:from},{transform:target}]);}top+=rects.get(element).height+gap;}
 }
 function clear(){placeholder.remove();for(const element of list){running.get(element)?.cancel();element.style.removeProperty('transform');element.classList.remove('module-dragging');}}
 return {preview,dragImage:placeholder.firstElementChild,commit(){const before=layoutRects(list);before.set(source,placeholder.getBoundingClientRect());clear();for(const element of order)host.append(element);animateLayout(list,before);},cancel(){const before=layoutRects(list);clear();animateLayout(list,before);animateUI(source,[{opacity:0},{opacity:1}],{duration:120});}};
}
