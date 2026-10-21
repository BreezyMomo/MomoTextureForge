import {BUILTIN} from './definition-runtime.js';
import {BY_ID} from './catalog.js';
import {effectiveSeamlessPattern,periodicPatternGLSL} from './seamless.js';
import {pruneGLSL,VERTEX_GLSL} from './renderer.js';
import {TreeRenderer} from './tree-renderer.js';
import {node,project} from './tree-model.js';
const ids=['VoronoiEdges','VoronoiCells','WorleyRidge','WorleyBorder','CellularNoise','CrackedMud','CrackedTiles','ValueNoise','FBM','Perlin','Turbulence'];
const btn=document.querySelector('#run'),res=document.querySelector('#result'),gallery=document.querySelector('#gallery');btn.disabled=false;
btn.onclick=async()=>{btn.disabled=true;gallery.replaceChildren();const rows=[],canvas=document.createElement('canvas');canvas.width=256;canvas.height=2;const gl=canvas.getContext('webgl2');const renderer=new TreeRenderer(document.createElement('canvas'));
try{for(const id of ids){const def=BY_ID.get(id);const p=effectiveSeamlessPattern(id,def.defaults,[1.3,0,0,0,0,0,0]).params;
const args=`vec4(${p.slice(0,4).map(x=>Number(x).toFixed(8))}),vec4(${p.slice(4,8).map(x=>Number(x).toFixed(8))}),0.`;
const fn=`float sampleAt(vec2 p){return periodicPattern(${def.index},p,${args});}`;
const src=pruneGLSL(`#version 300 es
precision highp float;precision highp int;out vec4 color;${BUILTIN.libraries['math-v1']}
${BUILTIN.libraries['periodic-v1']}
${periodicPatternGLSL([def.index])}
${fn}
void main(){float t=(gl_FragCoord.x-.5)/255.;vec2 a=gl_FragCoord.y<1.?vec2(0.,t):vec2(t,0.);vec2 b=gl_FragCoord.y<1.?vec2(1.,t):vec2(t,1.);float e=abs(sampleAt(a)-sampleAt(b));color=vec4(e*50.,0.,0.,1.);}`);
const shaders=[gl.VERTEX_SHADER,gl.FRAGMENT_SHADER].map((type,i)=>{const s=gl.createShader(type);gl.shaderSource(s,i?src:VERTEX_GLSL);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(id+gl.getShaderInfoLog(s));return s;});const program=gl.createProgram();shaders.forEach(s=>gl.attachShader(program,s));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);gl.viewport(0,0,256,2);gl.drawArrays(gl.TRIANGLES,0,3);const bytes=new Uint8Array(256*2*4);gl.readPixels(0,0,256,2,gl.RGBA,gl.UNSIGNED_BYTE,bytes);let maximum=0;for(let i=0;i<bytes.length;i+=4)maximum=Math.max(maximum,bytes[i]);if(maximum>2)throw Error(id+' endpoint error '+maximum);rows.push({id,maxEncodedError:maximum,tolerance:2,scale:50});gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));
const projectState=project(),n=node('shape',id);n.boundary='repeat';n.uv[0]=1.3;projectState.root.children=[n];const raw=renderer.draw(projectState,150,150,{time:0,read:true,quality:2});if(!raw.every(Number.isFinite))throw Error(id+' nonfinite tree');const tile=document.createElement('canvas');tile.width=tile.height=150;tile.getContext('2d').putImageData(new ImageData(Uint8ClampedArray.from(raw,v=>Math.round(Math.max(0,Math.min(1,v))*255)),150,150),0,0);const c=document.createElement('canvas');c.width=c.height=450;const ctx=c.getContext('2d');for(let y=0;y<3;y++)for(let x=0;x<3;x++)ctx.drawImage(tile,x*150,y*150);const fig=document.createElement('figure');fig.style.margin=0;fig.append(id,c);gallery.append(fig);res.textContent='检查 '+rows.length;await new Promise(r=>setTimeout(r,0));}
res.textContent=JSON.stringify({status:'PASS',rows,samples:ids.length*512},null,2);
}catch(e){res.textContent=JSON.stringify({status:'FAIL',error:e.stack,rows});}finally{renderer.destroy();btn.disabled=false;}};
