// Extracted from MomoTextureForge; product panels and presets are injected.
export const MIN_SPLIT_RATIO=.01,MAX_SPLIT_RATIO=.99;
export function createLayoutModel({panels,presets={},defaultPreset='default',storageKey='momo-workbench:workspace-layouts:v1',anchorPanel}={}){
 if(!Array.isArray(panels)||!panels.length)throw new TypeError('Register at least one panel');
 const panelSpecs=new Map();
 for(const item of panels){const spec=typeof item==='string'?{id:item,title:item}:item;
  if(!spec||typeof spec.id!=='string'||!/^[a-zA-Z0-9_-]{1,79}$/.test(spec.id)||panelSpecs.has(spec.id))throw new TypeError('Panel IDs must be unique stable identifiers');
  panelSpecs.set(spec.id,{...spec});
 }
 const PANEL_IDS=Object.freeze([...panelSpecs.keys()]),PANEL_TITLES=Object.freeze(Object.fromEntries([...panelSpecs].map(([id,spec])=>[id,spec.title??id]))),LAYOUT_KEY=storageKey;
 anchorPanel??=PANEL_IDS[0];

let serial=0;
const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+(++serial);
const clamp=(v,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:fallback));
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,79}$/.test(id);
const stack=panels=>({kind:'stack',id:uid('stack'),panels,active:panels[0]});
const split=(axis,ratio,first,second)=>({kind:'split',id:uid('split'),axis,ratio,first,second});
function layoutPreset(name=defaultPreset){
 const preset=presets[name]??presets[defaultPreset];
 return sanitizeLayout(typeof preset==='function'?preset():structuredClone(preset??{root:stack(PANEL_IDS),floats:[]}));
}
function sanitizeLayout(raw){
 const panels=new Set(),ids=new Set();let count=0;
 function clean(n,depth=0){
  if(!n||depth>12||++count>40)return null;
  const id=validId(n.id)&&!ids.has(n.id)?n.id:uid('dock');ids.add(id);
  if(n.kind==='stack'){
   const list=Array.isArray(n.panels)?n.panels.filter(p=>PANEL_IDS.includes(p)&&!panels.has(p)&&panels.add(p)):[];
   return list.length?{kind:'stack',id,panels:list,active:list.includes(n.active)?n.active:list[0]}:null;
  }
  if(n.kind!=='split')return null;const first=clean(n.first,depth+1),second=clean(n.second,depth+1);
  return !first?second:!second?first:{kind:'split',id,axis:n.axis==='y'?'y':'x',ratio:clamp(n.ratio,MIN_SPLIT_RATIO,MAX_SPLIT_RATIO,.5),first,second};
 }
 const root=clean(raw?.root),floats=[];
 for(const f of (Array.isArray(raw?.floats)?raw.floats:[]).slice(0,PANEL_IDS.length)){
  if(!f||typeof f!=='object')continue;
  const root=clean(f.root);if(!root)continue;
  const id=validId(f.id)&&!ids.has(f.id)?f.id:uid('float');ids.add(id);
  const w=clamp(f.w,.2,1,.45),h=clamp(f.h,.15,1,.6);floats.push({id,root,x:clamp(f.x,0,1-w,.2),y:clamp(f.y,0,1-h,.15),w,h});
 }
 return {root,floats};
}
function visitLayout(layout,visit){const walk=n=>{if(!n)return;visit(n);if(n.kind==='split'){walk(n.first);walk(n.second);}};walk(layout.root);for(const f of layout.floats)walk(f.root);}
function panelStack(layout,panel){let result=null;visitLayout(layout,n=>{if(n.kind==='stack'&&n.panels.includes(panel))result=n;});return result;}
function findLayoutNode(layout,id){let result=null;visitLayout(layout,n=>{if(n.id===id)result=n;});return result;}
function transformTree(n,fn){if(!n)return null;if(n.kind==='split'){n.first=transformTree(n.first,fn);n.second=transformTree(n.second,fn);if(!n.first)return n.second;if(!n.second)return n.first;}return fn(n);}
function transform(layout,fn){layout.root=transformTree(layout.root,fn);layout.floats=layout.floats.map(f=>({...f,root:transformTree(f.root,fn)})).filter(f=>f.root);return layout;}
function remove(layout,panel){return transform(layout,n=>{if(n.kind!=='stack')return n;n.panels=n.panels.filter(p=>p!==panel);if(!n.panels.length)return null;if(!n.panels.includes(n.active))n.active=n.panels[0];return n;});}
function closePanel(layout,panel){return remove(sanitizeLayout(layout),panel);}
function activatePanel(layout,panel){const copy=sanitizeLayout(layout),target=panelStack(copy,panel);if(target)target.active=panel;return copy;}
function dockPanel(layout,panel,targetId,edge='center'){
 const copy=sanitizeLayout(layout);if(!PANEL_IDS.includes(panel))return copy;
 const source=panelStack(copy,panel);if(source?.id===targetId&&(edge==='center'||source.panels.length===1)){source.active=panel;return copy;}
 remove(copy,panel);const incoming=stack([panel]);
 if(targetId==='root'&&copy.root){copy.root=join(copy.root);return copy;}
 let target=findLayoutNode(copy,targetId);if(!target){visitLayout({root:copy.root,floats:[]},n=>{if(!target&&n.kind==='stack')target=n;});}
 if(!target){copy.root=incoming;return copy;}
 if(edge==='center'&&target.kind==='stack'){target.panels.push(panel);target.active=panel;return copy;}
 transform(copy,n=>n.id===target.id?join(n):n);return copy;
 function join(existing){const before=edge==='left'||edge==='top',vertical=edge==='top'||edge==='bottom',portion=clamp(panelSpecs.get(panel)?.dockRatio?.[vertical?'y':'x'],.05,.95,.3);return split(vertical?'y':'x',before?portion:1-portion,before?incoming:existing,before?existing:incoming);}
}
function floatPanel(layout,panel,rect={}){
 const copy=closePanel(layout,panel);if(!PANEL_IDS.includes(panel))return copy;
 const w=clamp(rect.w,.2,1,.45),h=clamp(rect.h,.15,1,.6);
 copy.floats.push({id:uid('float'),root:stack([panel]),x:clamp(rect.x,0,1-w,.2),y:clamp(rect.y,0,1-h,.15),w,h});return copy;
}
function showPanel(layout,panel){
 if(panelStack(layout,panel))return activatePanel(layout,panel);
 const canvas=panelStack({root:layout.root,floats:[]},anchorPanel);
 return dockPanel(layout,panel,canvas?.id??'root',panelSpecs.get(panel)?.showEdge??'right');
}
function sanitizeLayoutSettings(raw){
 const named=[],names=new Set();for(const item of (Array.isArray(raw?.named)?raw.named:[]).slice(0,12)){
  if(!item||typeof item!=='object')continue;
  const name=typeof item.name==='string'?item.name.trim().slice(0,32):'';if(name&&!names.has(name)){names.add(name);named.push({name,layout:sanitizeLayout(item.layout)});}
 }
 return {schema:'momo.workspace-layouts/v1',current:raw?.current&&Object.hasOwn(raw.current,'root')?sanitizeLayout(raw.current):layoutPreset(),named};
}

 const equal=(a,b)=>JSON.stringify(a,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)===JSON.stringify(b,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
function workspaceActions(current,operations){
 if(!Array.isArray(operations)||operations.length<1||operations.length>128)throw Error('Expected 1..128 workspace operations');
 let settings=structuredClone(current);
 for(const op of operations){
  if(!op||typeof op!=='object')throw Error('Invalid workspace operation');
  if(['show','hide','activate','dock','float'].includes(op.action)&&!PANEL_IDS.includes(op.panel))throw Error('Unknown workspace panel');
  let layout=settings.current;
  switch(op.action){
   case 'preset':if(!Object.hasOwn(presets,op.preset))throw Error('Unknown layout preset');layout=layoutPreset(op.preset);break;
   case 'show':layout=showPanel(layout,op.panel);break;
   case 'hide':layout=closePanel(layout,op.panel);break;
   case 'activate':if(!panelStack(layout,op.panel))throw Error('Panel is hidden');layout=activatePanel(layout,op.panel);break;
   case 'dock':if(op.target!=='root'&&!findLayoutNode(layout,op.target)||!['left','right','top','bottom','center'].includes(op.edge))throw Error('Invalid docking target');layout=dockPanel(layout,op.panel,op.target,op.edge);break;
   case 'float':if(!op.rect||!finite(op.rect.w,.2,1)||!finite(op.rect.h,.15,1)||!finite(op.rect.x,0,1-op.rect.w)||!finite(op.rect.y,0,1-op.rect.h))throw Error('Invalid floating rectangle');layout=floatPanel(layout,op.panel,op.rect);break;
   case 'resize':{const n=findLayoutNode(layout,op.id);if(n?.kind!=='split'||!finite(op.ratio,.01,.99))throw Error('Invalid split ratio');n.ratio=op.ratio;break;}
   case 'move-float':{const f=layout.floats.find(f=>f.id===op.id),r=op.rect;if(!f||!r||!finite(r.w,.2,1)||!finite(r.h,.15,1)||!finite(r.x,0,1-r.w)||!finite(r.y,0,1-r.h))throw Error('Invalid floating rectangle');Object.assign(f,r);break;}
   case 'save':case 'load':case 'delete':{
    if(typeof op.name!=='string'||!op.name.trim()||op.name!==op.name.trim()||op.name.length>32)throw Error('Layout name must be 1..32 characters without surrounding whitespace');
    const index=settings.named.findIndex(item=>item.name===op.name);
    if(op.action==='save'){if(index<0&&settings.named.length>=12)throw Error('At most 12 named layouts');if(index>=0&&!op.overwrite)throw Error('Named layout exists; overwrite must be explicit');const item={name:op.name,layout:structuredClone(layout)};if(index<0)settings.named.push(item);else settings.named[index]=item;}
    else{if(index<0)throw Error('Unknown named layout');if(op.action==='load')layout=structuredClone(settings.named[index].layout);else settings.named.splice(index,1);}break;
   }
   case 'restore':{if(JSON.stringify(op.settings).length>100000)throw Error('Workspace settings too large');const normalized=sanitizeLayoutSettings(op.settings);if(!equal(normalized,op.settings))throw Error('Invalid workspace settings');settings=normalized;layout=settings.current;break;}
   default:throw Error('Unknown workspace action');
  }
  settings.current=layout;
 }
 if(!equal(sanitizeLayout(settings.current),settings.current))throw Error('Invalid workspace layout');
 return settings;
}

 return Object.freeze({PANEL_IDS,PANEL_TITLES,LAYOUT_KEY,layoutPreset,sanitizeLayout,visitLayout,panelStack,findLayoutNode,closePanel,activatePanel,dockPanel,floatPanel,showPanel,sanitizeLayoutSettings,workspaceActions});
}
