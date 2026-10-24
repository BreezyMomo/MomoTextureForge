import {onLanguageChange} from './language.js';

const activeHelp=new WeakMap();
let nextId=0;

// Only the open tip owns document listeners; rebuilt inspectors leave no overlays behind.
export function hoverHelp(button,text){
 const doc=button.ownerDocument,win=doc.defaultView;
 let tip=null,showTimer=null,hideTimer=null,cleanup=null,touch=false;
 const cancelTimers=()=>{win.clearTimeout(showTimer);win.clearTimeout(hideTimer);};
 const close=()=>{
  cancelTimers();cleanup?.();cleanup=null;tip?.remove();tip=null;
  button.removeAttribute('aria-describedby');button.setAttribute('aria-expanded','false');
  if(activeHelp.get(doc)===close)activeHelp.delete(doc);
 };
 const show=()=>{
  cancelTimers();if(tip||!button.isConnected)return;
  activeHelp.get(doc)?.();activeHelp.set(doc,close);
  tip=doc.createElement('div');tip.className='inspector-help-tooltip';tip.id='inspector-help-'+(++nextId);
  tip.setAttribute('role','tooltip');tip.setAttribute('popover','manual');tip.textContent=text;
  doc.body.append(tip);tip.showPopover();
  button.setAttribute('aria-describedby',tip.id);button.setAttribute('aria-expanded','true');
  const anchor=button.getBoundingClientRect(),bounds=tip.getBoundingClientRect(),gap=8;
  tip.style.left=Math.max(gap,Math.min(anchor.right-bounds.width,win.innerWidth-bounds.width-gap))+'px';
  const below=anchor.bottom+6,above=anchor.top-bounds.height-6;
  tip.style.top=Math.max(gap,Math.min(below+bounds.height<=win.innerHeight-gap?below:above,win.innerHeight-bounds.height-gap))+'px';
  tip.addEventListener('pointerenter',cancelTimers);
  tip.addEventListener('pointerleave',scheduleClose);
  const events=new win.AbortController(),options={capture:true,signal:events.signal};
  doc.addEventListener('pointerdown',event=>{if(!button.contains(event.target)&&!tip.contains(event.target))close();},options);
  doc.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}},options);
  doc.addEventListener('scroll',event=>{if(!tip.contains(event.target))close();},options);
  win.addEventListener('resize',close,{signal:events.signal});win.addEventListener('blur',close,{signal:events.signal});
  const observer=new win.MutationObserver(()=>{if(!button.isConnected)close();});
  observer.observe(doc.body,{childList:true,subtree:true});
  const unsubscribe=onLanguageChange(close);
  cleanup=()=>{events.abort();observer.disconnect();unsubscribe();};
 };
 function scheduleClose(){win.clearTimeout(showTimer);win.clearTimeout(hideTimer);hideTimer=win.setTimeout(close,140);}
 button.setAttribute('aria-expanded','false');
 button.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;cancelTimers();showTimer=win.setTimeout(show,180);});
 button.addEventListener('pointerleave',()=>{if(!button.matches(':focus-visible'))scheduleClose();});
 button.addEventListener('pointerdown',event=>{touch=event.pointerType==='touch';event.stopPropagation();});
 button.addEventListener('focus',()=>{if(!touch)show();});
 button.addEventListener('blur',scheduleClose);
 button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(touch&&tip)close();else show();touch=false;});
}
