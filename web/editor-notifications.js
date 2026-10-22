import {uiText} from './ui-language.js';
import {onLanguageChange} from './language.js';

export function createEditorNotifications(host){
 const updates=new WeakMap(),resolve=value=>typeof value==='function'?value():value;
 host.setAttribute('role','region');
 host.setAttribute('aria-label',uiText('notifications.region'));
 onLanguageChange(()=>{host.setAttribute('aria-label',uiText('notifications.region'));for(const card of host.children)updates.get(card)?.();});
 return function notify(text,{kind='info',details='',action=null}={}){
  if(!text)return;
  // Keep errors visible when a later success/info message arrives.
  for(const previous of host.querySelectorAll('.editor-notice'))if(previous.dataset.kind==='info'||previous.querySelector('.editor-notice-text')?.textContent===resolve(text))previous.remove();
  const card=document.createElement('section'),title=document.createElement('strong'),message=document.createElement('div'),close=document.createElement('button');
  card.className='editor-notice';card.dataset.kind=kind;card.setAttribute('role',kind==='error'?'alert':'status');
  title.textContent=uiText(kind==='error'?'notifications.error':kind==='warning'?'notifications.warning':'notifications.info');
  message.className='editor-notice-text';message.textContent=resolve(text);
  close.className='editor-notice-close';close.type='button';close.textContent='×';close.setAttribute('aria-label',uiText('notifications.dismiss'));close.onclick=()=>card.remove();
  card.append(title,close,message);
  let summary,content,button;
  if(details){const disclosure=document.createElement('details');summary=document.createElement('summary');content=document.createElement('pre');summary.textContent=uiText('notifications.details');content.textContent=resolve(details);disclosure.append(summary,content);card.append(disclosure);}
  if(action){button=document.createElement('button');button.type='button';button.textContent=resolve(action.label);button.onclick=action.run;card.append(button);}
  updates.set(card,()=>{title.textContent=uiText(kind==='error'?'notifications.error':kind==='warning'?'notifications.warning':'notifications.info');close.setAttribute('aria-label',uiText('notifications.dismiss'));message.textContent=resolve(text);if(summary)summary.textContent=uiText('notifications.details');if(content)content.textContent=resolve(details);if(button)button.textContent=resolve(action.label);});
  host.append(card);
  if(kind==='info')setTimeout(()=>card.remove(),6000);
 };
}
