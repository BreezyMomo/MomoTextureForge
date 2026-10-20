// A separate capability version keeps the existing formula ABI unchanged.
export const GENERATOR_SCHEMA='momo.generator/v1';
export const GENERATOR_LIMIT=64;
export const GENERATOR_PASS_LIMIT=16;
export const generatorSlotKey=slot=>slot<16?['R','W','N','S','D','K','H','T','A','B','C','E','F','G','I','J'][slot]:'P'+slot;
export function validateGenerator(spec,libraries){
 if(!spec)return;
 if(spec.schema!==GENERATOR_SCHEMA||!['smoke','fog','fire','sparks','lightning','dust','grain','pipeline'].includes(spec.effect)||spec.revision!==1)throw Error('生成器版本或类型不受支持，请更新工具');
 if(!['alpha','luminance'].includes(spec.scalar))throw Error('生成器标量输出无效');
 if(!Array.isArray(spec.libraries)||!spec.libraries.length||spec.libraries.some(name=>!Object.hasOwn(libraries,name)))throw Error('生成器缺少着色器依赖');
 if(spec.effect==='pipeline'){
  if(!Array.isArray(spec.passes)||!spec.passes.length||spec.passes.length>GENERATOR_PASS_LIMIT)throw Error('自定义生成器需要1～16个渲染步骤');
  if(spec.helpers!==undefined&&(!Array.isArray(spec.helpers)||new Set(spec.helpers).size!==spec.helpers.length||spec.helpers.some(name=>!spec.libraries.includes(name))))throw Error('生成器辅助函数依赖无效');
  const seen=new Set();
  for(const pass of spec.passes){
   if(!pass||typeof pass.id!=='string'||!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(pass.id)||seen.has(pass.id))throw Error('生成器步骤ID无效或重复');
   if(!spec.libraries.includes(pass.program))throw Error('生成器步骤缺少着色器：'+pass.id);
   if(!Array.isArray(pass.inputs)||pass.inputs.length>3||pass.inputs.some(id=>!seen.has(id)))throw Error('生成器步骤只能引用前面步骤的结果（最多3个输入）：'+pass.id);
   if(pass.scale!==undefined&&(!Number.isFinite(pass.scale)||pass.scale<.125||pass.scale>1))throw Error('生成器步骤采样比例必须为0.125～1');
   seen.add(pass.id);
  }
  if((spec.passes.at(-1).scale??1)!==1)throw Error('生成器最后一步必须使用完整分辨率');
  return;
 }
 if(!spec.programs||!spec.programs.color||Object.values(spec.programs).some(name=>!spec.libraries.includes(name)))throw Error('生成器渲染步骤无效');
 if(spec.effect==='fog'&&!spec.programs.density)throw Error('雾气生成器缺少密度步骤');
}
