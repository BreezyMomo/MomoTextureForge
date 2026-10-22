import {messageError} from './message-catalog.js';
import {bounds,moveTransform} from './canvas-transform.js';
import {BY_ID} from './catalog.js';

export function selectionCompatibility(nodes){
 const allShapes=nodes.length>0&&nodes.every(n=>n.kind==='shape'),allGroups=nodes.length>0&&nodes.every(n=>n.kind==='group');
 return {allShapes,allGroups,sameShape:allShapes&&nodes.every(n=>n.type===nodes[0].type),usesTime:allShapes&&nodes.every(n=>BY_ID.get(n.type)?.usesTime)};
}
export function shapeParameterVisible(n,p){
 const editor=BY_ID.get(n.type)?.definition.editor.kind;
 if(editor==='gear'&&(p.slot===5||p.slot===6))return n.params[8]<.5;
 if(editor==='gear'&&p.slot===9)return n.params[8]>=.5;
 if(editor==='star'&&p.slot===1)return n.params[5]===1;
 return true;
}

// undefined is a mixed value, never an instruction to overwrite a field.
export function commonValue(values){
 return values.length&&values.every(v=>Object.is(v,values[0]))?values[0]:undefined;
}
export function batchValues(n,path,value,read){
 const values={[path]:value};
 if(n.transform.lockAspect&&['transform.width','transform.height'].includes(path)){
  const other=path==='transform.width'?'transform.height':'transform.width',base=read(n,path);
  values[other]=value*(base?read(n,other)/base:1);
 }
 return values;
}
export function validateSelectionValues(changes){
 for(const {values}of changes)for(const [path,value]of Object.entries(values)){
  const limit=path==='opacity'||/transform\.(width|height)$/.test(path)?[0,1]:/transform\.(x|y)$/.test(path)?[-2,2]:path==='transform.rotation'?[-3600,3600]:null;
  if(limit&&(!Number.isFinite(value)||value<limit[0]-1e-9||value>limit[1]+1e-9))throw messageError("ui.someNodesWouldExceedParameterLimitsTheOperationWasCancelled");
 }
}
export function layoutSelection(items,operation,reference='selection'){
 if(items.length<2)throw messageError("ui.selectAtLeastTwoNodes");
 if(items.some(x=>!x.region))throw messageError("ui.theSelectionIsHiddenOrHasMultipleArrangedCopiesSelectVisible");
 const all=bounds(items.map(x=>x.region)),target=reference==='canvas'?{min:[0,0],max:[1,1]}:all;
 const entries=items.map(x=>({...x,box:bounds([x.region])}));
 const delta=new Map(entries.map(x=>[x.id,[0,0]]));
 const spec={left:[0,0],centerX:[0,.5],right:[0,1],bottom:[1,0],centerY:[1,.5],top:[1,1]}[operation];
 if(spec){const [axis,f]=spec,line=target.min[axis]+(target.max[axis]-target.min[axis])*f;
  for(const x of entries)delta.get(x.id)[axis]=line-(x.box.min[axis]+(x.box.max[axis]-x.box.min[axis])*f);
 }else{
  if(!['distributeX','distributeY'].includes(operation))throw messageError("ui.unknownAlignmentAction");
  if(entries.length<3)throw messageError("ui.distributingSpacingRequiresAtLeastThreeNodes");
  const axis=operation==='distributeX'?0:1;
  entries.sort((a,b)=>a.box.min[axis]-b.box.min[axis]);
  const first=entries[0],last=entries.at(-1),span=last.box.max[axis]-first.box.min[axis],sizes=entries.map(x=>x.box.max[axis]-x.box.min[axis]);
  const gap=(span-sizes.reduce((a,b)=>a+b,0))/(entries.length-1);let cursor=first.box.min[axis];
  entries.forEach((x,i)=>{if(i&&i<entries.length-1)delta.get(x.id)[axis]=cursor-x.box.min[axis];cursor+=sizes[i]+gap;});
 }
 const changes=items.map(x=>({id:x.id,values:Object.fromEntries(Object.entries(moveTransform(x.region,delta.get(x.id))).map(([k,v])=>['transform.'+k,v]))}));
 validateSelectionValues(changes);return changes;
}
