import {UI_CATALOGS} from './locales/catalogs.js';
import config from './language-config.json' with {type:'json'};
export const hasMessage=key=>typeof key==='string'&&Object.hasOwn(UI_CATALOGS[config.default],key);
const fallbackLanguages=[config.default,...config.languages.map(item=>item.code).filter(code=>code!==config.default)];
export function messageText(key,language=config.default){
 const selected=UI_CATALOGS[language];if(selected&&Object.hasOwn(selected,key)&&selected[key])return selected[key];
 for(const code of fallbackLanguages){const catalog=UI_CATALOGS[code];if(catalog&&Object.hasOwn(catalog,key)&&catalog[key])return catalog[key];}
 return key;
}
export function formatMessage(key,values=[],language=config.default){return messageText(key,language).replace(/\{(\d+)\}/g,(_,index)=>String(values[Number(index)]??''));}
// Keep diagnostics readable for callers while carrying stable identity to the UI.
export function messageError(key,...values){const error=new Error(formatMessage(key,values));error.messageKey=key;error.messageValues=values;return error;}

export const serializeMessageError=error=>({message:error?.message??String(error),messageKey:error?.messageKey,messageValues:error?.messageValues});
export function restoreMessageError(record){return record?.messageKey?messageError(record.messageKey,...(record.messageValues??[])):new Error(typeof record==='string'?record:record?.message??'Unknown error');}
