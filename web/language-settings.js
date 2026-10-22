import {uiError,uiText} from './ui-language.js';
import {SUPPORTED_LANGUAGES,interfaceLanguage,setLanguage,onLanguageChange} from './language.js';
export function installLanguageSelector(select,{notify}={}){
 for(const {code,name}of SUPPORTED_LANGUAGES){const option=document.createElement('option');option.value=code;option.textContent=name;select.append(option);}
 const update=()=>{select.value=interfaceLanguage();select.setAttribute('aria-label',uiText("language.interface"));select.title=uiText("language.switchTheInterfaceAndParameterDisplayLanguage");};
 select.onchange=()=>{try{setLanguage(select.value);}catch(error){update();notify?.(uiError(error));}};
 update();onLanguageChange(update);
}
