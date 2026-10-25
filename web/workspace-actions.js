import {PANEL_IDS,layoutPreset,sanitizeLayoutSettings,sanitizeLayout,showPanel,closePanel,activatePanel,dockPanel,floatPanel,findLayoutNode,panelStack} from './dock-layout.js';

const equal=(a,b)=>JSON.stringify(a,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)===JSON.stringify(b,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export function workspaceActions(current,operations){
 if(!Array.isArray(operations)||operations.length<1||operations.length>128)throw Error('Expected 1..128 workspace operations');
 let settings=structuredClone(current);
 for(const op of operations){
  if(!op||typeof op!=='object')throw Error('Invalid workspace operation');
  if(['show','hide','activate','dock','float'].includes(op.action)&&!PANEL_IDS.includes(op.panel))throw Error('Unknown workspace panel');
  let layout=settings.current;
  switch(op.action){
   case 'preset':if(!['default','browse','animation','focus'].includes(op.preset))throw Error('Unknown layout preset');layout=layoutPreset(op.preset);break;
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
