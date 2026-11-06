import {libraryIdentity} from './graphics-library.js';
import {graphicAliasesField} from './graphic-name.js';
import {encodeResourcePack} from './resource-pack.js';
import {node,cloneNode,PRESET_SCHEMA} from './tree-model.js';
import {graphicIsAnimated} from './graphic-list-filters.js';

export async function packageGraphic(root,meta,thumbnail=''){
 const entry={...libraryIdentity(meta),name:meta.name||root.name,...graphicAliasesField(meta.aliases),category:meta.category||'我的图形',description:meta.description||'',kind:meta.kind||'composition',...(meta.generator?{generator:true}:{}),thumbnail,animated:graphicIsAnimated({root}),source:meta.source??null};
 const bytes=await encodeResourcePack({schema:PRESET_SCHEMA,name:entry.name,root:cloneNode(root),graphicResource:entry});
 return {entry,bytes};
}

// Editing a formula/image must retain the saved instance's effects, layout,
// colors and animation rather than replacing it with a default node.
export function editedGraphicRoot(source,type,definition){
 const root=source?cloneNode(source):node('shape',type);root.type=type;
 for(const parameter of definition.parameters)root.params[parameter.slot]=definition.defaults[parameter.slot];
 return root;
}
