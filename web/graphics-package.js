import {libraryIdentity} from './graphics-library.js';
import {graphicAliasesField} from './graphic-name.js';
import {encodeResourcePack} from './resource-pack.js';
import {cloneNode,PRESET_SCHEMA} from './tree-model.js';

export async function packageGraphic(root,meta,thumbnail=''){
 const entry={...libraryIdentity(meta),name:meta.name||root.name,...graphicAliasesField(meta.aliases),category:meta.category||'我的图形',description:meta.description||'',kind:meta.kind||'composition',...(meta.generator?{generator:true}:{}),thumbnail,source:meta.source??null};
 const bytes=await encodeResourcePack({schema:PRESET_SCHEMA,name:entry.name,root:cloneNode(root),graphicResource:entry});
 return {entry,bytes};
}
