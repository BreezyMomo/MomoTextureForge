import {TreeRenderer} from './tree-renderer.js';
import {project,node,cloneNode} from './tree-model.js';

// One offscreen GPU context, only for visible cards. Cached PNGs survive library filtering.
export function patternThumbnails(root){
 const cache=new Map(),queue=[];let renderer=null,pending=false;
 const Observer=globalThis.IntersectionObserver??window.IntersectionObserver;
 const observer=Observer?new Observer(entries=>{
  for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);queue.push(entry.target);}
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
     img.src=cache.get(id);img.dataset.ready='true';
    }catch(error){img.alt='预览不可用';img.title='预览不可用：'+error.message+'；仍可点击查看或添加';}
   }
   schedule();
  },{timeout:300});
 }
 return {
  observe(img,id,component=id){img.dataset.pattern=id;img.component=component;if(cache.has(id)){img.src=cache.get(id);img.dataset.ready='true';}else if(observer)observer.observe(img);else{queue.push(img);schedule();}},
  invalidate(id){cache.delete(id);},
  release(){observer?.disconnect();queue.length=0;renderer?.destroy();renderer=null;cache.clear();},
  reset(){observer?.disconnect();queue.length=0;}
 };
}
