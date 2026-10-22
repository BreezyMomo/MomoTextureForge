import {messageText,formatMessage} from './message-catalog.js';
import {interfaceLanguage,onLanguageChange} from './language.js';
export const uiText=key=>messageText(key,interfaceLanguage());
// Select-option Off and command Close have separate message IDs.
export const uiOption=key=>uiText(key==='common.close'?'common.off':key);
export const uiFormat=(key,...values)=>formatMessage(key,values,interfaceLanguage());
export function uiError(error){return error?.messageKey?uiFormat(error.messageKey,...error.messageValues):error?.message??String(error);}
// Explicit key bindings only: never infer translations from Chinese or user text.
export function localizeApplicationMarkup(root){
 const entries=[];
 for(const element of [root,...root.querySelectorAll('[data-i18n],[data-i18n-title],[data-i18n-aria-label],[data-i18n-placeholder],[data-i18n-alt]')]){
  if(element.nodeType!==1)continue;
  if(element.hasAttribute('data-i18n'))entries.push({element,key:element.dataset.i18n,name:null,last:element.textContent});
  for(const name of ['title','aria-label','placeholder','alt']){const key=element.getAttribute('data-i18n-'+name);if(key)entries.push({element,key,name,last:element.getAttribute(name)});}
 }
 function update(){
  document.documentElement.lang=interfaceLanguage();
  for(const entry of entries){if(!entry.element.isConnected)continue;const current=entry.name?entry.element.getAttribute(entry.name):entry.element.textContent;if(current!==entry.last)continue;entry.last=uiText(entry.key);if(entry.name)entry.element.setAttribute(entry.name,entry.last);else entry.element.textContent=entry.last;}
 }
 update();return onLanguageChange(update);
}
