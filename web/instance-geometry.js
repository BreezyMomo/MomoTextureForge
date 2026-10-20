export function regionMetric(aspect=1){const a=Number.isFinite(aspect)&&aspect>0?aspect:1;return a>=1?[a,1]:[1,1/a];}
export function fitInstances(records,aspect=1,fit='contain'){
 if(fit==='stretch')return records;
 const [w,h]=regionMetric(aspect);
 return records.map(p=>{const side=Math.min(p.width*w,p.height*h);return {...p,width:side/w,height:side/h};});
}
// Rotate a normalized displacement in physical parent coordinates.
export function rotateRegion(x,y,angle,width=1,height=1){const c=Math.cos(angle),s=Math.sin(angle);return [(c*x*width-s*y*height)/width,(s*x*width+c*y*height)/height];}
