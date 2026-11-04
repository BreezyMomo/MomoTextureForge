import {createLanguageSelector} from './vendor/momo-workbench/language-selector.js';
import {controller} from './language.js';
import {uiError,uiText} from './ui-language.js';
export function installLanguageSelector(select,{notify}={}){
 return createLanguageSelector({select,language:controller,ui:{text:uiText},onError:error=>notify?.(uiError(error))});
}
