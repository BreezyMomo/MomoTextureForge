import {TreeRenderer} from './tree-renderer.js';
import {project,node,cloneNode} from './tree-model.js';
import {uiText,uiFormat,uiError} from './ui-language.js';
import {messageError} from './message-catalog.js';

// One offscreen GPU context, only for visible cards. Cached PNGs survive library filtering.
export function patternThumbnails(root){
 const cache=new Map(),queue=[];let renderer=null,pending=false;
 function setState(img,state,error){
  const frame=img.parentElement;frame.dataset.state=state;
  if(error!==undefined)img.thumbnailError=error;
  frame.setAttribute('aria-busy',String(state==='loading'));
  frame.setAttribute('aria-label',state==='ready'?img.alt:uiFormat('library.thumbnailState',img.alt,uiText(state==='loading'?'library.thumbnailLoading':'library.thumbnailFailed')));
  if(state==='ready'){img.dataset.ready='true';frame.removeAttribute('title');}
  else{delete img.dataset.ready;frame.title=state==='loading'?uiText('library.thumbnailLoading'):uiFormat('library.thumbnailFailedDetails',uiError(error));}
 }
 function placeholder(img){
  if(!img.parentElement?.classList.contains('tree-thumbnail-preview')){
   const frame=document.createElement('span'),indicator=document.createElement('span');frame.className='tree-thumbnail-preview';frame.setAttribute('role','img');indicator.className='tree-thumbnail-indicator';indicator.setAttribute('aria-hidden','true');img.replaceWith(frame);frame.append(img,indicator);
  }
  img.setAttribute('aria-hidden','true');
  img.onload=()=>setState(img,'ready');
  img.onerror=()=>{cache.delete(img.dataset.pattern);setState(img,'error',messageError('library.thumbnailDecodeFailed'));};
  setState(img,'loading');
 }
 const Observer=globalThis.IntersectionObserver??window.IntersectionObserver;
 const observer=Observer?new Observer(entries=>{
  for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);if(entry.target.parentElement?.dataset.state==='loading'&&!queue.includes(entry.target))queue.push(entry.target);}
  schedule();
 },{root,rootMargin:'80px'}):null;
 function schedule(){
  if(pending||!queue.length)return;pending=true;
  (window.requestIdleCallback?.bind(window)??(fn=>setTimeout(fn,20)))(()=>{
   pending=false;const img=queue.shift();
   if(img?.isConnected){
    try{
     const id=img.dataset.pattern;
     if(!cache.has(id)){
      renderer??=new TreeRenderer(document.createElement('canvas'));
      const state=project();state.root.children=[typeof img.component==='string'?node('shape',img.component):cloneNode(img.component)];
      renderer.draw(state,72,72,{time:.35});cache.set(id,renderer.canvas.toDataURL());
     }
     img.src=cache.get(id);
    }catch(error){cache.delete(img.dataset.pattern);setState(img,'error',error);}
   }
   schedule();
  },{timeout:300});
 }
 function resume(img){
  if(img.parentElement?.dataset.state!=='loading'||queue.includes(img))return;
  if(observer)observer.observe(img);else{queue.push(img);schedule();}
 }
 return {
  observe(img,id,component=id){observer?.unobserve(img);for(let i=queue.length-1;i>=0;i--)if(queue[i]===img)queue.splice(i,1);img.dataset.pattern=id;img.component=component;delete img.thumbnailError;placeholder(img);if(cache.has(id)){img.src=cache.get(id);}else resume(img);},
  resume,
  localize(img){const state=img.parentElement?.dataset.state;if(state)setState(img,state,img.thumbnailError);},
  forget(img){observer?.unobserve(img);for(let i=queue.length-1;i>=0;i--)if(queue[i]===img)queue.splice(i,1);cache.delete(img.dataset.pattern);},
  invalidate(id){cache.delete(id);},
  release(){observer?.disconnect();queue.length=0;renderer?.destroy();renderer=null;cache.clear();},
  reset(){observer?.disconnect();queue.length=0;}
 };
}
