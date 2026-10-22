export const PACK_COMPONENTS=['colorRed','colorGreen','colorBlue','alpha','colorLuminance','luminance','red','green','blue','height'];
// Existing numeric IDs remain unchanged for saved projects.
export const CANVAS_CHANNEL_OPTIONS=[
 [10,'packing.colorRed'],[11,'packing.colorGreen'],[12,'packing.colorBlue'],[8,'packing.alpha'],[13,'packing.colorLuminance'],
 [0,'editor.height'],[1,'editor.invertedHeight'],[2,'editor.normalX'],[3,'editor.normalY'],[4,'editor.normalZ'],[9,'editor.normalSlope'],
 [5,'packing.zero'],[6,'packing.one'],[7,'packing.half']
];
export const CANVAS_RGBA_CHANNELS=[10,11,12,8];
export function sanitizeChannelSources(raw){return Array.from({length:4},(_,i)=>{const s=raw?.[i];return s&&typeof s.nodeId==='string'&&s.nodeId.length>0&&s.nodeId.length<=128&&PACK_COMPONENTS.includes(s.component)?{nodeId:s.nodeId,component:s.component}:null;});}
// Filter drawing, not the source tree: rule/contour/random arrangements must
// still see every original candidate when computing their placements.
export function channelSourceSelection(root,id){
 const path=[];
 function visit(n){path.push(n);if(n.id===id)return true;for(const child of n.children??[])if(visit(child))return true;path.pop();return false;}
 if(!visit(root))return null;
 const ids=new Set(),include=n=>{ids.add(n.id);for(const c of n.children??[])include(c);if(n.mask)include(n.mask);};
 include(path.at(-1));for(const n of path){ids.add(n.id);if(n.mask)include(n.mask);}
 return {id,ids,nodes:path,path:new Set(path.map(n=>n.id))};
}
