import {TreeRenderer} from './tree-renderer.js';
import {project,node,cloneNode} from './tree-model.js';
import {uiText,uiFormat,uiError} from './ui-language.js';
import {messageError} from './message-catalog.js';
import {thumbnailVisualKey,thumbnailCacheKey} from './thumbnail-source.js';
import {createThumbnailCache} from './thumbnail-cache.js';

// PNG/cache reads may overlap; GPU work stays on one bounded, visible-first lane.
export function patternThumbnails(root){
 const cache=new Map(),queue=new Set(),near=new Set(),jobs=new WeakMap(),keys=new Map(),stored=createThumbnailCache();
 let renderer=null,pending=null,released=false;
 const idle=window.requestIdleCallback?.bind(window)??(callback=>setTimeout(()=>callback({timeRemaining:()=>8}),16));
 const cancel=window.cancelIdleCallback?.bind(window)??clearTimeout;
 function remember(key,src){cache.delete(key);cache.set(key,src);while(cache.size>512)cache.delete(cache.keys().next().value);}
 function current(job){return !!job&&!released&&jobs.get(job.img)===job;}
 function setState(img,state,error){
  const frame=img.parentElement;if(!frame)return;frame.dataset.state=state;
  if(error!==undefined)img.thumbnailError=error;
  frame.setAttribute('aria-busy',String(state==='loading'));
  frame.setAttribute('aria-label',state==='ready'?img.alt:uiFormat('library.thumbnailState',img.alt,uiText(state==='loading'?'library.thumbnailLoading':'library.thumbnailFailed')));
  if(state==='ready'){img.dataset.ready='true';frame.removeAttribute('title');}
  else{delete img.dataset.ready;frame.title=state==='loading'?uiText('library.thumbnailLoading'):uiFormat('library.thumbnailFailedDetails',uiError(error));}
  if(state!=='loading'){observer?.unobserve(img);queue.delete(img);near.delete(img);}
 }
 function use(job,src,origin){
  if(!current(job))return;job.origin=origin;job.src=src;remember(job.memoryKey,src);
  if(job.img.src===src&&job.img.complete&&job.img.naturalWidth)setState(job.img,'ready');else job.img.src=src;
 }
 function placeholder(img,job){
  if(!img.parentElement?.classList.contains('tree-thumbnail-preview')){
   const frame=document.createElement('span'),indicator=document.createElement('span');frame.className='tree-thumbnail-preview';frame.setAttribute('role','img');indicator.className='tree-thumbnail-indicator';indicator.setAttribute('aria-hidden','true');img.replaceWith(frame);frame.append(img,indicator);
  }
  img.setAttribute('aria-hidden','true');img.decoding='async';
  img.onload=()=>{if(current(job)&&job.src&&img.src===job.src)setState(img,'ready');};
  img.onerror=()=>{
   if(!current(job))return;cache.delete(job.memoryKey);void stored.remove(job.key);
   if(job.origin==='stored'||job.origin==='builtin'){
    job.origin=null;job.read=true;job.fallback=true;setState(img,'loading');resume(img);
   }else setState(img,'error',messageError('library.thumbnailDecodeFailed'));
  };
  setState(img,'loading');
 }
 async function prepare(job){
  if(job.read||job.reading)return;job.reading=true;
  try{job.key=await thumbnailCacheKey(job.img.component);if(!current(job))return;const src=await stored.get(job.key);if(!current(job))return;if(src){use(job,src,'stored');return;}}
  catch{/* Storage/crypto availability must never prevent a preview. */}
  finally{job.reading=false;}
  if(current(job)){job.read=true;if(near.has(job.img)){queue.add(job.img);schedule();}}
 }
 const Observer=globalThis.IntersectionObserver??window.IntersectionObserver;
 const observer=Observer?new Observer(entries=>{
  for(const entry of entries){const img=entry.target,job=jobs.get(img);if(!job||img.parentElement?.dataset.state!=='loading')continue;
   if(entry.isIntersecting){near.add(img);if(job.read)queue.add(img);else void prepare(job);}
   else{near.delete(img);queue.delete(img);}
  }
  schedule();
 },{root,rootMargin:'80px'}):null;
 function take(){
  const bounds=root?.getBoundingClientRect()??{top:0,left:0,bottom:innerHeight,right:innerWidth};let best=null,priority=Infinity;
  for(const img of queue){const job=jobs.get(img);if(!img.isConnected||!current(job)||!near.has(img)||img.parentElement?.dataset.state!=='loading'){queue.delete(img);continue;}
   const rect=img.getBoundingClientRect();if(!rect.width||!rect.height){queue.delete(img);continue;}
   const visible=rect.bottom>Math.max(0,bounds.top)&&rect.top<Math.min(innerHeight,bounds.bottom)&&rect.right>Math.max(0,bounds.left)&&rect.left<Math.min(innerWidth,bounds.right);
   const rank=visible?0:1;if(rank<priority){best=img;priority=rank;if(rank===0)break;}
  }
  if(best)queue.delete(best);return best;
 }
 function schedule(){
  if(released||pending!==null||!queue.size)return;
  pending=idle((deadline={timeRemaining:()=>0})=>{
   pending=null;const start=performance.now();let count=0,img;
   while(count<3&&performance.now()-start<8&&(count===0||deadline.timeRemaining()>2)&&(img=take())){
    const job=jobs.get(img);count++;
    try{
     const cached=cache.get(job.memoryKey);if(cached&&!job.fallback){use(job,cached,'memory');continue;}
     renderer??=new TreeRenderer(document.createElement('canvas'));
     const state=project();state.root.children=[typeof img.component==='string'?node('shape',img.component):cloneNode(img.component)];
     renderer.draw(state,72,72,{time:.35});const src=renderer.canvas.toDataURL();use(job,src,'rendered');void stored.put(job.key,src);
    }catch(error){cache.delete(job.memoryKey);setState(img,'error',error);}
   }
   schedule();
  },{timeout:100});
 }
 function resume(img){
  const job=jobs.get(img);if(!job||img.parentElement?.dataset.state!=='loading')return;
  if(observer){observer.observe(img);if(near.has(img)&&job.read){queue.add(img);schedule();}}
  else{near.add(img);if(job.read){queue.add(img);schedule();}else void prepare(job);}
 }
 function reset(){observer?.disconnect();queue.clear();near.clear();if(pending!==null)cancel(pending);pending=null;}
 return {
  observe(img,id,component=id,options={}){
   observer?.unobserve(img);queue.delete(img);near.delete(img);img.dataset.pattern=id;img.component=component;delete img.thumbnailError;
   const memoryKey=(options.source?'builtin:':'render:')+(options.visualKey??thumbnailVisualKey(component)),job={img,memoryKey,read:false,reading:false,key:null};jobs.set(img,job);keys.set(id,memoryKey);placeholder(img,job);
   if(options.source)use(job,options.source,'builtin');else if(cache.has(memoryKey))use(job,cache.get(memoryKey),'memory');else resume(img);
  },
  resume,
  localize(img){const state=img.parentElement?.dataset.state;if(state)setState(img,state,img.thumbnailError);},
  forget(img){observer?.unobserve(img);queue.delete(img);near.delete(img);keys.delete(img.dataset.pattern);jobs.delete(img);},
  invalidate(id){const key=keys.get(id);if(key)cache.delete(key);keys.delete(id);},
  release(){released=true;reset();renderer?.destroy();renderer=null;cache.clear();keys.clear();stored.close();},
  reset
 };
}
