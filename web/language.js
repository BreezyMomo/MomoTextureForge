import {messageError} from './message-catalog.js';
import config from './language-config.json' with {type:'json'};
import {canonicalLanguage,resolveAlias} from './parameter-metadata.js';
export const LANGUAGE_KEY='momo-texture-language:v1';
const codes=new Set();
export const SUPPORTED_LANGUAGES=Object.freeze(config.languages.map(({code,name})=>{
 if(canonicalLanguage(code)!==code||codes.has(code)||typeof name!=='string'||!name.trim())throw messageError("ui.invalidLanguageConfiguration");
 codes.add(code);return Object.freeze({code,name});
}));
if(!codes.has(config.default))throw messageError("ui.theDefaultLanguageIsNotInTheLanguageConfiguration");
export const DEFAULT_LANGUAGES=Object.freeze([config.default,...SUPPORTED_LANGUAGES.map(l=>l.code).filter(code=>code!==config.default)]);
export function normalizeLanguages(input){
 if(!Array.isArray(input)||!input.length||input.length>SUPPORTED_LANGUAGES.length)throw messageError("ui.chooseAConfiguredLanguage");
 const result=input.map(canonicalLanguage);
 if(result.some(code=>!codes.has(code)))throw messageError("ui.chooseAConfiguredLanguage");
 if(new Set(result).size!==result.length)throw messageError("ui.languagesMustBeUnique");
 return result;
}
export function languageOrderFor(code){const [selected]=normalizeLanguages([code]);return [selected,...DEFAULT_LANGUAGES.filter(other=>other!==selected)];}
let languages=[...DEFAULT_LANGUAGES];
// Retain the first supported language from older browser preferences. Unknown
// codes never become selectable; fallbacks always come from the build config.
try{const saved=JSON.parse(globalThis.localStorage?.getItem(LANGUAGE_KEY)??'null');if(Array.isArray(saved)){for(const value of saved){try{languages=languageOrderFor(value);break;}catch{}}}}catch{}
const listeners=new Set();
export const languageOrder=()=>[...languages];
export const parameterLabel=spec=>resolveAlias(spec,languages);
export function setLanguageOrder(order){
 const [selected]=normalizeLanguages(order),next=languageOrderFor(selected);
 try{globalThis.localStorage?.setItem(LANGUAGE_KEY,JSON.stringify(next));}catch{}
 languages=next;for(const listener of listeners)listener(languageOrder());
}
export const setLanguage=code=>setLanguageOrder([code]);
export function onLanguageChange(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
export const interfaceLanguage=()=>languages[0];
