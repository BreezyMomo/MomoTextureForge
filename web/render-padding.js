// Symmetric render-only margins. All layout, pivots and spacing stay in 0..1.
export const paddingScale=padding=>1+2*(padding??0);
export function paddedPlacement(box,axis,sourcePadding=0,targetPadding=0){
 const src=paddingScale(sourcePadding),dst=paddingScale(targetPadding);
 return {box:[(box[0]+targetPadding)/dst,(box[1]+targetPadding)/dst,box[2]*src/dst,box[3]*src/dst],axis:[(axis[0]+sourcePadding)/src,(axis[1]+sourcePadding)/src,axis[2],axis[3]]};
}
export function paddedRecords(records,sourcePadding=0,targetPadding=0){
 if(!sourcePadding&&!targetPadding)return records;
 return records.map(r=>{const p=paddedPlacement([r.x,r.y,r.width,r.height],[.5,.5,r.turn,r.mirror??1],sourcePadding,targetPadding);return {...r,x:p.box[0],y:p.box[1],width:p.box[2],height:p.box[3]};});
}
export function arrangedPadding(padding,records){return padding*Math.max(0,...records.map(r=>Math.max(r.width,r.height)*(Math.abs(Math.cos(r.turn))+Math.abs(Math.sin(r.turn)))));}
