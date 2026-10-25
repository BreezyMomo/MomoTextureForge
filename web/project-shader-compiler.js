import {assetFor,builtinAsset,contentHash} from './resource-assets.js';
import {canvasRoot,find,walk} from './tree-model.js';
import {effectEnabled} from './post-effect-specs.js';
import {POST_EFFECTS} from './post-effect-specs.js';

export const REALTIME_SHADER_SCHEMA='momo.realtime-shader/v1';
export const SHADER_GRAPHICS=['Circle','Ring','RoundedRect','LinearGradient','RadialGradient','LedBar','FlowingWater','TurbulentFlame'];
const identityPost=[0,1,1,0,1,0,1],blendModes=['over','add','max','multiply','subtract','screen','difference','overlay','softlight','dodge','mask','inverseMask'];
const stable=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const sourceKey=a=>stable({kind:a.kind,scalar:a.definition.outputs.scalar,generator:a.definition.generator,parameters:a.definition.parameters.map(p=>[p.variable,p.slot,p.type??'number']),libraries:a.libraries});
function graphicProfile(id){const asset=assetFor(id);if(asset.kind!=='formula')return null;return SHADER_GRAPHICS.find(id=>sourceKey(builtinAsset(id))===sourceKey(asset))??null;}
function rootFor(project,nodeId){return nodeId?find(project.root,nodeId)?.node:canvasRoot(project.root);}
export function projectShaderSupport(project,{nodeId=null}={}){
 const root=rootFor(project,nodeId),issues=[],nodes=[];
 const issue=(n,capability,reason,route='Bake the affected subtree to textures, or implement and validate a dedicated shader module before exporting it live.')=>issues.push({nodeId:n.id,name:n.name,capability,reason,route});
 if(!root)return {supported:false,issues:[{nodeId,capability:'node',reason:'Unknown node',route:'Choose an existing node or export the whole canvas.'}],nodes:[]};
 walk(root,n=>{
  let graphic=null;try{if(n.kind==='shape')graphic=graphicProfile(n.type);}catch(error){issue(n,'resource',error.message);}
  if(n.kind==='shape'&&!graphic)issue(n,'graphic','This exact graphic implementation has no reviewed realtime HLSL adapter. GLSL source availability alone does not imply support.');
  nodes.push({nodeId:n.id,name:n.name,kind:n.kind,resourceId:n.kind==='shape'?n.type:null,graphic,enabled:n.enabled});
  if(Object.keys(n.tracks??{}).length)issue(n,'keyframes','Keyframe tracks are not compiled by the first realtime exporter.');
  if(n.arrange?.[0])issue(n,'arrangement','Instanced arrangement requires an arrangement compiler.');
  if(n.boundary!=='clip')issue(n,'boundary','Only clipped node boundaries are currently supported.');
  if(n.polar||n.uv?.[4])issue(n,'uv-animation','Polar UV and scrolling UV require an explicit timeline adapter. Static scale/rotation/offset/twist are supported.');
  if(n.color.mode==='remap'||n.color.stops?.length)issue(n,'color-ramp','Multi-stop palettes and remapping are not yet compiled. Solid and two-color gradients are supported.');
  if(n.invert||n.post.some((x,i)=>x!==identityPost[i])||n.contour?.mode!=='none'||n.curves.enabled)issue(n,'postprocessing','Levels, inversion, contours and channel curves require dedicated adapters.');
  for(const fx of POST_EFFECTS)if(effectEnabled(n,fx.id))issue(n,'effect:'+fx.id,'This active post effect needs a validated analytic or multi-pass implementation. Use the unified postprocess support query for handdrawn.');
  const t=n.timing;
  if(t.start!==0||t.end!==1||t.from!==0||t.to!==1||t.cycles!==1||t.loop||t.pingpong||t.frozen||t.offset||t.outside!=='hold'||t.before&&t.before!=='hold'||t.after&&t.after!=='hold'||t.ease!=='linear'||t.curve?.length)issue(n,'timing','Non-default node timing is not compiled. Formula clocks remain continuous seconds and are supported.');
  if(!blendModes.includes(n.blend))issue(n,'blend','Unknown blend operation.');
 });
 return {schema:'momo.shader-support/v1',supported:!issues.length,scope:nodeId?'solo-node':'canvas',nodeId,graphics:SHADER_GRAPHICS,nodes,issues,
  target:{engine:'Unity',version:'2022.3',pipeline:'URP',pipelineVersion:'14',shaderModel:'3.5',passCount:1},
  categories:{formulas:'reviewed exact source implementations only',generators:'FlowingWater and TurbulentFlame native RGBA, continuous seconds',transforms:'static placement, pivot, rotation, mirror, contain/stretch, static UV',colors:'inherited, preserved, solid or two-stop sRGB',blending:blendModes,masks:'sibling alpha mask/inverseMask and attached height mask',timing:'formula clock speed, offset or frozen seconds; no keyframe/timing compilation',effects:'not compiled by analytic mode; supported handdrawn uses the unified postprocess',externalResources:'no external textures in this subset; unknown/custom implementations rejected'},
  limitations:['Analytic composition samples functions directly; native per-node raster filtering can produce boundary differences.','High-frequency details can alias at low target resolutions because native intermediate supersampling is not exported. Match design resolution or adapt target antialiasing/density explicitly.','Export duration is not a seamless-loop promise.','No Unity compilation is performed by the browser exporter.']};
}

const clean=s=>s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,c=>c.replace(/[^\n]/g,' '));
function functions(source){const code=clean(source),result=[],re=/\b(?:float|int|bool|vec[234])\s+(\w+)\s*\([^;{}]*\)\s*\{/g;let m;while((m=re.exec(code))){let depth=1,end=re.lastIndex;while(depth&&end<code.length){const c=code[end++];if(c==='{')depth++;if(c==='}')depth--;}result.push({name:m[1],text:source.slice(m.index,end),signature:source.slice(m.index,re.lastIndex-1)});re.lastIndex=end;}return result;}
// Retain only functions reachable from the graphic; never ship the full catalog.
function dependencies(source,entry){const all=functions(source),byName=new Map();for(const fn of all){if(!byName.has(fn.name))byName.set(fn.name,[]);byName.get(fn.name).push(fn);}const needed=new Set();function visit(name){if(needed.has(name))return;needed.add(name);for(const fn of byName.get(name)??[])for(const call of fn.text.matchAll(/\b(\w+)\s*\(/g))if(byName.has(call[1]))visit(call[1]);}visit(entry);return all.filter(fn=>needed.has(fn.name));}
function replaceWords(text,mapping){return text.replace(/\b[A-Za-z_]\w*\b/g,word=>mapping[word]??word);}
// A deliberately bounded GLSL dialect adapter, only entered after exact-source checks.
export function shaderHLSL(source){
 // GLSL matrix constructors are column-major; the reviewed noise helper uses
 // a named constant 2x2 rotation followed by matrix-vector multiplication.
 const matrices=[];
 let text=source.replace(/\bmat2\s+(\w+)\s*=\s*mat2\(([^()]*)\)/g,(_,name,args)=>{const v=args.split(',');if(v.length!==4)throw Error('Unsupported matrix constructor');matrices.push(name);return 'float2x2 '+name+'=float2x2('+[v[0],v[2],v[1],v[3]].join(',')+')';});
 for(const name of matrices)text=text.replace(new RegExp('\\b'+name+'\\s*\\*\\s*(\\w+)','g'),(_,v)=>'mul('+name+','+v+')');
 text=text.replace(/\bvec([234])\s*\(/g,(_,n)=>'MF_vec'+n+'(');
 // Expand scalar vector constructors; HLSL does not universally accept GLSL splats.
 function constructors(s){let out='';for(let i=0;i<s.length;){const m=/^MF_vec([234])\(/.exec(s.slice(i));if(!m){out+=s[i++];continue;}const start=i+m[0].length;let end=start,depth=1;for(;end<s.length&&depth;end++){if(s[end]==='(')depth++;if(s[end]===')')depth--;}const inner=constructors(s.slice(start,end-1));let nesting=0,commas=0;for(const c of inner){if(c==='(')nesting++;if(c===')')nesting--;if(c===','&&!nesting)commas++;}const swizzle=/\.([xyzwrgba]+)$/.exec(inner.trim());out+='float'+m[1]+'('+(commas||swizzle?.[1].length===Number(m[1])?inner:Array(Number(m[1])).fill(inner).join(','))+')';i=end;}return out;}
 text=constructors(text);
 return text.replace(/\bvec([234])\b/g,'float$1').replace(/\bmix\b/g,'lerp').replace(/\bfract\b/g,'frac').replace(/\batan\(/g,'atan2(').replace(/\bpoint\b/g,'mfPoint').replace(/\buniform\s+/g,'').replace(/\bconst float MF_(PI|TAU)=/g,'static const float MF_$1=').replace(/\bfloat (MF_graphic\d+_\w*[Hh]ash\w*)\(/g,'precise float $1(');
}

const COMMON=`
const float PI=3.14159265359;const float TAU=6.28318530718;
struct MF_Value {vec4 color;float height;};
MF_Value MF_zero(){MF_Value v;v.color=vec4(0.);v.height=0.;return v;}
vec2 MF_rot(vec2 q,float a){float c=cos(a),s=sin(a);return vec2(c*q.x+s*q.y,-s*q.x+c*q.y);}
vec2 MF_place(vec2 p,vec4 box,vec4 axis,float aspect){p-=box.xy;p=MF_rot(p*vec2(aspect,1.),axis.z);p/=max(box.zw*vec2(aspect,1.),vec2(.000001));p.x*=axis.w;return p+axis.xy;}
vec4 MF_blend(vec4 dst,vec4 src,int mode){float a=src.a+dst.a*(1.-src.a);if(mode==0)return vec4(src.rgb+dst.rgb*(1.-src.a),a);vec3 d=dst.a>0.?dst.rgb/dst.a:vec3(0.),s=src.a>0.?src.rgb/src.a:vec3(0.);if(mode==10)return dst*src.a;if(mode==11)return dst*(1.-src.a);vec3 b=mode==6?abs(d-s):mode==7?mix(2.*d*s,1.-2.*(1.-d)*(1.-s),step(vec3(.5),d)):mode==8?(1.-2.*s)*d*d+2.*s*d:mode==9?min(vec3(1.),d/max(vec3(.00001),1.-s)):mode==1?d+s:mode==2?max(d,s):mode==3?d*s:mode==4?max(d-s,0.):1.-(1.-d)*(1.-s);return vec4((1.-src.a)*dst.rgb+(1.-dst.a)*src.rgb+src.a*dst.a*b,a);}
float MF_height(float d,float s,float a,int mode){if(mode==0)return s+d*(1.-a);if(mode==1)return d+s;if(mode==2)return max(d,s);if(mode==3)return mix(d,d*(a>0.?s/a:0.),a);if(mode==4)return max(d-s,0.);if(mode==6)return abs(d-s);if(mode==7)return d<.5?2.*d*s:1.-2.*(1.-d)*(1.-s);if(mode==8)return (1.-2.*s)*d*d+2.*s*d;if(mode==9)return min(1.,d/max(.00001,1.-s));if(mode==10)return d*a;if(mode==11)return d*(1.-a);return 1.-(1.-d)*(1.-s);}
`;
export async function compileProjectShader(project,{nodeId=null}={}){
 const support=projectShaderSupport(project,{nodeId});if(!support.supported){const error=Error(support.issues.map(i=>i.nodeId+' ['+i.capability+']: '+i.reason).join('\n'));error.support=support;throw error;}
 const source=structuredClone(project),root=rootFor(source,nodeId),assets={};walk(root,n=>{if(n.kind==='shape')assets[n.type]=assetFor(n.type);});const hash=await contentHash({project:source,assets,nodeId,compiler:1}),prefix='TF'+hash.slice(0,12),properties=[],mapping=[],modules=[],code=[];let index=0;
 const add=(name,type,value,label,path,node)=>{properties.push({name,type,value,label,nodeId:node.id,path});return name;};
 const prop=(n,i,key,type,value,path)=>add('_MF_'+i+'_'+key,type,value,n.name+' / '+key,path,n);
 function build(n,parentPalette={low:[0,0,0,1],high:[1,1,1,1]}){
  const i=index++,id='MF_node'+i,palette={...parentPalette},entry={nodeId:n.id,index:i,name:n.name,resourceId:n.kind==='shape'?n.type:null,properties:[]};mapping.push(entry);
  const vector=(key,value,path)=>prop(n,i,key,'Vector',value,path),scalar=(key,value,path)=>prop(n,i,key,'Float',value,path);
  const transform=vector('placement',[n.transform.x,n.transform.y,n.transform.width,n.transform.height],'transform'),axis=vector('pivotTurn',[n.transform.pivotX,n.transform.pivotY,n.transform.rotation,n.transform.mirrorX?-1:1],'transform.pivot/rotation/mirrorX'),opacity=scalar('opacity',n.opacity,'opacity');
  if(n.color.mode==='own'){const rgb=h=>[1,3,5].map(k=>parseInt(h.slice(k,k+2),16)/255);palette.low=vector('lowSRGB',[...rgb(n.color.fill==='solid'?n.color.high:n.color.low),1],'color.low');palette.high=vector('highSRGB',[...rgb(n.color.high),1],'color.high');}
  const colorExpr=c=>typeof c==='string'?c+'.rgb':'vec3('+c.slice(0,3).map(number).join(',')+')';
  const children=n.children.map(child=>({node:child,fn:build(child,palette)})),mask=n.mask?build(n.mask,palette):null;
  let body='MF_Value result=MF_zero();\n';
  if(n.kind==='shape'){
   const asset=assetFor(n.type),d=asset.definition,profile=graphicProfile(n.type),uniforms={};
   for(const p of d.parameters){uniforms[p.variable]=scalar(p.variable,n.params[p.slot],'params.'+p.slot);Object.assign(properties.at(-1),{variable:p.variable,slot:p.slot,min:p.min,max:p.max,step:p.step,unit:p.unit??'native parameter units',role:p.role??null,aliases:p.aliases});}
   const values=Array(16).fill('0.');for(const p of d.parameters)values[p.slot]=uniforms[p.variable];
   const uv=vector('uv',[n.uv[0],n.uv[1],n.uv[2],n.uv[3]],'uv.0..3'),twist=scalar('uvTwist',n.uv[6],'uv.6'),clock=vector('clock',[n.shapeClock.speed,n.shapeClock.offset,n.shapeClock.value,n.shapeClock.follow?1:0],'shapeClock');
   body+=`float time=${clock}.w>.5?seconds*${clock}.x+${clock}.y:${clock}.z;vec2 graphicUV=p-.5;graphicUV=MF_rot(graphicUV/max(${uv}.x,.1),${uv}.y+length(graphicUV)*${twist});graphicUV+=${uv}.zw+.5;\n`;
   const fn='MF_graphic'+i;
   if(d.generator){
    const full=Object.values(asset.libraries).join('\n').replace('vec2 rot(vec2 q,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*q;}','vec2 rot(vec2 q,float a){return MF_rot(q,a);}'),needed=dependencies(full,'generate'),rename=Object.fromEntries(needed.map(f=>[f.name,fn+'_'+f.name]));Object.assign(rename,uniforms,{generatorSeed:uniforms.seed});
    // Explicit arguments avoid global shared clocks and same-type node collisions.
    const declarations=needed.map(f=>replaceWords(f.text,rename).replace(/\(([^()]*)\)\s*\{/,(_,args)=>'('+args+(args.trim()?',':'')+'float time){'));
    const names=new Set(needed.map(f=>rename[f.name]));
    // Inject a clock into helper calls using balanced parentheses, including nested calls.
    function callTimes(s){let out='';for(let pos=0;pos<s.length;){const m=/^(\w+)\s*\(/.exec(s.slice(pos));if(!m){out+=s[pos++];continue;}const start=pos+m[0].length;let end=start,depth=1;for(;end<s.length&&depth;end++){if(s[end]==='(')depth++;if(s[end]===')')depth--;}const inner=callTimes(s.slice(start,end-1)),tail=s.slice(end).trimStart();out+=m[0]+inner+(names.has(m[1])&&!tail.startsWith('{')?(inner.trim()?',':'')+'time':'')+')';pos=end;}return out;}
    const adapted=declarations.map(callTimes).join('\n');modules.push(adapted);body+=`vec4 raw=${fn}_generate(graphicUV,time);if(graphicUV.x<0.||graphicUV.y<0.||graphicUV.x>1.||graphicUV.y>1.)raw=vec4(0.);float h=clamp(dot(raw.rgb,vec3(.2126,.7152,.0722))*raw.a,0.,1.);result.color=vec4(${n.color.mode==='own'?`mix(${colorExpr(palette.low)},${colorExpr(palette.high)},h)`:'raw.rgb'}*raw.a,raw.a);result.height=h;\n`;
   }else{
    const spec=d.outputs.scalar,formula=spec.kind==='expression'?'return clamp('+spec.inline+',0.,1.);':spec.inline;
    const wrapper=`float ${fn}(vec2 u,vec4 a,vec4 b,vec4 mfC,vec4 mfD,float time){vec2 q=u*2.-1.;float r=length(q),angle=atan(q.y,q.x);float R=a.x,W=a.y,N=a.z,S=a.w,D=b.x,K=b.y,H=b.z,T=time*b.w;${formula}}`;
    let all=Object.values(asset.libraries).join('\n')+'\n'+wrapper;
    // Use the exact editor antialiasing variant, rather than a second shape formula.
    all=all.replace('float fill(float d,float s){return 1.-smoothstep(0.,max(s,.0001),d);}','float fill(float d,float s){float aa=max(fwidth(d),.00001);return 1.-smoothstep(-aa*.5,max(s,0.)+aa*.5,d);}')
     .replace('float line(float d,float w,float s){return 1.-smoothstep(w,w+max(s,.0001),abs(d));}','float line(float d,float w,float s){return fill(abs(d)-w,s);}')
     .replace('vec2 rot(vec2 q,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*q;}','vec2 rot(vec2 q,float a){return MF_rot(q,a);}');
    const needed=dependencies(all,fn),rename=Object.fromEntries(needed.filter(f=>f.name!==fn).map(f=>[f.name,fn+'_'+f.name]));modules.push(needed.map(f=>replaceWords(f.signature,rename)+';').join('\n')+'\n'+needed.map(f=>replaceWords(f.text,rename)).join('\n'));
    body+=`float h=clamp(${fn}(graphicUV,${[0,4,8,12].map(k=>'vec4('+values.slice(k,k+4).join(',')+')').join(',')},time),0.,1.);result.color=vec4(mix(${colorExpr(palette.low)},${colorExpr(palette.high)},h)*h,h);result.height=h;\n`;
   }
   entry.graphic=profile;
  }else for(const child of children){const mode=blendModes.indexOf(child.node.blend);body+=`{MF_Value child=${child.fn}(p,aspect,seconds);result.height=MF_height(result.height,child.height,child.color.a,${mode});result.color=MF_blend(result.color,child.color,${mode});}\n`;}
  if(mask)body+=`{MF_Value mask=${mask}(p,aspect,seconds);float amount=clamp(${n.maskInvert?'1.-mask.height':'mask.height'},0.,1.);result.color*=amount;result.height*=amount;}\n`;
  body+=`result.color*=${opacity};result.height*=${opacity};return result;`;
  code.push(`MF_Value ${id}(vec2 p,float aspect,float seconds){vec4 box=${transform};${n.transform.fit==='contain'?'float side=min(box.z*aspect,box.w);box.z=side/aspect;box.w=side;':''}if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,vec4(${axis}.xy,${axis}.z*PI/180.,${axis}.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||${n.enabled?'false':'true'})return MF_zero();\n${body}\n}`);
  return id;
 }
 const rootFn=build(root),declarations=properties.map(p=>'uniform '+(p.type==='Vector'?'vec4':'float')+' '+p.name+';').join('\n'),glslCore=replaceWords(declarations+'\n'+COMMON+'\n'+modules.join('\n')+'\n'+code.join('\n')+`\nvec4 MF_Evaluate(vec2 uv,float seconds){return ${rootFn}(uv,${number(project.canvas.ratio)},seconds).color;}\n`,{PI:'MF_PI',TAU:'MF_TAU'});
 const uniformHLSL=properties.map(p=>(p.type==='Vector'?'float4':'float')+' '+p.name+';').join('\n'),hlsl=shaderHLSL(glslCore.replace(declarations,''));
 mapping.forEach(m=>m.properties=properties.filter(p=>p.nodeId===m.nodeId).map(({name,path,type,value})=>({name,path,type,value,encoding:name.endsWith('SRGB')?'sRGB numeric vector':undefined})));
 return {prefix,sourceHash:hash,support,properties,mapping,glslCore,hlsl,uniformHLSL,source,assets};
}
function number(n){return Number.isInteger(n)?n+'.':String(n);}
