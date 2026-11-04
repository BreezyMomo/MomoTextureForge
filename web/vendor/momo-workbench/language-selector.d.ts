import type {LanguageController} from './i18n.js';
export interface LanguageSelectorOptions {
 select:HTMLSelectElement;
 language:Pick<LanguageController,'SUPPORTED_LANGUAGES'|'interfaceLanguage'|'setLanguage'|'onLanguageChange'>;
 ui?:{text?:(key:string)=>string};
 onError?:(error:unknown)=>void;
}
export interface LanguageSelector {dispose():void}
export function createLanguageSelector(options:LanguageSelectorOptions):LanguageSelector;
