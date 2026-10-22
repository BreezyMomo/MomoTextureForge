import {graphicAliasesField} from './graphic-name.js';
import {messageError} from './message-catalog.js';
import {normalizeParameter,validateVariable} from './parameter-metadata.js';
import {builtinAsset,validateAsset} from './resource-assets.js';
import {GENERATOR_SCHEMA,GENERATOR_LIMIT,generatorSlotKey} from './generator-schema.js';
export const GENERATOR_AUTHORING_SCHEMA='momo.generator-authoring/v1';
export const GENERATOR_AUTHORING_LIMIT=2*1024*1024;
export const EMPTY_GENERATOR={schema:GENERATOR_AUTHORING_SCHEMA,name:'新生成器',category:'我的图形',description:'',scalar:'alpha',parameters:[{variable:'seed',label:'随机种子',min:0,max:99999,step:1,default:1}],helpers:'',passes:[{id:'result',inputs:[],scale:1,source:'vec4 generate(vec2 uv){\n // 在这里编写图形算法，返回原色 RGB 和透明度 A（0～1）。\n return vec4(0.);\n}'}]};
export const GENERATOR_EXAMPLE={schema:GENERATOR_AUTHORING_SCHEMA,name:'彩色柔光环',category:'我的图形',description:'形状、柔光和合成三个渲染步骤。',scalar:'alpha',parameters:[...EMPTY_GENERATOR.parameters,{variable:'radius',label:'半径',min:.1,max:.8,step:.01,default:.45},{variable:'softness',label:'柔光',min:.01,max:.15,step:.01,default:.05}],helpers:'float ringDistance(vec2 p,float radius){return abs(length(p*2.-1.)-radius);}',passes:[{id:'shape',inputs:[],scale:.5,source:'vec4 generate(vec2 uv){float a=1.-smoothstep(.02,.04,ringDistance(uv,radius));return vec4(.1,.5,1.,a);}'},{id:'glow',inputs:['shape'],scale:1,source:'vec4 generate(vec2 uv){vec4 sum=vec4(0);for(int i=-4;i<=4;i++)sum+=texture(input0,uv+vec2(float(i)*softness,0));sum/=9.;return vec4(sum.rgb,sum.a);}'},{id:'result',inputs:['shape','glow'],scale:1,source:'vec4 generate(vec2 uv){vec4 a=texture(input0,uv),b=texture(input1,uv);return vec4(mix(b.rgb,a.rgb,a.a),max(a.a,b.a*.6));}'}]};
for(const p of [...EMPTY_GENERATOR.parameters,...GENERATOR_EXAMPLE.parameters])p.aliases={'zh-CN':p.label,en:({seed:'Random seed',radius:'Radius',softness:'Softness'})[p.variable]};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=(value,label,limit,empty=false)=>{if(typeof value!=='string'||value.length>limit||(!empty&&!value.trim()))throw Error(label+'为空或超过长度限制');return value;};
export function parseGeneratorAuthoring(input){
 if(typeof input==='string'){
  if(new TextEncoder().encode(input).length>GENERATOR_AUTHORING_LIMIT)throw messageError("generator.generatorFileExceedsMB");
  const source=input.trim().replace(/^\uFEFF/,'').replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i,'$1');
  try{input=JSON.parse(source);}catch{throw Error('生成器不是有效JSON，请粘贴完整JSON对象');}
 }
 if(!object(input)||input.schema!==GENERATOR_AUTHORING_SCHEMA)throw Error('不支持的生成器创作文件版本');
 const draft={schema:GENERATOR_AUTHORING_SCHEMA,...graphicAliasesField(input.aliases),name:text(input.name??'新生成器','图形名称',80),category:text(input.category??'我的图形','分类',80),description:text(input.description??'','说明',2000,true),scalar:input.scalar??'alpha',parameters:input.parameters,helpers:text(input.helpers??'','辅助函数',1048576,true),passes:input.passes};
 if(!Array.isArray(draft.parameters)||draft.parameters.length>GENERATOR_LIMIT)throw Error('生成器参数必须是数组，最多64个');
 draft.parameters=draft.parameters.map(p=>{
  if(!object(p))throw Error('生成器参数无效');
  validateVariable(p.variable);
  return normalizeParameter({variable:p.variable,...(p.label!==undefined?{label:p.label}:{}),...(p.aliases!==undefined?{aliases:p.aliases}:{}),min:p.min,max:p.max,step:p.step,default:p.default,...(p.role?{role:p.role}:{}),...(p.type?{type:p.type}:{}),...(p.options?{options:structuredClone(p.options)}:{})});
 });
 if(!Array.isArray(draft.passes)||!draft.passes.length||draft.passes.length>16)throw Error('自定义生成器需要1～16个渲染步骤');
 draft.passes=draft.passes.map(p=>{if(!object(p))throw Error('生成器步骤无效');return {id:p.id,inputs:p.inputs??[],scale:p.scale??1,source:text(p.source,'步骤 GLSL',65536)};});
 if(new TextEncoder().encode(JSON.stringify(draft)).length>GENERATOR_AUTHORING_LIMIT)throw messageError("generator.generatorFileExceedsMB");
 assetFromGeneratorAuthoring(draft);return draft;
}
export function assetFromGeneratorAuthoring(draft){
 const asset=builtinAsset('Circle'),def=asset.definition;
 asset.libraries={'math-v1':asset.libraries['math-v1']};
 const helpers=[];if(draft.helpers){asset.libraries['generator-helpers']=draft.helpers;helpers.push('generator-helpers');}
 const passes=draft.passes.map((p,i)=>{const program='generator-pass-'+i;asset.libraries[program]=p.source;return {id:p.id,inputs:p.inputs,scale:p.scale,program};});
 def.id='AuthoredGenerator';def.revision=1;def.name=draft.name;delete def.aliases;Object.assign(def,graphicAliasesField(draft.aliases));def.parameters=draft.parameters.map((p,slot)=>({...p,slot,key:generatorSlotKey(slot)}));
 def.defaults=Array(Math.max(16,def.parameters.length)).fill(0);for(const p of def.parameters)def.defaults[p.slot]=p.default;
 def.outputs={scalar:{kind:'body',inline:'return 0.;',libraries:['math-v1']}};def.seamless={kind:'blend'};def.editor={kind:'parameters'};
 def.generator={schema:GENERATOR_SCHEMA,revision:1,effect:'pipeline',scalar:draft.scalar,libraries:Object.keys(asset.libraries).filter(n=>n!=='math-v1'),helpers,passes};
 validateAsset(asset);return asset;
}
export function generatorAuthoringFromAsset(asset,meta={}){
 const def=asset.definition,spec=def.generator;if(spec?.effect!=='pipeline')throw Error('内置生成器请编辑参数或导出完整资源包');
 return parseGeneratorAuthoring({schema:GENERATOR_AUTHORING_SCHEMA,name:meta.name??def.name,...graphicAliasesField(Object.hasOwn(meta,'aliases')?meta.aliases:def.aliases),category:meta.category??'我的图形',description:meta.description??'',scalar:spec.scalar,parameters:def.parameters.map(({slot,key,...p})=>p),helpers:(spec.helpers??[]).map(id=>asset.libraries[id]).join('\n'),passes:spec.passes.map(p=>({id:p.id,inputs:p.inputs,scale:p.scale??1,source:asset.libraries[p.program]}))});
}
