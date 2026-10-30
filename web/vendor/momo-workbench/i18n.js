// UI language is a preference. Product names, documents and resource aliases stay with their owners.
export const LANGUAGE_KEY='momo-workbench:language:v1';
const own=(value,key)=>!!value&&Object.hasOwn(value,key);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
function keyedError(key,...values){
 const error=new Error(key+(values.length?': '+values.join(', '):''));
 error.messageKey=key;error.messageValues=values;return error;
}
export function canonicalLanguage(value,messageError=keyedError){
 if(typeof value!=='string'||value.length>48||!/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(value))throw messageError('errors.invalidLanguageTag',value);
 try{return Intl.getCanonicalLocales(value)[0];}catch{throw messageError('errors.invalidLanguageTag',value);}
}
function languageConfig(config,messageError=keyedError){
 if(!object(config)||!Array.isArray(config.languages)||!config.languages.length)throw messageError('ui.invalidLanguageConfiguration');
 const codes=new Set(),languages=config.languages.map(item=>{
  if(!object(item)||typeof item.code!=='string'||typeof item.name!=='string'||!item.name.trim())throw messageError('ui.invalidLanguageConfiguration');
  if(canonicalLanguage(item.code,messageError)!==item.code||codes.has(item.code))throw messageError('ui.invalidLanguageConfiguration');
  codes.add(item.code);return Object.freeze({code:item.code,name:item.name});
 });
 if(!codes.has(config.default))throw messageError('ui.theDefaultLanguageIsNotInTheLanguageConfiguration');
 return {languages:Object.freeze(languages),codes,order:Object.freeze([config.default,...languages.map(item=>item.code).filter(code=>code!==config.default)])};
}

export function createLanguageController({config,storage,storageKey=LANGUAGE_KEY,initialLanguage,messageError=keyedError}){
 const normalized=languageConfig(config,messageError),SUPPORTED_LANGUAGES=normalized.languages,DEFAULT_LANGUAGES=normalized.order;
 function normalizeLanguages(input){
  if(!Array.isArray(input)||!input.length||input.length>SUPPORTED_LANGUAGES.length)throw messageError('ui.chooseAConfiguredLanguage');
  const result=input.map(value=>canonicalLanguage(value,messageError));
  if(result.some(code=>!normalized.codes.has(code)))throw messageError('ui.chooseAConfiguredLanguage');
  if(new Set(result).size!==result.length)throw messageError('ui.languagesMustBeUnique');
  return result;
 }
 function languageOrderFor(code){const [selected]=normalizeLanguages([code]);return [selected,...DEFAULT_LANGUAGES.filter(other=>other!==selected)];}
 let languages=[...DEFAULT_LANGUAGES];
 // Older products stored a preference array: only its first supported language is retained.
 try{const saved=JSON.parse(storage?.getItem(storageKey)??'null');if(Array.isArray(saved))for(const value of saved){try{languages=languageOrderFor(value);break;}catch{}}}catch{}
 if(initialLanguage!==undefined)languages=languageOrderFor(initialLanguage);
 const listeners=new Set(),languageOrder=()=>[...languages];
 function setLanguageOrder(order){
  const [selected]=normalizeLanguages(order),next=languageOrderFor(selected);
  try{storage?.setItem(storageKey,JSON.stringify(next));}catch{}
  languages=next;for(const listener of listeners)listener(languageOrder());
 }
 return {SUPPORTED_LANGUAGES,DEFAULT_LANGUAGES,normalizeLanguages,languageOrderFor,languageOrder,
  interfaceLanguage:()=>languages[0],setLanguage:code=>setLanguageOrder([code]),setLanguageOrder,
  onLanguageChange(fn){listeners.add(fn);return ()=>{listeners.delete(fn);};},dispose(){listeners.clear();}};
}

export function createMessageCatalog({config,catalogs}){
 const normalized=languageConfig(config),fallbackLanguages=normalized.order;
 if(!object(catalogs)||!own(catalogs,config.default)||!object(catalogs[config.default]))throw keyedError('ui.invalidMessageCatalog');
 const hasMessage=key=>typeof key==='string'&&own(catalogs[config.default],key);
 const textIn=(language,key)=>own(catalogs,language)&&own(catalogs[language],key)&&typeof catalogs[language][key]==='string'&&catalogs[language][key]?catalogs[language][key]:undefined;
 function messageText(key,language=config.default){
  const selected=textIn(language,key);if(selected!==undefined)return selected;
  for(const code of fallbackLanguages){const text=textIn(code,key);if(text!==undefined)return text;}
  return key;
 }
 const formatMessage=(key,values=[],language=config.default)=>messageText(key,language).replace(/\{(\d+)\}/g,(_,index)=>String(values[Number(index)]??''));
 function messageError(key,...values){const error=new Error(formatMessage(key,values));error.messageKey=key;error.messageValues=values;return error;}
 const serializeMessageError=error=>({message:error?.message??String(error),messageKey:error?.messageKey,messageValues:error?.messageValues});
 const restoreMessageError=record=>record?.messageKey?messageError(record.messageKey,...(Array.isArray(record.messageValues)?record.messageValues:[])):new Error(typeof record==='string'?record:record?.message??'Unknown error');
 return {hasMessage,messageText,formatMessage,messageError,serializeMessageError,restoreMessageError};
}

// Optional build-time check. Runtime lookup deliberately tolerates missing translations.
export function validateCatalogs({config,catalogs}){
 const normalized=languageConfig(config),base=catalogs?.[config.default];
 if(!object(base))throw keyedError('ui.invalidMessageCatalog');
 const keys=Object.keys(base).sort(),signature=text=>[...text.matchAll(/\{(\d+)\}/g)].map(match=>match[1]).sort().join(',');
 for(const {code}of normalized.languages){
  const catalog=own(catalogs,code)?catalogs[code]:undefined;
  if(!object(catalog)||JSON.stringify(Object.keys(catalog).sort())!==JSON.stringify(keys))throw new Error(`Catalog keys differ: ${code}`);
  for(const key of keys){
   if(typeof base[key]!=='string'||typeof catalog[key]!=='string')throw new Error(`Catalog value must be text: ${code}/${key}`);
   if(signature(base[key])!==signature(catalog[key]))throw new Error(`Catalog placeholders differ: ${code}/${key}`);
  }
 }
 return {languages:normalized.languages.map(item=>item.code),keys:keys.length};
}
