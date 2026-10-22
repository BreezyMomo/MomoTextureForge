import {uiText} from './ui-language.js';
import {onLanguageChange} from './language.js';
import {animateUI,animateLayout,layoutRects} from './editor-motion.js';

export function createEditorNotifications(host){
 const updates=new WeakMap(),resolve=value=>typeof value==='function'?value():value;
 const dismiss=card=>{if(!card.isConnected||card.dataset.leaving)return;card.dataset.leaving='true';card.inert=true;const animation=animateUI(card,[{opacity:1},{opacity:0}],{duration:120});const remove=()=>{const before=layoutRects(host.children);card.remove();animateLayout(host.children,before);};if(animation)animation.finished.then(remove,remove);else remove();};
 host.setAttribute('role','region');
 host.setAttribute('aria-label',uiText('notifications.region'));
 onLanguageChange(()=>{host.setAttribute('aria-label',uiText('notifications.region'));for(const card of host.children)updates.get(card)?.();});
 return function notify(text,{kind='info',details='',action=null}={}){
  if(!text)return;
  const before=layoutRects(host.children);
  // Keep errors visible when a later success/info message arrives.
  for(const previous of host.querySelectorAll('.editor-notice'))if(previous.dataset.kind==='info'||previous.querySelector('.editor-notice-text')?.textContent===resolve(text))previous.remove();
  const card=document.createElement('section'),title=document.createElement('strong'),message=document.createElement('div'),close=document.createElement('button');
  card.className='editor-notice';card.dataset.kind=kind;card.setAttribute('role',kind==='error'?'alert':'status');
  title.textContent=uiText(kind==='error'?'notifications.error':kind==='warning'?'notifications.warning':'notifications.info');
  message.className='editor-notice-text';message.textContent=resolve(text);
  close.className='editor-notice-close';close.type='button';close.textContent='×';close.setAttribute('aria-label',uiText('notifications.dismiss'));close.onclick=()=>dismiss(card);
  card.append(title,close,message);
  let summary,content,button;
  if(details){const disclosure=document.createElement('details');summary=document.createElement('summary');content=document.createElement('pre');summary.textContent=uiText('notifications.details');content.textContent=resolve(details);disclosure.append(summary,content);card.append(disclosure);}
  if(action){button=document.createElement('button');button.type='button';button.textContent=resolve(action.label);button.onclick=action.run;card.append(button);}
  updates.set(card,()=>{title.textContent=uiText(kind==='error'?'notifications.error':kind==='warning'?'notifications.warning':'notifications.info');close.setAttribute('aria-label',uiText('notifications.dismiss'));message.textContent=resolve(text);if(summary)summary.textContent=uiText('notifications.details');if(content)content.textContent=resolve(details);if(button)button.textContent=resolve(action.label);});
  host.append(card);animateLayout(host.children,before);animateUI(card,[{opacity:0},{opacity:1}],{duration:140});
  if(kind==='info')setTimeout(()=>dismiss(card),6000);
 };
}
