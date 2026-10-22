export const PANEL_IDS=['nodes','library','canvas','inspector','timeline'];
export const PANEL_TITLES={nodes:"layout.nodeTree",library:"layout.graphics",canvas:"layout.canvasPreview",inspector:"layout.inspector",timeline:"layout.timeline"};
export const LAYOUT_KEY='momo-texture-forge:workspace-layouts:v1';
let serial=0;
const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+(++serial);
const clamp=(v,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:fallback));
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,79}$/.test(id);
const stack=panels=>({kind:'stack',id:uid('stack'),panels,active:panels[0]});
const split=(axis,ratio,first,second)=>({kind:'split',id:uid('split'),axis,ratio,first,second});
export function layoutPreset(name='default'){
 const left=split('y',.42,stack(['nodes']),stack(['library']));
 const center=name==='animation'?split('y',.55,stack(['canvas']),stack(['timeline'])):stack(['canvas']);
 return {root:name==='focus'?center:split('x',.21,left,split('x',.73,center,stack(['inspector']))),floats:[]};
}
export function sanitizeLayout(raw){
 const panels=new Set(),ids=new Set();let count=0;
 function clean(n,depth=0){
  if(!n||depth>12||++count>40)return null;
  const id=validId(n.id)&&!ids.has(n.id)?n.id:uid('dock');ids.add(id);
  if(n.kind==='stack'){
   const list=Array.isArray(n.panels)?n.panels.filter(p=>PANEL_IDS.includes(p)&&!panels.has(p)&&panels.add(p)):[];
   return list.length?{kind:'stack',id,panels:list,active:list.includes(n.active)?n.active:list[0]}:null;
  }
  if(n.kind!=='split')return null;const first=clean(n.first,depth+1),second=clean(n.second,depth+1);
  return !first?second:!second?first:{kind:'split',id,axis:n.axis==='y'?'y':'x',ratio:clamp(n.ratio,.12,.88,.5),first,second};
 }
 const root=clean(raw?.root),floats=[];
 for(const f of (Array.isArray(raw?.floats)?raw.floats:[]).slice(0,5)){
  if(!f||typeof f!=='object')continue;
  const root=clean(f.root);if(!root)continue;
  const id=validId(f.id)&&!ids.has(f.id)?f.id:uid('float');ids.add(id);
  const w=clamp(f.w,.2,1,.45),h=clamp(f.h,.15,1,.6);floats.push({id,root,x:clamp(f.x,0,1-w,.2),y:clamp(f.y,0,1-h,.15),w,h});
 }
 return {root,floats};
}
export function visitLayout(layout,visit){const walk=n=>{if(!n)return;visit(n);if(n.kind==='split'){walk(n.first);walk(n.second);}};walk(layout.root);for(const f of layout.floats)walk(f.root);}
export function panelStack(layout,panel){let result=null;visitLayout(layout,n=>{if(n.kind==='stack'&&n.panels.includes(panel))result=n;});return result;}
export function findLayoutNode(layout,id){let result=null;visitLayout(layout,n=>{if(n.id===id)result=n;});return result;}
function transformTree(n,fn){if(!n)return null;if(n.kind==='split'){n.first=transformTree(n.first,fn);n.second=transformTree(n.second,fn);if(!n.first)return n.second;if(!n.second)return n.first;}return fn(n);}
function transform(layout,fn){layout.root=transformTree(layout.root,fn);layout.floats=layout.floats.map(f=>({...f,root:transformTree(f.root,fn)})).filter(f=>f.root);return layout;}
function remove(layout,panel){return transform(layout,n=>{if(n.kind!=='stack')return n;n.panels=n.panels.filter(p=>p!==panel);if(!n.panels.length)return null;if(!n.panels.includes(n.active))n.active=n.panels[0];return n;});}
export function closePanel(layout,panel){return remove(sanitizeLayout(layout),panel);}
export function activatePanel(layout,panel){const copy=sanitizeLayout(layout),target=panelStack(copy,panel);if(target)target.active=panel;return copy;}
export function dockPanel(layout,panel,targetId,edge='center'){
 const copy=sanitizeLayout(layout);if(!PANEL_IDS.includes(panel))return copy;
 const source=panelStack(copy,panel);if(source?.id===targetId&&(edge==='center'||source.panels.length===1)){source.active=panel;return copy;}
 remove(copy,panel);const incoming=stack([panel]);
 if(targetId==='root'&&copy.root){copy.root=join(copy.root);return copy;}
 let target=findLayoutNode(copy,targetId);if(!target){visitLayout({root:copy.root,floats:[]},n=>{if(!target&&n.kind==='stack')target=n;});}
 if(!target){copy.root=incoming;return copy;}
 if(edge==='center'&&target.kind==='stack'){target.panels.push(panel);target.active=panel;return copy;}
 transform(copy,n=>n.id===target.id?join(n):n);return copy;
 function join(existing){const before=edge==='left'||edge==='top',vertical=edge==='top'||edge==='bottom',portion=panel==='timeline'&&vertical?.42:.3;return split(vertical?'y':'x',before?portion:1-portion,before?incoming:existing,before?existing:incoming);}
}
export function floatPanel(layout,panel,rect={}){
 const copy=closePanel(layout,panel);if(!PANEL_IDS.includes(panel))return copy;
 const w=clamp(rect.w,.2,1,.45),h=clamp(rect.h,.15,1,.6);
 copy.floats.push({id:uid('float'),root:stack([panel]),x:clamp(rect.x,0,1-w,.2),y:clamp(rect.y,0,1-h,.15),w,h});return copy;
}
export function showPanel(layout,panel){
 if(panelStack(layout,panel))return activatePanel(layout,panel);
 const canvas=panelStack({root:layout.root,floats:[]},'canvas');
 return dockPanel(layout,panel,canvas?.id??'root',panel==='timeline'?'bottom':['nodes','library'].includes(panel)?'left':'right');
}
export function sanitizeLayoutSettings(raw){
 const named=[],names=new Set();for(const item of (Array.isArray(raw?.named)?raw.named:[]).slice(0,12)){
  if(!item||typeof item!=='object')continue;
  const name=typeof item.name==='string'?item.name.trim().slice(0,32):'';if(name&&!names.has(name)){names.add(name);named.push({name,layout:sanitizeLayout(item.layout)});}
 }
 return {schema:'momo.workspace-layouts/v1',current:raw?.current&&Object.hasOwn(raw.current,'root')?sanitizeLayout(raw.current):layoutPreset(),named};
}
