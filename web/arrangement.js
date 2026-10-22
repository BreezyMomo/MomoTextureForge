import {uiText,uiFormat} from './ui-language.js';
import {parameterLabel} from './language.js';
import { CATALOG } from "./catalog.js";
import {ARRANGEMENT_LIMITS as LIMITS} from './arrangement-limits.js';
// Numeric fields share the same keyframe/undo contract as pattern parameters.
export const ARRANGEMENT_SPECS = [
  ["editor.arrangement", 0, 12, 1, 0],
  ["editor.gridColumns", 1, LIMITS.grid, 1, 4],
  ["editor.gridRows", 1, LIMITS.grid, 1, 4],
  ["editor.instanceCount", 1, LIMITS.simpleInstances, 1, 12],
  ["editor.instanceSize", 0.01, 2, 0.01, 0.22],
  ["ui.layoutRadius", 0.02, 2, 0.01, 0.38],
  ["editor.layoutRotation", -360, 360, 1, 0],
  ["ui.faceRadiallyOutward", 0, 1, 1, 1],
  ["ui.positionRandomness", 0, 1, 0.01, 0],
  ["arrangement.sizeRandomness", 0, 0.9, 0.01, 0],
  ["ui.rotationRandomness", 0, 180, 1, 0],
  ["ui.arrangementSeed", 1, LIMITS.seed, 1, 1],
  ["ui.gridRowOffset", 0, 1, 0.01, 0],
  ["editor.layoutCenterX", -1.5, 1.5, 0.01, 0],
  ["editor.layoutCenterY", -1.5, 1.5, 0.01, 0],
  ["ui.ringCoverage", 0.05, 1, 0.01, 1],
  ["arrangement.spreadAngleDegrees", 0, 360, 0.001, 137.507764],
  ["examples.openCenter", 0, 0.95, 0.01, 0],
  ["ui.outerRingSizeFactor", 0.1, 4, 0.01, 1],
  ["ui.spiralOrientation", 0, 2, 1, 0],
  ["ui.pathStartX", -8, 8, .01, -.8],
  ["ui.pathStartY", -8, 8, .01, -.5],
  ["ui.pathControlX", -8, 8, .01, -.5],
  ["ui.pathControlY", -8, 8, .01, .9],
  ["arrangement.controlPoint2X", -8, 8, .01, .5],
  ["arrangement.controlPoint2Y", -8, 8, .01, -.9],
  ["ui.pathEndX", -8, 8, .01, .8],
  ["ui.pathEndY", -8, 8, .01, .5],
  ["ui.pathStartProgress", 0, 1, .01, 0],
  ["ui.pathEndProgress", 0, 1, .01, 1],
  ["ui.pathSampling", 0, 1, 1, 0],
  ["editor.pathSpacing", .005, 1, .005, .06],
  ["ui.minimumCenterDistance", 0, 1, .005, .06],
  ["ui.turns", 1, 32, 1, 3],
  ["ui.ringOffsetSymmetryOffset", -180, 180, 1, 15],
  ["ui.spiralTurns", .1, 24, .1, 3],
  ["arrangement.innerRadiusRatio", 0, 1, .01, .15],
  ["ui.mirroredPairs", 0, 1, 1, 1],
  ["ui.hexOrientation", 0, 1, 1, 0],
  ["editor.densityPattern", 0, CATALOG.length-1, 1, 0],
  ["ui.densityThreshold", 0, 1, .01, .1],
  ["ui.densityContrast", .1, 8, .1, 1],
  ...Array.from({length:16},(_,i)=>[uiText('ui.densityParameter')+i,-100,100,.01,CATALOG[0].defaults[i]]),
  ["ui.radialCountDistribution",0,1,1,1],
].map(([label, min, max, step, value], slot) => ({ label, min, max, step, default: value, slot }));
export function arrangementSpec(mode, slot, values) {
  let spec = ARRANGEMENT_SPECS[slot];
  const labels={3:mode===8?(values?.[58]===0?"ui.countPerRing":"ui.outermostRingCount"):mode===10?"ui.symmetryCopies":null,4:mode===8&&values?.[33]>1?"ui.innerRingInstanceSize":null,5:mode===6?"ui.pathScale":null,18:mode===6?"ui.endSizeFactor":null,19:mode>=6?"editor.instanceOrientation":null,34:mode===8?"ui.ringOffset":mode===10?"ui.symmetryOffset":null};
  if(labels[slot])spec={...spec,label:labels[slot]};
  if(slot===39)return {...spec,label:uiText(spec.label),max:CATALOG.length-1};
  if (slot>=42&&slot<58) { const p=CATALOG[Math.min(CATALOG.length-1,Math.max(0,Math.round(Number(values?.[39])||0)))]??CATALOG[0];
    const field=p.parameters.find(p=>p.slot===slot-42);
    return field?{...field,slot,label:uiText("editor.density")+parameterLabel(field)}:{...spec,min:p.defaults[slot-42]??0,max:p.defaults[slot-42]??0,default:p.defaults[slot-42]??0}; }
  spec={...spec,label:uiText(spec.label)};return slot === 3 && Number(mode) >= 5 ? {...spec, max:LIMITS.instances} : spec;
}
export const defaultArrangement = () => ARRANGEMENT_SPECS.slice(0,16).map((s) => s.default);
export function sanitizeArrangement(values) {
  return ARRANGEMENT_SPECS.slice(0, Math.round(Number(values?.[0])) >= 6 || values?.length > 20 ? 59 : Math.round(Number(values?.[0])) >= 5 || values?.length > 16 ? 20 : 16).map((base) => {
    const s = arrangementSpec(Math.min(12,Math.round(Number(values?.[0]))),base.slot,values);
    let value = Number(values?.[s.slot]);
    if (!Number.isFinite(value)) value = s.default;
    value = Math.max(s.min, Math.min(s.max, value));
    return s.step === 1 ? Math.round(value) : value;
  });
}
export function effectiveArrangement(values, seamless) {
  const result = sanitizeArrangement(values);
  if (seamless && result[0] === 4) result[2] = Math.max(2, Math.ceil(result[2] / 2) * 2);
  if (seamless && result[0]) result[4] = Math.min(result[4], 0.9 / Math.SQRT2 / (1 + result[9]) / ([5,6,7,8,9,12].includes(result[0]) && !(result[0]===8&&result[33]===1) ? Math.max(1,result[18]) : 1));
  return result;
}
export const ARRANGEMENT_NAMES = ["common.close", "ui.grid", "ui.radial", "ui.random", "ui.diagonalGrid", "examples.goldenAngleSpiral", "ui.alongPath", "ui.uniformRandom", "ui.concentricRings", "ui.regularSpiral", "ui.mirrorRadialSymmetry", "ui.hexPacking", "ui.densityScatter"];
export const ARRANGEMENT_FAMILIES = [[0,"common.close"],[1,"examples.gridArrangement"],[7,"ui.randomScatter"],[8,"examples.radialArrangement"],[5,"ui.spiralArrangement"],[6,"ui.alongPath"],[10,"ui.symmetryArrangement"]];
export const arrangementFamily = mode => [1,4,11].includes(mode)?1:[3,7,12].includes(mode)?7:[2,8].includes(mode)?8:[5,9].includes(mode)?5:mode;
export function ringCounts(a){
 const radii=Array.from({length:a[33]},(_,i)=>a[36]+(1-a[36])*(a[33]===1?1:i/(a[33]-1)));
 const counts=radii.map(r=>r===0?1:Math.max(1,Math.round(a[3]*(a[58]===0?1:r))));
 if(a[58]===0)return counts.map(n=>Math.min(n,Math.floor(LIMITS.instances/a[33])));
 const total=counts.reduce((x,y)=>x+y,0);
 if(total>LIMITS.instances){const ideal=counts.map(n=>n*LIMITS.instances/total);for(let i=0;i<counts.length;i++)counts[i]=Math.max(1,Math.floor(ideal[i]));let remaining=LIMITS.instances-counts.reduce((x,y)=>x+y,0);while(remaining<0){let best=counts.findIndex(n=>n>1);for(let i=0;i<counts.length;i++)if(counts[i]>1&&counts[i]-ideal[i]>counts[best]-ideal[best])best=i;counts[best]--;remaining++;}while(remaining>0){let best=0;for(let i=1;i<counts.length;i++)if(ideal[i]-counts[i]>ideal[best]-counts[best])best=i;counts[best]++;remaining--;}}
 return counts;
}
export function arrangementDescription(values, seamless) {
  const a = effectiveArrangement(values, seamless);
  let count = [1,4,11].includes(a[0]) ? a[1]*a[2] : a[3];
  if(a[0]===8)count=ringCounts(a).reduce((sum,n)=>sum+n,0);
  if(a[0]===10)count=Math.min(count,Math.floor(LIMITS.instances/(1+a[37])))*(1+a[37]);
  const amount=a[0]===6&&a[30]?uiFormat('arrangement.spacingAmount',a[31].toFixed(3),LIMITS.instances):uiFormat('arrangement.instanceAmount',[7,12].includes(a[0])?uiText('ui.target'):'',count);
  const name=[7,12].includes(a[0])?uiFormat('arrangement.scatterName',a[0]===12?uiText('ui.densityPattern'):'',a[32]>0?uiText('ui.spacingLimited'):''):a[0]===8?uiText('examples.radialArrangement'):uiFormat('arrangement.name',uiText(ARRANGEMENT_NAMES[a[0]]));
  return uiFormat('arrangement.summary',name,amount,a[0]===4?uiFormat('arrangement.diagonalGridSize',a[1],a[2]):'',a[4].toFixed(2),seamless?uiText('ui.repeatAcrossEdges'):'');
}
export const ARRANGEMENT_GLSL = `
float sourceBilinear(highp sampler2D source,vec2 u){ivec2 size=textureSize(source,0);vec2 p=clamp(u,0.,1.)*vec2(size)-.5;ivec2 i=ivec2(floor(p));vec2 f=fract(p);ivec2 m=size-1;return mix(mix(texelFetch(source,clamp(i,ivec2(0),m),0).r,texelFetch(source,clamp(i+ivec2(1,0),ivec2(0),m),0).r,f.x),mix(texelFetch(source,clamp(i+ivec2(0,1),ivec2(0),m),0).r,texelFetch(source,clamp(i+ivec2(1),ivec2(0),m),0).r,f.x),f.y);}
float arrangedAt(vec2 u,vec4 a,vec4 b,vec4 c,vec4 d,highp sampler2D source){int mode=int(a.x),cols=int(a.y),rows=int(a.z),total=mode==1?cols*rows:int(a.w);float result=0.;float spin=b.z*PI/180.;if(seamless==1)u=fract(u);for(int j=0;j<total;j++){float idx=float(j);vec2 rnd=vec2(hash21(vec2(idx,c.w)),hash21(vec2(idx+173.,c.w)));vec2 centre;float angle=0.;if(mode==1){float row=floor(idx/a.y);centre=vec2((mod(idx,a.y)+.5+mod(row,2.)*d.x)/a.y-.5,(row+.5)/a.z-.5)*2.*b.y;}else if(mode==2){angle=TAU*(idx/a.w*d.w);centre=vec2(cos(angle),sin(angle))*b.y;}else centre=(rnd-.5)*2.*b.y;centre+=(vec2(hash21(vec2(idx+41.,c.w)),hash21(vec2(idx+89.,c.w)))-.5)*c.x*2.*b.y/(mode==1?max(a.y,a.z):1.);centre=rot(centre,spin)+.5+d.yz;vec2 delta=u-centre;if(seamless==1)delta=mod(delta+.5,1.)-.5;float size=b.x*mix(1.-c.y,1.+c.y,hash21(vec2(idx+233.,c.w)));float turn=spin+(mode==2&&b.w>.5?PI*.5-angle:0.)+(rnd.x*2.-1.)*c.z*PI/180.;vec2 v=rot(delta,-turn)/max(size,.0001)+.5;float boxEdge=max(abs(v.x-.5),abs(v.y-.5));if(boxEdge>=.5)continue;float weight=1.-smoothstep(.49,.5,boxEdge);result=max(result,sourceBilinear(source,v)*weight);}return result;}
`;

// Reuse the grid sampler; only diagonal layouts compile this adapter.
export const DIAGONAL_ARRANGEMENT_GLSL = `float diagonalArrangedAt(vec2 u,vec4 a,vec4 b,vec4 c,vec4 d,highp sampler2D source){a.x=1.;d.x=.5;return arrangedAt(u,a,b,c,d,source);}`;

// Extra uniforms are compiled only for spiral layouts, preserving legacy shaders.
export const SPIRAL_ARRANGEMENT_GLSL = `
float spiralArrangedAt(vec2 u,vec4 a,vec4 b,vec4 c,vec4 d,highp sampler2D source,vec4 spiral){
 float result=0.;float spin=b.z*PI/180.;if(seamless==1)u=fract(u);
 for(int j=0;j<int(a.w);j++){
  float idx=float(j),t=idx/max(a.w-1.,1.);
  float angle=idx*spiral.x*PI/180.;
  float radius=b.y*sqrt(mix(spiral.y*spiral.y,1.,t));
  vec2 rnd=vec2(hash21(vec2(idx,c.w)),hash21(vec2(idx+173.,c.w)));
  vec2 centre=vec2(cos(angle),sin(angle))*radius;
  centre+=(vec2(hash21(vec2(idx+41.,c.w)),hash21(vec2(idx+89.,c.w)))-.5)*c.x*2.*b.y;
  centre=rot(centre,spin)+.5+d.yz;
  vec2 delta=u-centre;if(seamless==1)delta=mod(delta+.5,1.)-.5;
  float size=b.x*mix(1.,spiral.z,t)*mix(1.-c.y,1.+c.y,hash21(vec2(idx+233.,c.w)));
  float turn=spin+(spiral.w>.5?PI*.5-angle+(spiral.w>1.5?PI*.5:0.):0.)+(rnd.x*2.-1.)*c.z*PI/180.;
  vec2 v=rot(delta,-turn)/max(size,.0001)+.5;
  float edge=max(abs(v.x-.5),abs(v.y-.5));if(edge>=.5)continue;
  result=max(result,sourceBilinear(source,v)*(1.-smoothstep(.49,.5,edge)));
 }return result;
}`;
