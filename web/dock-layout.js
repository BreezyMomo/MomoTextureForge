import {createLayoutModel} from './vendor/momo-workbench/layout.js';
export {MIN_SPLIT_RATIO,MAX_SPLIT_RATIO} from './vendor/momo-workbench/layout.js';

// Panel identities and recommended compositions belong to this product.
const panels=[
 {id:'nodes',title:'layout.nodeTree',showEdge:'left'},
 {id:'library',title:'layout.graphics',showEdge:'left'},
 {id:'canvas',title:'layout.canvasPreview'},
 {id:'inspector',title:'layout.inspector'},
 {id:'timeline',title:'layout.timeline',showEdge:'bottom',dockRatio:{x:.3,y:.42}},
];
let serial=0;
const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+(++serial);
const stack=panels=>({kind:'stack',id:uid('stack'),panels,active:panels[0]});
const split=(axis,ratio,first,second)=>({kind:'split',id:uid('split'),axis,ratio,first,second});
function productLayoutPreset(name='default'){
 const animation=name==='animation';
 if(name==='browse')return {root:split('x',.32,stack(['library']),split('x',.70,split('y',.72,stack(['canvas']),stack(['nodes'])),stack(['inspector']))),floats:[]};
 const left=animation?split('y',.42,stack(['nodes']),stack(['library'])):split('x',.55,stack(['library']),stack(['nodes']));
 const center=animation?split('y',.55,stack(['canvas']),stack(['timeline'])):stack(['canvas']);
 return {root:name==='focus'?center:split('x',animation?.23:.28,left,split('x',animation?.71:.69,center,stack(['inspector']))),floats:[]};
}
export const layoutModel=createLayoutModel({
 panels,anchorPanel:'canvas',storageKey:'momo-texture-forge:workspace-layouts:v1',defaultPreset:'default',
 presets:Object.fromEntries(['default','browse','animation','focus'].map(name=>[name,()=>productLayoutPreset(name)])),
});
export const {PANEL_IDS,PANEL_TITLES,LAYOUT_KEY,layoutPreset,sanitizeLayout,visitLayout,panelStack,findLayoutNode,closePanel,activatePanel,dockPanel,floatPanel,showPanel,sanitizeLayoutSettings}=layoutModel;
