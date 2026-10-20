import {parseAuthoring,assetFromAuthoring,AUTHORING_LIMIT} from './ai-authoring.js';
import {GENERATOR_AUTHORING_SCHEMA,parseGeneratorAuthoring,assetFromGeneratorAuthoring} from './generator-authoring.js';
export function parseCreationAuthoring(input){
 if(typeof input==='string'){
  if(new TextEncoder().encode(input).length>AUTHORING_LIMIT)throw Error('创作文件超过2MB');
  try{input=JSON.parse(input.trim().replace(/^\uFEFF/,'').replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i,'$1'));}catch{throw Error('创作文件不是有效JSON，请粘贴完整JSON对象');}
 }
 return input?.schema===GENERATOR_AUTHORING_SCHEMA?parseGeneratorAuthoring(input):parseAuthoring(input);
}
export const assetFromCreationAuthoring=draft=>draft.schema===GENERATOR_AUTHORING_SCHEMA?assetFromGeneratorAuthoring(draft):assetFromAuthoring(draft);
