import test from 'node:test';
import assert from 'node:assert/strict';
import {curveDefaults,sanitizeCurves,curveValue,curveTangents,hasChannelCurves,curveUniforms} from '../web/channel-curves.js';
import {sanitizeChannelSources,channelSourceSelection,CANVAS_RGBA_CHANNELS,CANVAS_CHANNEL_OPTIONS} from '../web/output-channels.js';
import {project,node,sanitizeTree} from '../web/tree-model.js';
import {shapeVector,planPSD} from '../web/tree-psd.js';

test('curves roundtrip with bounded, ordered points, stable endpoints and no default visual change',()=>{
 const p=project(),n=p.root.children[0];assert.equal(hasChannelCurves(n),false);
 n.curves={...curveDefaults(),enabled:true,red:[[1,.8],[.5,.2],[0,0]]};
 const clean=sanitizeTree(JSON.parse(JSON.stringify(p)));assert.deepEqual(clean.root.children[0].curves.red,[[0,0],[.5,.2],[1,.8]]);
 assert.ok(Math.abs(curveValue(clean.root.children[0].curves.red,.75)-.4375)<1e-12);assert.equal(hasChannelCurves(clean.root.children[0]),true);
 const c=sanitizeCurves({enabled:true,alpha:[[NaN,1],[.5,Infinity],[-1,3],[.5,-2],[1,.7]]});assert.deepEqual(c.alpha,[[0,1],[.5,0],[1,.7]]);
 const many=sanitizeCurves({red:Array.from({length:40},(_,i)=>[i/40,i/40])});assert.ok(many.red.length<=16);assert.equal(many.red.at(-1)[0],1);
 assert.equal(curveUniforms(n.curves).data.length,288);assert.equal(curveDefaults().alpha[0][1],0);
});

test('smooth curves pass through controls with continuous tangents instead of straight segments',()=>{
 const points=[[0,0],[.25,.12],[.75,.88],[1,1]],slopes=curveTangents(points);
 for(const [x,y]of points)assert.ok(Math.abs(curveValue(points,x)-y)<1e-12);
 assert.ok(Math.abs(curveValue(points,.125)-.06)>.01,'The first segment must bend');
 for(let i=1;i<points.length-1;i++){
  const [x,y]=points[i],epsilon=1e-6,left=(y-curveValue(points,x-epsilon))/epsilon,right=(curveValue(points,x+epsilon)-y)/epsilon;
  assert.ok(Math.abs(left-right)<1e-4);assert.ok(Math.abs(left-slopes[i])<1e-4);
 }
});

test('nonuniform spacing, reversals and flat sections remain bounded without overshoot',()=>{
 for(const points of [[[0,0],[.01,.8],[.9,.9],[1,1]],[[0,.2],[.1,.8],[.35,.1],[.8,.9],[1,.3]],[[0,.4],[.2,.4],[.7,.8],[1,.8]]]){
  for(let i=1;i<points.length;i++)for(let j=0;j<=100;j++){
   const [a,b]=[points[i-1],points[i]],value=curveValue(points,a[0]+(b[0]-a[0])*j/100);
   assert.ok(Number.isFinite(value)&&value>=Math.min(a[1],b[1])-1e-12&&value<=Math.max(a[1],b[1])+1e-12);
  }
 }
 for(const points of [[[0,0],[1,1]],[[0,1],[1,0]],[[0,.3],[1,.3]]])for(let i=0;i<=100;i++)assert.ok(Math.abs(curveValue(points,i/100)-(points[0][1]+(points[1][1]-points[0][1])*i/100))<1e-12);
});

test('shader uniforms carry the same cubic tangents as CPU and graph evaluation',()=>{
 const curves=curveDefaults();curves.enabled=true;curves.alpha=[[0,0],[.2,.7],[.8,.9],[1,1]];
 const {data,counts}=curveUniforms(curves),slopes=curveTangents(curves.alpha);assert.equal(counts[5],4);assert.equal(counts[0],0);
 curves.alpha.forEach(([x,y],i)=>{const at=5*48+i*3;assert.equal(data[at],Math.fround(x));assert.equal(data[at+1],Math.fround(y));assert.equal(data[at+2],Math.fround(slopes[i]));});
});
test('channel references survive project saves; unknown components cannot enter rendering',()=>{
 const p=project();p.output.channelSources=[{nodeId:p.root.children[0].id,component:'luminance'},{nodeId:'deleted',component:'alpha'},null,{nodeId:'x',component:'javascript'}];
 const clean=sanitizeTree(JSON.parse(JSON.stringify(p)));assert.deepEqual(clean.output.channelSources,p.output.channelSources.slice(0,3).concat(null));assert.deepEqual(sanitizeChannelSources(),[null,null,null,null]);
});
test('original RGBA choices roundtrip without renumbering existing derived channels',()=>{
 const p=project();p.output.channels=[...CANVAS_RGBA_CHANNELS];p.output.channelSources=[{nodeId:p.root.children[0].id,component:'colorRed'},null,null,null];
 const clean=sanitizeTree(JSON.parse(JSON.stringify(p)));assert.deepEqual(clean.output.channels,[10,11,12,8]);assert.equal(clean.output.channelSources[0].component,'colorRed');
 p.output.channels=[5,6,7,8];assert.deepEqual(sanitizeTree(p).output.channels,[5,6,7,8]);assert.deepEqual(CANVAS_CHANNEL_OPTIONS.filter(([,key])=>['packing.zero','packing.one','packing.half'].includes(key)).map(([id])=>id),[5,6,7]);
});
test('node packing keeps original candidate lists and all masks, without including sibling draws',()=>{
 const p=project(),g=node('group'),a=p.root.children[0],b=node(),mask=node();g.children=[a,b];g.mask=mask;p.root.children=[g];const before=JSON.stringify(p);
 const selected=channelSourceSelection(p.root,a.id);assert.deepEqual([...selected.path],[p.root.id,g.id,a.id]);assert.ok(selected.ids.has(mask.id));assert.ok(!selected.ids.has(b.id));assert.equal(channelSourceSelection(p.root,'missing'),null);assert.equal(JSON.stringify(p),before);
});
test('curves requiring rasterization are retained in layered PSD instead of silently discarded',()=>{
 const p=project(),n=p.root.children[0];n.color={mode:'own',fill:'solid',low:'#ffffff',high:'#ffffff'};n.params[3]=0;assert.ok(shapeVector(n,128,128));n.curves.enabled=true;n.curves.alpha=[[0,0],[1,.5]];assert.equal(shapeVector(n,128,128),null);
 const g=node('group');g.curves=n.curves;g.children=[n];p.root.children=[g];assert.equal(planPSD(p).stats.merged,1);
});
