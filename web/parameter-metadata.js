import {messageError} from './message-catalog.js';
// Presentation metadata never changes parameter bindings or shader source.
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keywords=new Set(('attribute const uniform varying buffer shared coherent volatile restrict readonly writeonly atomic_uint layout centroid flat smooth noperspective patch sample break continue do for while switch case default if else subroutine in out inout float double int void bool true false invariant precise discard return mat2 mat3 mat4 dmat2 dmat3 dmat4 vec2 vec3 vec4 ivec2 ivec3 ivec4 bvec2 bvec3 bvec4 dvec2 dvec3 dvec4 uint uvec2 uvec3 uvec4 lowp mediump highp precision sampler2D samplerCube sampler3D struct common partition active asm class union enum typedef template this resource goto inline noinline public static extern external interface long short half fixed unsigned superp input output hvec2 hvec3 hvec4 fvec2 fvec3 fvec4 sampler1D sampler2DRect samplerBuffer filter sizeof cast namespace using').split(' '));
const host=new Set('u q r angle time a b c d uv gp input0 input1 input2 generatorSeed generatorResolution outputValue blurDirection bloomStrengths blurRadius emissionIntensity generate main gl_Position gl_FragCoord'.split(' '));
const functions=new Set('radians degrees sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh pow exp log exp2 log2 sqrt inversesqrt abs sign floor trunc round roundEven ceil fract mod modf min max clamp mix step smoothstep isnan isinf floatBitsToInt floatBitsToUint intBitsToFloat uintBitsToFloat length distance dot cross normalize faceforward reflect refract matrixCompMult outerProduct transpose determinant inverse lessThan lessThanEqual greaterThan greaterThanEqual equal notEqual any all not texture textureProj textureLod textureOffset texelFetch textureSize dFdx dFdy fwidth sat rot fill line noise fbm segment'.split(' '));
export const isShaderFunction=name=>functions.has(name);
export function validVariable(name){return typeof name==='string'&&/^[A-Za-z_][A-Za-z0-9_]{0,79}$/.test(name)&&!name.startsWith('gl_')&&!name.includes('__')&&!keywords.has(name)&&!host.has(name)&&!/^([biud]?vec[234]|d?mat[234](x[234])?|[iu]?(?:sampler|image)(?:[123]D|Cube|2DRect|Buffer)(?:Array)?(?:Shadow|MS|MSArray)?)$/.test(name);}
export function validateVariable(name){if(!validVariable(name))throw messageError("errors.invalidOrReservedParameterVariable", name);return name;}
export function canonicalLanguage(value){
 if(typeof value!=='string'||value.length>48||!/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(value))throw messageError("errors.invalidLanguageTag", value);
 try{return Intl.getCanonicalLocales(value)[0];}catch{throw messageError("errors.invalidLanguageTag", value);}
}
export function normalizeAliases(aliases){
 if(aliases===undefined)return undefined;
 if(!object(aliases)||Object.keys(aliases).length>32)throw messageError("validation.parameterAliasesMustMapLanguageCodesToNamesUpToLanguages");
 const result={};for(const [language,value]of Object.entries(aliases)){
  const key=canonicalLanguage(language);
  if(Object.hasOwn(result,key))throw messageError("errors.duplicateAliasLanguage", key);
  if(typeof value!=='string'||value.length>128)throw messageError("validation.parameterAliasesMustContainTextOfUpToCharacters");
  result[key]=value.trim();
 }return result;
}
export function parameterAliases(spec){return normalizeAliases(spec.aliases)??(typeof spec.label==='string'&&spec.label.trim()?{'zh-CN':spec.label}:{});}
export function resolveAlias(spec,languages=['zh-CN','en']){
 const aliases=parameterAliases(spec);
 for(const language of languages){const value=aliases[language];if(typeof value==='string'&&value.trim())return value.trim();}
 return spec.variable??spec.key??'';
}
export function parameterRole(spec){return spec.role??(spec.aliases===undefined&&spec.label==='羽化'?'feather':spec.aliases===undefined&&typeof spec.label==='string'&&spec.label.includes('羽化')?'edge-softness':spec.aliases===undefined&&spec.label==='图片显示'?'image-mode':undefined);}
export function normalizeParameter(spec,{legacy=false}={}){
 if(!object(spec))throw messageError("validation.invalidParameterDefinition");
 const variable=spec.variable??(legacy?spec.key:undefined);validateVariable(variable);
 const aliases=normalizeAliases(spec.aliases??(typeof spec.label==='string'?{'zh-CN':spec.label}:{}));
 const result={...spec,variable,aliases};
 const role=parameterRole(spec);if(role)result.role=role;
 // Old readers still have a base label; new display code only resolves aliases.
 result.label=spec.label??aliases['zh-CN']??Object.values(aliases).find(Boolean)??variable;
 if(spec.role!==undefined&&!['feather','edge-softness','image-mode'].includes(spec.role))throw messageError("errors.unknownParameterRole", spec.role);
 if(spec.options)result.options=spec.options.map(o=>{
  if(!object(o))throw messageError("validation.invalidParameterOption");
  const optionVariable=o.variable??'value'+String(o.value).replace('-','Minus').replace('.','Point');validateVariable(optionVariable);
  const names=normalizeAliases(o.aliases??(typeof o.label==='string'?{'zh-CN':o.label}:{}));
  return {...o,variable:optionVariable,aliases:names,label:o.label??names['zh-CN']??Object.values(names).find(Boolean)??optionVariable};
 });
 return result;
}
export function validateParameterMetadata(spec,{legacy=true}={}){
 const value=normalizeParameter(spec,{legacy});
 if(value.options&&new Set(value.options.map(o=>o.variable)).size!==value.options.length)throw messageError("validation.duplicateParameterOptionVariable");
 if(value.options&&new Set(value.options.map(o=>o.value)).size!==value.options.length)throw messageError("validation.duplicateParameterOptionValue");
 return value;
}
