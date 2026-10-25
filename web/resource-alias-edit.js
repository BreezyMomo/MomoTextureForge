import {SUPPORTED_LANGUAGES} from './language.js';
import {normalizeGraphicAliases} from './graphic-name.js';
import {normalizeAliases} from './parameter-metadata.js';
export const aliasLanguages=()=>SUPPORTED_LANGUAGES.map(({code,name})=>({code,name}));
export function editResourceAliases(asset,meta,{aliases,parameters=[]}){
 const apply=(original,patch,graphic=false)=>{
  if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Aliases must be a language map');
  const result={...original};for(const [language,value]of Object.entries(patch)){if(!SUPPORTED_LANGUAGES.some(l=>l.code===language)||value!==null&&typeof value!=='string')throw Error('Only configured alias languages can be edited');if(value===null)delete result[language];else result[language]=value;}
  return graphic?normalizeGraphicAliases(result):normalizeAliases(result);
 };
 const next=structuredClone(asset),metadata=structuredClone(meta);
 if(aliases!==undefined){metadata.aliases=apply(meta.aliases??next.definition.aliases,aliases,true);next.definition.aliases=structuredClone(metadata.aliases);}
 if(!Array.isArray(parameters)||parameters.length>64||new Set(parameters.map(p=>p.variable)).size!==parameters.length)throw Error('Invalid parameter aliases');
 for(const change of parameters){const parameter=next.definition.parameters.find(p=>p.variable===change.variable);if(!parameter)throw Error('Unknown parameter variable');if(change.aliases!==undefined)parameter.aliases=apply(parameter.aliases,change.aliases);
  if(change.options!==undefined){if(!Array.isArray(change.options)||new Set(change.options.map(o=>o.variable)).size!==change.options.length)throw Error('Invalid option aliases');for(const option of change.options){const target=parameter.options?.find(o=>o.variable===option.variable);if(!target)throw Error('Unknown option variable');target.aliases=apply(target.aliases,option.aliases);}}
 }
 return {asset:next,meta:metadata};
}
