import {BEZIER_SEGMENTS} from './bezier-path.js';
import {BEZIER_PATH_GLSL} from './bezier-path-glsl.js';
import {imageSamplingGLSL} from './image-processing.js';
import {GeneratorRenderer} from './generator-renderer.js';
import {resourceRegistry,resources,bitmaps} from './resource-assets.js';
import {patternFunction,extraFormulaLibraries,vectorCondition} from './definition-compiler.js';
import {BUILTIN} from './definition-runtime.js';
import { generateArrangement, densitySampler, TABLE_ARRANGEMENT_GLSL } from "./arrangement-layouts.js";
import { BY_ID, CATALOG } from "./catalog.js";
import { MATH_GLSL, VECTOR_GLSL, patternGLSL, additionalPatternGLSL, vectorTypeCondition } from "./patterns.js";
import { frameState, newLayer } from "./state.js";
import { effectiveArrangement, ARRANGEMENT_GLSL, DIAGONAL_ARRANGEMENT_GLSL, SPIRAL_ARRANGEMENT_GLSL } from "./arrangement.js";
import {
  prepareSeamlessState,
  seamlessKind,
  PERIODIC_GLSL,
  periodicPatternGLSL,
  REPEATED_SHAPES,
  PERIODIC_PATTERNS,
} from "./seamless.js";
export const VERTEX_GLSL = `#version 300 es
out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0,1);}`;
export function pruneGLSL(source) {
  // Keep source offsets while ignoring comments in multi-line formula libraries.
  const code = source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, comment => comment.replace(/[^\n]/g, " "));
  const structures = [...code.matchAll(/\bstruct\s+([A-Za-z_]\w*)/g)].map(m=>m[1]);
  const functions = [];
  const types = ["void", "float", "double", "int", "uint", "bool", "[biud]?vec[234]", "d?mat[234](?:x[234])?", ...structures].join("|");
  const pattern = new RegExp(`\\b(?:(?:highp|mediump|lowp)\\s+)?(?:${types})\\s+([A-Za-z_]\\w*)\\s*\\([^;{}]*\\)\\s*\\{`, "g");
  let match;
  while ((match = pattern.exec(code))) {
    let depth = 1,
      end = pattern.lastIndex;
    while (depth && end < code.length) {
      const c = code[end++];
      if (c === "{") depth++;
      if (c === "}") depth--;
    }
    functions.push({
      name: match[1],
      start: match.index,
      end,
      body: code.slice(match.index, end),
    });
    pattern.lastIndex = end;
  }
  const byName = new Map();
  for (const fn of functions) {
    if (!byName.has(fn.name)) byName.set(fn.name, []);
    byName.get(fn.name).push(fn);
  }
  const needed = new Set(),
    queue = ["main"];
  while (queue.length) {
    const name = queue.pop();
    if (needed.has(name)) continue;
    needed.add(name);
    for (const fn of byName.get(name) ?? [])
      for (const called of fn.body.matchAll(/\b([A-Za-z_]\w*)\s*\(/g))
        if (byName.has(called[1]) && !needed.has(called[1]))
          queue.push(called[1]);
  }
  for (const fn of functions.reverse())
    if (!needed.has(fn.name))
      source = source.slice(0, fn.start) + source.slice(fn.end);
  return source;
}
export function fragmentGLSL(indices, mode = 0, seamMode = -1, layout = null) {
  const custom=indices.map(i=>CATALOG[i].id).find(id=>resources.has(id));
  const registry=custom?resourceRegistry(custom):BUILTIN;
  const imageAsset=custom&&resources.get(custom).kind==='image'?resources.get(custom):null;
  // Independent vector guards can be specialized before helper pruning. Keeping
  // every flow/noise branch makes ANGLE compile unrelated noise octaves per tile.
  const MATH_GLSL=registry.libraries['math-v1'],VECTOR_GLSL=registry.vector.replace(/\btime\b/g,'formulaClock()').replace(/^if\(id==(\d+)\)[^\n]*\n/gm,(line,id)=>indices.includes(Number(id))?line:''),PERIODIC_GLSL=registry.libraries['periodic-v1']??'';
  const patternGLSL=ids=>{const code=patternFunction(registry,ids).replace(/ribbonShape\(q,a,b,c,d\)/g,layout?.bezier?'ribbonPathShape(q,a,b,c,d)':'ribbonShape(q,a,b,c,d)');return imageAsset?code.replace(/texture\(assetImage,/g,'sampleAssetImage('):code;},additionalPatternGLSL=ids=>extraFormulaLibraries(registry,ids),vectorTypeCondition=e=>vectorCondition(registry,e);
  const PERIODIC_PATTERNS=new Set(registry.catalog.filter(p=>p.definition.seamless.kind==='periodic').map(p=>p.id)),REPEATED_SHAPES=new Set(registry.catalog.filter(p=>p.definition.seamless.kind==='repeat').map(p=>p.id));
  const hasVector = indices.some((index) => CATALOG[index].vector);
  const generated=indices.filter(index=>CATALOG[index].definition.generator);
  const generatorDeclarations=generated.map(index=>`uniform sampler2D generatedTexture${index};float generatedValue${index}(vec2 p){if(any(lessThan(p,vec2(0)))||any(greaterThan(p,vec2(1))))return 0.;vec4 value=texture(generatedTexture${index},p);return ${CATALOG[index].definition.generator.scalar==='alpha'?'value.a':'clamp(dot(value.rgb,vec3(.2126,.7152,.0722))*value.a,0.,1.)'};}`).join('\n');
  const additionalLibraries = additionalPatternGLSL(indices);
  const rawIndices =
    seamMode === 0
      ? indices.filter(
          (i) =>
            !PERIODIC_PATTERNS.has(CATALOG[i].id) &&
            !REPEATED_SHAPES.has(CATALOG[i].id),
        )
      : indices;
  const kind = (id) =>
    seamMode < 0 || id < 0 ? 0 : seamlessKind(CATALOG[id].id, seamMode);
  const maskSampler = layout
    ? `float maskAt(int i,vec2 u){${layout.masks.map((id, i) => {
      if (id < 0) return `if(i==${i})return 1.;`;
      const value = layout.maskTable?.[i] ? `tableArrangedAt(u,${i+3},sourceTextures[${i+3}])` : layout.maskArranged?.[i]
        ? `${layout.maskSpiral?.[i]?"spiralArrangedAt":layout.maskDiagonal?.[i]?"diagonalArrangedAt":"arrangedAt"}(u,maskArrange[${i*4}],maskArrange[${i*4+1}],maskArrange[${i*4+2}],maskArrange[${i*4+3}],sourceTextures[${i+3}]${layout.maskSpiral?.[i]?`,maskSpiral[${i}]`:""})`
        : `patternAt(${id},u,maskParams[${i*4}],maskParams[${i*4+1}],maskParams[${i*4+2}],maskParams[${i*4+3}],maskA[${i}],maskB[${i}],0,${kind(id)})`;
      return `if(i==${i}){float m=${value};return maskInverse[${i}]==1?1.-m:m;}`;
    }).join("")}return 1.;}`
    : "float maskAt(int i,vec2 u){if(masks[i]<0)return 1.;float mask=patternAt(masks[i],u,maskParams[i*4],maskParams[i*4+1],maskParams[i*4+2],maskParams[i*4+3],maskA[i],maskB[i],0,maskKind[i]);return maskInverse[i]==1?1.-mask:mask;}";
  const layerSampler = layout
    ? `float sampleLayer(int i,vec2 u){${layout.types.map((id, i) => {
      const value = layout.table?.[i] ? `tableArrangedAt(u,${i},sourceTextures[${i}])` : layout.arranged?.[i]
        ? `${layout.spiral?.[i]?"spiralArrangedAt":layout.diagonal?.[i]?"diagonalArrangedAt":"arrangedAt"}(u,arrange[${i*4}],arrange[${i*4+1}],arrange[${i*4+2}],arrange[${i*4+3}],sourceTextures[${i}]${layout.spiral?.[i]?`,spiral[${i}]`:""})`
        : `patternAt(${id},u,params[${i*4}],params[${i*4+1}],params[${i*4+2}],params[${i*4+3}],transformA[${i}],transformB[${i}],polar[${i}],${kind(id)})`;
      return `if(i==${i})return ${value}*maskAt(${i},u);`;
    }).join("")}return 0.;}`
    : "float sampleLayer(int i,vec2 u){return patternAt(types[i],u,params[i*4],params[i*4+1],params[i*4+2],params[i*4+3],transformA[i],transformB[i],polar[i],patternKind[i])*maskAt(i,u);}";
  const active = layout?.order?.filter((i) => layout.enabled[i]);
  const heightComposition = active
    ? active.map((i, j) => j === 0
      ? `h=sampleLayer(${i},u)*opacity[${i}];`
      : `h=mix(h,blend(h,sampleLayer(${i},u),blendMode[${i}]),opacity[${i}]);`).join("\n")
    : "bool first=true;for(int j=0;j<3;j++){int i=order[j];if(enabled[i]==0)continue;float b=sampleLayer(i,u);h=first?b*opacity[i]:mix(h,blend(h,b,blendMode[i]),opacity[i]);first=false;}";
  return pruneGLSL(`#version 300 es
precision highp float;precision highp int;
in vec2 uv;out vec4 frag;
${generatorDeclarations}
${custom&&resources.get(custom).kind==='image'?'uniform sampler2D assetImage;\n':''}uniform int types[3],masks[3],enabled[3],blendMode[3],order[3],polar[3],maskInverse[3];
uniform vec4 params[12],maskParams[12],transformA[3],transformB[3],maskA[3],maskB[3];
uniform vec4 arrange[12],maskArrange[12];uniform highp sampler2D sourceTextures[6];
uniform float opacity[3];uniform vec4 stops[8];uniform int stopCount,channelSource[4],inverted,alphaMode;
const int outputMode=${mode};
uniform float time;uniform float manualFormulaTime;uniform int useManualFormulaTime;
float formulaClock(){return useManualFormulaTime==1?manualFormulaTime:time;}
uniform vec4 postA;uniform vec3 postB;uniform float normalStrength,tile,seamBlend;uniform vec2 imageSize,sampleOffset,sampleStep;uniform int patternKind[3],maskKind[3];const int seamless=${seamMode >= 0 ? 1 : 0};
${layout?.treeEdges ? MATH_GLSL.replace('float fill(float d,float s){return 1.-smoothstep(0.,max(s,.0001),d);}', 'float fill(float d,float s){float aa=max(fwidth(d),.00001);return 1.-smoothstep(-aa*.5,max(s,0.)+aa*.5,d);}') .replace('float line(float d,float w,float s){return 1.-smoothstep(w,w+max(s,.0001),abs(d));}', 'float line(float d,float w,float s){return fill(abs(d)-w,s);}') : MATH_GLSL}${additionalLibraries ? "\n" + additionalLibraries : ""}
${ARRANGEMENT_GLSL}${layout?.table?.some(Boolean)||layout?.maskTable?.some(Boolean)?TABLE_ARRANGEMENT_GLSL:""}${layout?.spiral?.some(Boolean)||layout?.maskSpiral?.some(Boolean)?"uniform vec4 spiral[3],maskSpiral[3];"+SPIRAL_ARRANGEMENT_GLSL:""}${layout?.diagonal?.some(Boolean)||layout?.maskDiagonal?.some(Boolean)?DIAGONAL_ARRANGEMENT_GLSL:""}
${imageAsset?imageSamplingGLSL(imageAsset.imageProcessing,imageAsset.imageTransform,imageAsset.imageColor):''}
${layout?.bezier?BEZIER_PATH_GLSL:''}
${patternGLSL(rawIndices)}
${patternGLSL(seamMode === 0 ? indices.filter((i) => REPEATED_SHAPES.has(CATALOG[i].id)) : []).replace("float pattern(", "float shapePattern(")}
${PERIODIC_GLSL}
${periodicPatternGLSL(seamMode === 0 ? indices : [],registry)}
vec2 transformUV(vec2 u,vec4 a,vec4 b,int p){vec2 q=u-.5;if(p==1)q=vec2(atan(q.y,q.x)/TAU,length(q)*2.)-.5;q=rot(q/max(a.x,.1),a.y+length(q)*b.z);q+=a.zw+time*b.x*vec2(cos(b.y),sin(b.y));return q+.5;}
float rawPatternAt(int id,vec2 u,vec4 p0,vec4 p1,vec4 p2,vec4 p3,vec4 a,vec4 b,int pol){return pattern(id,transformUV(u,a,b,pol),p0,p1,p2,p3,formulaClock());}
float patternAt(int id,vec2 u,vec4 p0,vec4 p1,vec4 p2,vec4 p3,vec4 a,vec4 b,int pol,int kind){if(seamless==0)return rawPatternAt(id,u,p0,p1,p2,p3,a,b,pol);if(kind==1)return periodicPattern(id,transformUV(u,a,b,0),p0,p1,formulaClock());u=fract(u);if(kind==2){vec2 drift=a.zw+time*b.x*vec2(cos(b.y),sin(b.y));vec2 centre=mod(rot(-drift*a.x,-a.y)+.5,1.)-.5;vec2 delta=mod(u-centre,1.)-.5;return shapePattern(id,rot(delta/a.x,a.y)+.5,p0,p1,p2,p3,formulaClock());}vec2 w=smoothstep(vec2(1.-seamBlend),vec2(1.),u);return mix(mix(rawPatternAt(id,u,p0,p1,p2,p3,a,b,pol),rawPatternAt(id,u-vec2(1,0),p0,p1,p2,p3,a,b,pol),w.x),mix(rawPatternAt(id,u-vec2(0,1),p0,p1,p2,p3,a,b,pol),rawPatternAt(id,u-1.,p0,p1,p2,p3,a,b,pol),w.x),w.y);}
${generated.includes(layout?.types?.[0])?`vec4 generatorRaw(vec2 pos){vec2 p=transformUV(pos,transformA[0],transformB[0],polar[0]);if(any(lessThan(p,vec2(0)))||any(greaterThan(p,vec2(1))))return vec4(0);vec4 value=texture(generatedTexture${layout.types[0]},p);return vec4(value.rgb*value.a,value.a);}vec4 generatorColor(vec2 p){if(seamless==0)return generatorRaw(p);p=fract(p);vec2 weights=smoothstep(vec2(1.-seamBlend),vec2(1),p);return mix(mix(generatorRaw(p),generatorRaw(p-vec2(1,0)),weights.x),mix(generatorRaw(p-vec2(0,1)),generatorRaw(p-1.),weights.x),weights.y);}`:''}
${custom&&resources.get(custom).kind==='image'?`
vec4 imageRaw(vec2 pos){vec2 p=transformUV(pos,transformA[0],transformB[0],polar[0]);vec2 size=vec2(textureSize(assetImage,0));float ratio=size.x/size.y;p=(p-.5)*vec2(max(1.,1./ratio),max(1.,ratio))+.5;if(any(lessThan(p,vec2(0)))||any(greaterThan(p,vec2(1))))return vec4(0);vec4 v=sampleAssetImage(p);return vec4(v.rgb*v.a,v.a);}
vec4 imageColor(vec2 p){if(seamless==0)return imageRaw(p);p=fract(p);vec2 w=smoothstep(vec2(1.-seamBlend),vec2(1.),p);return mix(mix(imageRaw(p),imageRaw(p-vec2(1,0)),w.x),mix(imageRaw(p-vec2(0,1)),imageRaw(p-1.),w.x),w.y);}
`:''}
${maskSampler}
${layerSampler}
float blend(float a,float b,int mode){if(mode==1)return a+b;if(mode==2||mode==5)return a*b;if(mode==3)return 1.-(1.-a)*(1.-b);if(mode==4)return abs(a-b);if(mode==6)return a<.5?2.*a*b:1.-2.*(1.-a)*(1.-b);if(mode==7)return (1.-2.*b)*a*a+2.*b*a;if(mode==8)return b>=.999?1.:min(1.,a/(1.-b));return b;}
float heightAt(vec2 u){float h=0.;${heightComposition}
h=(h-postA.w)/max(postB.x-postA.w,.0001);h=(h-.5)*postA.y+.5+postA.x;h=pow(max(h,0.),1./max(postA.z,.1));h=mix(postB.y,postB.z,h);if(inverted==1)h=1.-h;return h;}
vec3 normalAt(vec2 u){vec2 e=1./imageSize;float a=heightAt(u+e*vec2(-1,-1)),b=heightAt(u+e*vec2(0,-1)),c=heightAt(u+e*vec2(1,-1));float d=heightAt(u+e*vec2(-1,0)),f=heightAt(u+e*vec2(1,0));float g=heightAt(u+e*vec2(-1,1)),h=heightAt(u+e*vec2(0,1)),i=heightAt(u+e*vec2(1,1));return normalize(vec3(-(c+2.*f+i-a-2.*d-g)*normalStrength,-(g+2.*h+i-a-2.*b-c)*normalStrength,1.));}
vec3 colorAt(float h){vec3 c=stops[0].rgb;for(int i=1;i<8;i++){if(i>=stopCount)break;float f=sat((h-stops[i-1].a)/max(stops[i].a-stops[i-1].a,.00001));c=mix(c,stops[i].rgb,f);}return c;}
float channel(int source,float h,vec3 n){if(source==0)return h;if(source==1)return 1.-h;if(source==2)return n.x*.5+.5;if(source==3)return n.y*.5+.5;if(source==4)return n.z*.5+.5;if(source==5)return 0.;if(source==6)return 1.;if(source==7)return .5;return sat(length(n.xy));}
${VECTOR_GLSL}
void main(){vec2 base=gl_FragCoord.xy*sampleStep+sampleOffset;vec2 u=tile>1.?fract(base*tile):base;float h=heightAt(u);vec3 normal=${mode === 2 || mode === 3 ? "normalAt(u)" : "vec3(0,0,1)"};
vec4 result=${mode === 5 ? "vec4(h,opacity[0]*maskAt(0,u),0.,1.)" : mode === 1 ? "vec4(vec3(h),alphaMode==1?sat(h):1.)" : mode === 2 ? "vec4(normal*.5+.5,1.)" : mode === 3 ? "vec4(channel(channelSource[0],h,normal),channel(channelSource[1],h,normal),channel(channelSource[2],h,normal),channel(channelSource[3],h,normal))" : "vec4(colorAt(h),alphaMode==1?sat(h):1.)"};
${hasVector && mode === 0 && !layout?.arranged?.[0] ? `if(enabled[1]==0&&enabled[2]==0&&(${vectorTypeCondition("types[0]")})){float weight=opacity[0]*maskAt(0,u);result=vec4(mix(vec3(.5),vectorAt(u),weight),alphaMode==1?weight:1.);}` : ""}${custom&&resources.get(custom).kind==='image'&&mode===0?`if(params[0].x<.5){vec4 c=imageColor(u);result=vec4(c.a>0.?c.rgb/c.a:vec3(0),c.a);}`:''}${generated.includes(layout?.types?.[0])&&mode===0?`if(enabled[1]==0&&enabled[2]==0){vec4 c=generatorColor(u);result=vec4(c.a>0.?c.rgb/c.a:vec3(0),c.a);}`:''}frag=result;}`);
}

function bufferedFragmentGLSL(mode) {
  return `#version 300 es
precision highp float;precision highp int;
in vec2 uv;out vec4 frag;uniform highp sampler2D heightTexture;uniform float normalStrength,normalScale;uniform int alphaMode,channelSource[4];
float channel(int s,float h,vec3 n){if(s==0)return h;if(s==1)return 1.-h;if(s==2)return n.x*.5+.5;if(s==3)return n.y*.5+.5;if(s==4)return n.z*.5+.5;if(s==5)return 0.;if(s==6)return 1.;if(s==7)return .5;return clamp(length(n.xy),0.,1.);}
void main(){ivec2 c=ivec2(gl_FragCoord.xy)+ivec2(1);float a=texelFetch(heightTexture,c+ivec2(-1,-1),0).r,b=texelFetch(heightTexture,c+ivec2(0,-1),0).r,d=texelFetch(heightTexture,c+ivec2(-1,0),0).r,f=texelFetch(heightTexture,c+ivec2(1,0),0).r,g=texelFetch(heightTexture,c+ivec2(-1,1),0).r,h=texelFetch(heightTexture,c+ivec2(0,1),0).r,i=texelFetch(heightTexture,c+ivec2(1,1),0).r,j=texelFetch(heightTexture,c+ivec2(1,-1),0).r;vec3 n=normalize(vec3(-(j+2.*f+i-a-2.*d-g)*normalStrength,-(g+2.*h+i-a-2.*b-j)*normalStrength,1.));vec2 centre=texelFetch(heightTexture,c,0).rg;
${mode === 3 ? "frag=vec4(channel(channelSource[0],centre.r,n),channel(channelSource[1],centre.r,n),channel(channelSource[2],centre.r,n),channel(channelSource[3],centre.r,n));" : mode === 0 ? "vec3 v=normalize(vec3(n.xy*normalScale,n.z))*.5+.5;frag=vec4(mix(vec3(.5),v,centre.g),alphaMode==1?centre.g:1.);" : "frag=vec4(n*.5+.5,1.);"}}`;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    let contextError = "";
    const creationError = (event) => { contextError = event.statusMessage || ""; };
    canvas.addEventListener("webglcontextcreationerror", creationError);
    this.gl = canvas.getContext("webgl2", {
      antialias: false,
      preserveDrawingBuffer: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    canvas.removeEventListener("webglcontextcreationerror", creationError);
    if (!this.gl) throw new Error("需要 WebGL2，请在 Chrome/Edge 开启图形加速" + (contextError ? `（${contextError}）` : ""));
    this.float = !!this.gl.getExtension("EXT_color_buffer_float");
    this.maxSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
    this.programs = new Map();
    this.lastMs = 0;
  }
  program(indices, mode, seamMode = -1, buffered = false, layout = null) {
    const key =
      mode +
      ":" +
      seamMode +
      ":" +
      buffered +
      ":" +
      (layout ? JSON.stringify(layout) : "") +
      ":" +
      indices.sort((a, b) => a - b).join(",");
    if (this.programs.has(key)) {
      const p = this.programs.get(key);
      this.programs.delete(key);
      this.programs.set(key, p);
      return p;
    }
    const gl = this.gl;
    const compile = (source, type) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error);
      }
      return shader;
    };
    const vs = compile(VERTEX_GLSL, gl.VERTEX_SHADER),
      fs = compile(
        buffered
          ? bufferedFragmentGLSL(mode)
          : fragmentGLSL(indices, mode, seamMode, layout),
        gl.FRAGMENT_SHADER,
      ),
      p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error(error);
    }
    const entry = { p, locations: new Map() };
    this.programs.set(key, entry);
    if (this.programs.size > 24) {
      const first = this.programs.keys().next().value;
      gl.deleteProgram(this.programs.get(first).p);
      this.programs.delete(first);
    }
    return entry;
  }
  draw(
    state,
    w = 512,
    h = 512,
    {
      time = state.animation.time,
      formulaTime = null,
      tile = false,
      float = false,
      read = false,
      sampleOffset = [0, 0],
      sampleScale = [1, 1],
      retainTexture = false,
      preserveSeamlessScale = false,
      treeEdges = false,
      heightTexture = null,
      sources = null,
    } = {},
  ) {
    if (
      w > this.maxSize ||
      h > this.maxSize ||
      w * h > (retainTexture ? 16793604 : 16777216)
    )
      throw new Error(`图像超出显卡或内存上限（显卡边长 ${this.maxSize}）`);
    if (float && !this.float)
      throw new Error("此显卡不支持浮点 framebuffer，无法导出真实高精度数据");
    const frame = frameState(state, time);
    if (!sources && !heightTexture && frame.state.layers.some((l) => l.enabled && (l.arrange?.[0] || (l.mask && l.maskArrange?.[0]))))
      return this.drawArranged(state, w, h, { time, formulaTime, tile, float, read, sampleOffset, sampleScale });
    const heightNormal =
      [0, 4].includes(state.output.mode) &&
      state.layers[0].type === "HeightNormal" &&
      !frame.state.layers[0].arrange?.[0] &&
      !state.layers[1].enabled &&
      !state.layers[2].enabled;
    if (
      this.float &&
      !heightTexture &&
      !retainTexture &&
      ([2, 3].includes(state.output.mode) || heightNormal)
    )
      return this.drawBuffered(state, w, h, {
        time,
        formulaTime,
        tile,
        float,
        read,
        sampleOffset,
        sampleScale,
        sources,
      });
    const started = performance.now(),
      evaluated = frame,
      s = prepareSeamlessState(evaluated.state),
      gl = this.gl;
    // Tree nodes own their region; periodic sampling must not resize their geometry.
    if (preserveSeamlessScale && s.output.seamless)
      s.layers.forEach((layer,i) => { if(seamlessKind(layer.type,s.output.seamMode)===2)layer.uv[0] = evaluated.state.layers[i].uv[0]; });
    const types = s.layers.map((l) => BY_ID.get(l.type).index),
      masks = s.layers.map((l) => (l.mask ? BY_ID.get(l.mask).index : -1));
    const used = [
      ...new Set(
        s.layers.flatMap((l, i) =>
          l.enabled ? [...(!l.arrange?.[0] ? [types[i]] : []), ...(masks[i] >= 0 && !l.maskArrange?.[0] ? [masks[i]] : [])] : [],
        ),
      ),
    ];
    const generatedTextures=new Map();
    if(!heightTexture&&used.some(i=>CATALOG[i].definition.generator)){
      this.generators??=new GeneratorRenderer(gl,{float:this.float,prune:pruneGLSL});this.generators.begin();
      for(const i of used){const type=CATALOG[i];if(!type.definition.generator)continue;
        const values=s.layers.flatMap(l=>l.enabled?[...(l.type===type.id?[l.params]:[]),...(l.mask===type.id?[l.maskParams]:[])]:[]);
        if(values.some(p=>JSON.stringify(p)!==JSON.stringify(values[0])))throw Error('多组生成器参数请通过节点组合渲染');
        const libraries=resources.has(type.id)?resources.get(type.id).libraries:BUILTIN.libraries;
        generatedTextures.set(i,this.generators.render(type,values[0]??type.defaults,w,h,libraries,Number.isFinite(formulaTime)?formulaTime:evaluated.time));
      }
    }
    const entry = this.program(
      used,
      s.output.mode === 4 ? 0 : s.output.mode,
      s.output.seamless ? s.output.seamMode : -1,
      !!heightTexture,
      { treeEdges, bezier:!!s.layers[0].bezierTail?.length, types, masks, order: s.order, enabled: s.layers.map((l) => l.enabled), arranged: s.layers.map((l) => !!l.arrange?.[0]), maskArranged: s.layers.map((l) => !!l.mask && !!l.maskArrange?.[0]), table:s.layers.map(l=>l.arrange?.[0]>=6), maskTable:s.layers.map(l=>!!l.mask&&l.maskArrange?.[0]>=6), spiral:s.layers.map(l=>l.arrange?.[0]===5), maskSpiral:s.layers.map(l=>!!l.mask&&l.maskArrange?.[0]===5), diagonal:s.layers.map(l=>l.arrange?.[0]===4), maskDiagonal:s.layers.map(l=>!!l.mask&&l.maskArrange?.[0]===4) },
    );
    gl.useProgram(entry.p);
    const loc = (name) => {
      if (!entry.locations.has(name))
        entry.locations.set(name, gl.getUniformLocation(entry.p, name));
      return entry.locations.get(name);
    };
    if(s.layers[0].bezierTail?.length){const tail=new Float32Array((BEZIER_SEGMENTS-1)*6);tail.set(s.layers[0].bezierTail);gl.uniform2fv(loc('bezierTail'),tail);gl.uniform1i(loc('bezierSegmentCount'),1+s.layers[0].bezierTail.length/6);}
    let generatorUnit=8;for(const [id,target]of generatedTextures){gl.activeTexture(gl.TEXTURE0+generatorUnit);gl.bindTexture(gl.TEXTURE_2D,target.tex);gl.uniform1i(loc('generatedTexture'+id),generatorUnit++);}
    const imageId=used.map(i=>CATALOG[i].id).find(id=>bitmaps.has(id));
    if(imageId){const bitmap=bitmaps.get(imageId);bitmap.ensureSize?.(Math.min(this.maxSize,Math.max(w,h)));this.assetTextureSizes??=new WeakMap();this.assetTextures??=new Map();const sizeKey=bitmap.width+'x'+bitmap.height;let tex=this.assetTextures.get(imageId);if(tex&&this.assetTextureSizes.get(tex)!==sizeKey){gl.deleteTexture(tex);this.assetTextures.delete(imageId);tex=null;}if(!tex){tex=gl.createTexture();gl.activeTexture(gl.TEXTURE15);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmaps.get(imageId));gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.assetTextures.set(imageId,tex);this.assetTextureSizes.set(tex,sizeKey);}gl.activeTexture(gl.TEXTURE15);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(loc('assetImage'),15);}
    const ints = (name, data) => gl.uniform1iv(loc(name), data),
      floats = (name, data) => gl.uniform1fv(loc(name), data),
      vec4 = (name, data) => gl.uniform4fv(loc(name), data);
    ints("types", types);
    ints(
      "patternKind",
      s.layers.map((l) => seamlessKind(l.type, s.output.seamMode)),
    );
    ints(
      "maskKind",
      s.layers.map((l) => seamlessKind(l.mask, s.output.seamMode)),
    );
    gl.uniform1i(loc("seamless"), s.output.seamless ? 1 : 0);
    gl.uniform1f(loc("seamBlend"), s.output.seamBlend || 0.2);
    ints("masks", masks);
    ints(
      "enabled",
      s.layers.map((l) => (l.enabled ? 1 : 0)),
    );
    ints(
      "blendMode",
      s.layers.map((l) => l.blend),
    );
    ints("order", s.order);
    ints(
      "polar",
      s.layers.map((l) => (l.polar ? 1 : 0)),
    );
    ints(
      "maskInverse",
      s.layers.map((l) => (l.maskInvert ? 1 : 0)),
    );
    floats(
      "opacity",
      s.layers.map((l) => l.opacity),
    );
    vec4(
      "params",
      s.layers.flatMap((l) => l.params.slice(0,16)),
    );
    vec4(
      "maskParams",
      s.layers.flatMap((l) => l.maskParams.slice(0,16)),
    );
    vec4("arrange", s.layers.flatMap((l) => l.arrange.slice(0,16)));
    vec4("spiral", s.layers.flatMap(l=>l.arrange.slice(16,20).length===4?l.arrange.slice(16,20):[137.507764,0,1,0]));
    vec4("maskSpiral", s.layers.flatMap(l=>l.maskArrange.slice(16,20).length===4?l.maskArrange.slice(16,20):[137.507764,0,1,0]));
    vec4("maskArrange", s.layers.flatMap((l) => l.maskArrange.slice(0,16)));
    const a = (u) => [u[0], (u[1] * Math.PI) / 180, u[2], u[3]],
      b = (u) => [u[4], (u[5] * Math.PI) / 180, u[6], 0];
    vec4(
      "transformA",
      s.layers.flatMap((l) => a(l.uv)),
    );
    vec4(
      "transformB",
      s.layers.flatMap((l) => b(l.uv)),
    );
    vec4(
      "maskA",
      s.layers.flatMap((l) => a(l.maskUV)),
    );
    vec4(
      "maskB",
      s.layers.flatMap((l) => b(l.maskUV)),
    );
    const stops = s.stops.flatMap((p) => [
      parseInt(p.color.slice(1, 3), 16) / 255,
      parseInt(p.color.slice(3, 5), 16) / 255,
      parseInt(p.color.slice(5, 7), 16) / 255,
      p.position,
    ]);
    while (stops.length < 32) stops.push(...stops.slice(-4));
    vec4("stops", stops);
    gl.uniform1i(loc("stopCount"), s.stops.length);
    gl.uniform1i(loc("outputMode"), s.output.mode === 4 ? 0 : s.output.mode);
    ints("channelSource", s.output.channels);
    gl.uniform1i(loc("inverted"), s.output.invert ? 1 : 0);
    gl.uniform1i(loc("alphaMode"), s.output.alpha ? 1 : 0);
    vec4("postA", s.post.slice(0, 4));
    gl.uniform3fv(loc("postB"), s.post.slice(4));
    gl.uniform1f(loc("normalStrength"), s.output.normal);
    gl.uniform1f(loc("time"), evaluated.time);
    gl.uniform1i(loc("useManualFormulaTime"), Number.isFinite(formulaTime)?1:0);gl.uniform1f(loc("manualFormulaTime"), Number.isFinite(formulaTime)?formulaTime:0);
    gl.uniform1f(loc("tile"), tile ? 2 : 1);
    gl.uniform2f(loc("imageSize"), w, h);
    gl.uniform2fv(loc("sampleOffset"), sampleOffset);
    gl.uniform2f(loc("sampleStep"), sampleScale[0] / w, sampleScale[1] / h);
    gl.uniform1f(loc("normalScale"), s.layers[0].params[0]);
    let fb = null,
      texture = null,
      retained = false;
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    try {
      if (float || retainTexture) {
        fb = gl.createFramebuffer();
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          float ? gl.RGBA32F : gl.RGBA8,
          w,
          h,
          0,
          gl.RGBA,
          float ? gl.FLOAT : gl.UNSIGNED_BYTE,
          null,
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          texture,
          0,
        );
        if (
          gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE
        )
          throw new Error("浮点 framebuffer 不可用");
      } else gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // A mask-only pass may keep the sampler array's unused leading elements
      // active. Bind those too, so they cannot point at the output attachment.
      const fallbackSource = sources?.find(Boolean);
      if (fallbackSource) for (let i = 0; i < sources.length; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, (sources[i] || fallbackSource).texture);
        gl.uniform1i(loc(`sourceTextures[${i}]`), i);
      }
      if (sources?.table) {
        gl.activeTexture(gl.TEXTURE0+7);gl.bindTexture(gl.TEXTURE_2D,sources.table);
        gl.uniform1i(loc("instanceTable"),7);gl.uniform1iv(loc("instanceCounts"),sources.counts);
      }
      if (heightTexture) {
        const unit = sources ? 6 : 0;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, heightTexture.texture);
        gl.uniform1i(loc("heightTexture"), unit);
      }
      if(imageId){gl.activeTexture(gl.TEXTURE15);gl.bindTexture(gl.TEXTURE_2D,this.assetTextures.get(imageId));}
      let generatedUnit=8;for(const target of generatedTextures.values()){gl.activeTexture(gl.TEXTURE0+generatedUnit++);gl.bindTexture(gl.TEXTURE_2D,target.tex);}
      gl.viewport(0, 0, w, h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      let pixels = null;
      if (read) {
        const raw = float
          ? new Float32Array(w * h * 4)
          : new Uint8Array(w * h * 4);
        gl.readPixels(
          0,
          0,
          w,
          h,
          gl.RGBA,
          float ? gl.FLOAT : gl.UNSIGNED_BYTE,
          raw,
        );
        const error = gl.getError();
        if (error !== gl.NO_ERROR)
          throw new Error(`WebGL readPixels failed: ${error}`);
        pixels = new Float32Array(raw.length);
        const stride = w * 4;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < stride; x++)
            pixels[y * stride + x] =
              raw[(h - y - 1) * stride + x] / (float ? 1 : 255);
      }
      this.lastMs = performance.now() - started;
      if (retainTexture) {
        retained = true;
        return { texture };
      }
      return pixels;
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (fb) gl.deleteFramebuffer(fb);
      if (texture && !retained) gl.deleteTexture(texture);
    }
  }
  drawArranged(state, w, h, options) {
    const started = performance.now(), evaluated = frameState(state, options.time), sources = Array(6).fill(null);
    const instanceData=new Float32Array(512*6*4);sources.counts=new Int32Array(6);
    const size = Math.max(64, Math.min(2048, this.maxSize, Math.max(w, h)));
    try {
      for (let i = 0; i < 3; i++) {
        const l = evaluated.state.layers[i];
        if (!l.enabled) continue;
        for (const mask of [false, true]) {
          if (!(mask ? l.mask && l.maskArrange?.[0] : l.arrange?.[0])) continue;
          const arrangement=effectiveArrangement(mask?l.maskArrange:l.arrange,state.output.seamless);
          if(arrangement[0]>=6){
            let density;
            if(arrangement[0]===12){
              const densityState=structuredClone(evaluated.state),definition=CATALOG[arrangement[39]]??CATALOG[0];
              densityState.layers=[newLayer(definition.id),newLayer("Circle",false),newLayer("Circle",false)];
              densityState.layers[0].params=arrangement.slice(42,58);
              densityState.order=[0,1,2];densityState.output.mode=1;densityState.output.alpha=false;densityState.output.seamless=false;
              densityState.animation.enabled=false;densityState.animation.pingpong=false;densityState.post=[0,1,1,0,1,0,1];
              density=densitySampler(this.draw(densityState,128,128,{time:evaluated.time,float:this.float,read:true}),128);
            }
            const records=generateArrangement(arrangement,{seamless:state.output.seamless,density});
            const row=i+(mask?3:0);sources.counts[row]=records.length;
            records.forEach((p,j)=>{instanceData.set([p.x,p.y,p.size,p.turn,p.mirror,0,0,0],row*512*4+j*8);});
          }
          const source = structuredClone(evaluated.state), type = mask ? l.mask : l.type;
          source.layers = [newLayer(type), newLayer("Circle", false), newLayer("Circle", false)];
          source.layers[0].params = [...(mask ? l.maskParams : l.params)];
          source.layers[0].uv = [...(mask ? l.maskUV : l.uv)];
          source.layers[0].polar = mask ? false : l.polar;
          source.order = [0, 1, 2];
          source.output.mode = 1; source.output.alpha = false; source.output.seamless = false;
          source.post = [0, 1, 1, 0, 1, 0, 1];
          source.animation.enabled = false; source.animation.pingpong = false;
          sources[i + (mask ? 3 : 0)] = this.draw(source, size, size, { time: evaluated.time, formulaTime: options.formulaTime, float: this.float, retainTexture: true });
        }
      }
      if(evaluated.state.layers.some(l=>l.enabled&&(l.arrange[0]>=6||(l.mask&&l.maskArrange[0]>=6)))){
        const gl=this.gl;sources.table=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,sources.table);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,512,6,0,gl.RGBA,gl.FLOAT,instanceData);
      }
      this.lastArrangementCounts=Array.from(sources.counts);
      return this.draw(state, w, h, { ...options, sources });
    } finally {
      if(sources.table)this.gl.deleteTexture(sources.table);
      for (const source of sources) if (source) this.gl.deleteTexture(source.texture);
      this.lastMs = performance.now() - started;
    }
  }
  drawBuffered(state, w, h, options) {
    const start = performance.now(),
      heightState = structuredClone(state);
    heightState.output.mode = 5;
    const height = this.draw(heightState, w + 2, h + 2, {
      ...options,
      float: true,
      read: false,
      retainTexture: true,
      sampleScale: [
        (options.sampleScale[0] * (w + 2)) / w,
        (options.sampleScale[1] * (h + 2)) / h,
      ],
      sampleOffset: [
        options.sampleOffset[0] - options.sampleScale[0] / w,
        options.sampleOffset[1] - options.sampleScale[1] / h,
      ],
    });
    try {
      return this.draw(state, w, h, { ...options, heightTexture: height });
    } finally {
      this.gl.deleteTexture(height.texture);
      this.lastMs = performance.now() - start;
    }
  }
  dispose() {
    this.generators?.destroy();
    for (const { p } of this.programs.values()) this.gl.deleteProgram(p);
    this.programs.clear();
  }
}
