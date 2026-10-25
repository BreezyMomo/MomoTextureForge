import {parseAuthoring,authoringFromEditor,scalarHelpers} from './ai-authoring.js';
import {generatorAuthoringFromAsset} from './generator-authoring.js';
export function libraryAuthoring(asset,item){
 if(!asset||asset.kind==='image')throw Error('Native authoring JSON supports formulas and pipeline generators; export this resource as ZIP');
 const def=asset.definition,meta={name:item.name,aliases:item.aliases??def.aliases??{},category:item.category||'My graphics',description:item.description??''};
 if(def.generator)return generatorAuthoringFromAsset(asset,meta);
 return parseAuthoring(authoringFromEditor(asset,meta,def.authoring?.formula??def.outputs.scalar.inline,def.authoring?.kind??def.outputs.scalar.kind,def.parameters,scalarHelpers(asset)));
}
