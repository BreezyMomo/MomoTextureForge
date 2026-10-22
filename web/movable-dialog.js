import {uiText} from './ui-language.js';

// Move only the window chrome; graph gestures and form controls keep their handlers.
export function makeDialogMovable(dialog){
 const header=dialog.querySelector(':scope>header');if(!header)return ()=>{};
 const view=dialog.ownerDocument.defaultView,interactive='button,input,select,textarea,a,label,[contenteditable=true]';let drag=null,positioned=false;
 dialog.classList.add('movable-dialog');header.tabIndex=0;header.setAttribute('aria-label',uiText('dialog.moveWindow'));header.title=uiText('dialog.moveHint');
 function place(x,y){const box=dialog.getBoundingClientRect(),visible=Math.min(100,box.width),titleHeight=header.getBoundingClientRect().height;dialog.style.left=Math.max(visible-box.width,Math.min(x,view.innerWidth-visible))+'px';dialog.style.top=Math.max(8,Math.min(y,view.innerHeight-titleHeight-24))+'px';}
 function prepare(){if(positioned)return;const box=dialog.getBoundingClientRect();Object.assign(dialog.style,{position:'fixed',margin:'0',inset:'auto',width:box.width+'px',left:box.left+'px',top:box.top+'px'});positioned=true;}
 function down(event){
  if(event.button!==0||drag||event.target.closest(interactive))return;event.preventDefault();event.stopPropagation();prepare();const box=dialog.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:box.left,top:box.top};dialog.classList.add('dialog-moving');header.setPointerCapture(event.pointerId);
 }
 function move(event){if(drag?.id!==event.pointerId)return;event.preventDefault();place(drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y);}
 function finish(event){if(!drag||event?.pointerId!==undefined&&event.pointerId!==drag.id)return;const id=drag.id;drag=null;dialog.classList.remove('dialog-moving');if(header.hasPointerCapture(id))header.releasePointerCapture(id);}
 function key(event){if(event.target!==header)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!delta)return;event.preventDefault();event.stopPropagation();prepare();const box=dialog.getBoundingClientRect(),step=event.shiftKey?32:8;place(box.left+delta[0]*step,box.top+delta[1]*step);}
 function resize(){if(!positioned||!dialog.open)return;finish();const box=dialog.getBoundingClientRect();place(box.left,box.top);}
 function dispose(){finish();for(const [event,handler]of listeners)header.removeEventListener(event,handler);view.removeEventListener('resize',resize);dialog.removeEventListener('close',dispose);}
 const listeners=[['pointerdown',down],['pointermove',move],['pointerup',finish],['pointercancel',finish],['lostpointercapture',finish],['keydown',key]];for(const [event,handler]of listeners)header.addEventListener(event,handler);view.addEventListener('resize',resize);dialog.addEventListener('close',dispose,{once:true});return dispose;
}
