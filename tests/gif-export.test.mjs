import test from 'node:test';
import assert from 'node:assert/strict';
import omggif from 'omggif';
import {project,sanitizeTree} from '../web/tree-model.js';
import {exportGIF} from '../web/gif-export.js';
import {gifPlan} from '../web/gif-plan.js';
import {exportEventData} from '../web/export-events.js';
const {GifReader}=omggif;
const draft=(gif={})=>{const p=project();Object.assign(p.output,{width:3,height:2,seconds:1,exportSeconds:1,fps:2,gif:{...p.output.gif,...gif}});return p;};
function decode(bytes,i=0){const gif=new GifReader(bytes),pixels=new Uint8Array(gif.width*gif.height*4);gif.decodeAndBlitFrameRGBA(i,pixels);return {gif,pixels};}

test('GIF independently decodes animated color, top/bottom orientation, transparency and opaque black',async()=>{
 for(const palette of ['global','local']){
  const p=draft({palette}),stages=[];
  const result=await exportGIF(p,{stage:s=>stages.push(s),render:async(_,w,h,t)=>new Float32Array([
   1,0,0,t===0?1:0, 0,0,0,1, 0,1,0,t===0?0:1,
   0,0,1,1, 1,1,1,.2, 1,1,0,.9
  ])});
  const {gif,pixels}=decode(result.bytes);
  assert.equal(new TextDecoder().decode(result.bytes.slice(0,6)),'GIF89a');
  assert.equal(gif.width,3);assert.equal(gif.height,2);assert.equal(gif.numFrames(),2);assert.equal(gif.loopCount(),0);
  assert.deepEqual([...pixels.slice(0,8)],[255,0,0,255,0,0,0,255]);
  assert.deepEqual([...pixels.slice(12,16)],[0,0,255,255]);assert.equal(pixels[11],0);assert.equal(pixels[19],0);assert.equal(pixels[23],255);
  const second=decode(result.bytes,1).pixels;assert.equal(second[3],0);assert.deepEqual([...second.slice(8,12)],[0,255,0,255]);
  for(let i=0;i<2;i++){assert.equal(gif.frameInfo(i).disposal,2);assert.equal(gif.frameInfo(i).delay,50);assert.equal(gif.frameInfo(i).transparent_index,0);}
  assert.equal(stages.filter(s=>s.key==='export.gifFrameProgress').length,2);
 }
});
test('GIF timing distributes fractional centiseconds without drift, caps unsafe FPS and retains endpoint sampling',()=>{
 const plan=gifPlan({seconds:3,fps:30,loopExport:true});assert.equal(plan.frames,90);assert.equal(plan.delays.reduce((a,b)=>a+b),3000);assert.deepEqual([...new Set(plan.delays)].sort(),[30,40]);
 const capped=gifPlan({seconds:3,fps:120});assert.equal(capped.fps,50);assert.equal(capped.frames,150);assert.ok(capped.delays.every(d=>d===20));const multi=gifPlan({seconds:2,exportSeconds:6,fps:120});assert.equal(multi.seconds,2);assert.equal(multi.frames,300);assert.equal(multi.duration,6);
 assert.equal(gifPlan({seconds:1,exportSeconds:1,fps:2,loopExport:false}).frames,3);
});
test('GIF repeats keyframe progress while formula seconds advance throughout the export',async()=>{
 const p=draft();p.output.exportSeconds=3;const clocks=[];
 const {bytes}=await exportGIF(p,{render:async(_,w,h,progress,seconds)=>{clocks.push([progress,seconds]);return new Float32Array(w*h*4).fill(1);}});
 assert.equal(decode(bytes).gif.numFrames(),6);
 assert.deepEqual(clocks.slice(-6),[[0,0],[.5,.5],[0,1],[.5,1.5],[0,2],[.5,2.5]]);
});
test('GIF once playback is separate from endpoint sampling and source output remains untouched',async()=>{
 const p=draft({repeat:false});p.output.loopExport=false;p.output.alpha=false;const before=structuredClone(p),times=[];
 const {bytes}=await exportGIF(p,{render:async(_,w,h,t)=>{times.push(t);return new Float32Array(w*h*4).fill(1);}});
 const {gif,pixels}=decode(bytes);assert.equal(gif.loopCount(),null);assert.equal(gif.numFrames(),3);assert.equal(gif.frameInfo(0).transparent_index,null);assert.ok(pixels.every(v=>v===255));assert.deepEqual(times.slice(-3),[0,.5,1]);assert.deepEqual(p,before);
});
test('GIF palette budget, dithering, transparent-only frames and seeded input produce valid deterministic bytes',async()=>{
 const p=draft({colors:16,dither:true});p.output.width=32;p.output.height=16;
 const render=async(_,w,h)=>Float32Array.from({length:w*h*4},(_,i)=>i%4===3?1:(i%127)/126);
 const first=await exportGIF(p,{render}),second=await exportGIF(p,{render});assert.deepEqual(first.bytes,second.bytes);
 const {gif,pixels}=decode(first.bytes);const colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add(pixels.slice(i,i+4).join(','));assert.ok(colors.size<=15);assert.ok(gif.frameInfo(0).palette_size<=16);
 const empty=await exportGIF(draft(),{render:async(_,w,h)=>new Float32Array(w*h*4)});assert.ok(decode(empty.bytes).pixels.every(v=>v===0));
});
test('GIF validation fails before rendering an over-budget animation and detects malformed frame buffers',async()=>{
 const p=draft();Object.assign(p.output,{width:4096,height:4096,fps:50,seconds:3});let rendered=false;
 await assert.rejects(exportGIF(p,{render:()=>{rendered=true;}}),e=>e.messageKey==='editor.frameSequenceExceedsTheTotalPixelBudget');assert.equal(rendered,false);
 p.output.width=0;await assert.rejects(exportGIF(p,{}),e=>e.messageKey==='export.gifInvalidSize');
 await assert.rejects(exportGIF(draft(),{render:async()=>new Float32Array(1)}),e=>e.messageKey==='export.gifInvalidPixels');
});
test('GIF settings survive project normalization, sanitize invalid imports, and emit only the expected export metadata',()=>{
 const p=draft({colors:32,palette:'local',dither:true,repeat:false,alphaThreshold:70});assert.deepEqual(sanitizeTree(p).output.gif,p.output.gif);
 p.output.gif={colors:999,palette:'invalid',alphaThreshold:Infinity};assert.deepEqual(sanitizeTree(p).output.gif,project().output.gif);
 assert.deepEqual(exportEventData({action:'download',format:'gif',channel:'color',name:'private'}),{action:'download',format:'gif',channel:'color'});
});
