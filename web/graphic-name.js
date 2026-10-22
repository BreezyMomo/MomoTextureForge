import {normalizeAliases} from './parameter-metadata.js';
import {messageError} from './message-catalog.js';
// Resource-owned presentation metadata. Never derive identity from a display name.
export function normalizeGraphicAliases(value){
 if(value===undefined)return undefined;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>32||Object.values(value).some(name=>typeof name!=='string'))throw messageError('graphicName.invalidAliases');
 if(Object.values(value).some(name=>name.length>80))throw messageError('graphicName.tooLong');
 return normalizeAliases(value);
}
export const graphicAliasesField=value=>value===undefined?{}:{aliases:normalizeGraphicAliases(value)};
export function graphicNameMetadata(value){
 const source=value?.definition??value??{};
 return {name:value?.name??value?.zh??source.name??'',aliases:normalizeGraphicAliases(value?.aliases??source.aliases),id:value?.id??source.id??value?.resourceId??''};
}
export function resolveGraphicName(value,languages=[]){
 const {name,aliases,id}=graphicNameMetadata(value);
 for(const language of languages){const label=aliases?.[language];if(typeof label==='string'&&label.trim())return label.trim();}
 return name||id;
}
export function graphicSearchText(value){
 const {name,aliases,id}=graphicNameMetadata(value);
 return [name,id,value?.builtin,value?.resourceId,value?.definition?.id,value?.zh,...Object.values(aliases??{}),value?.searchTerms,value?.category,value?.description,...(value?.tags??[])].filter(v=>typeof v==='string').join(' ').toLocaleLowerCase();
}
