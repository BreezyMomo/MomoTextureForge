// A separate capability version keeps the existing formula ABI unchanged.
export const GENERATOR_SCHEMA='momo.generator/v1';
export const GENERATOR_LIMIT=64;
export const generatorSlotKey=slot=>slot<16?['R','W','N','S','D','K','H','T','A','B','C','E','F','G','I','J'][slot]:'P'+slot;
export function validateGenerator(spec,libraries){
 if(!spec)return;
 if(spec.schema!==GENERATOR_SCHEMA||!['smoke','fog','fire','sparks','lightning','dust','grain'].includes(spec.effect)||spec.revision!==1)throw Error('生成器版本或类型不受支持，请更新工具');
 if(!['alpha','luminance'].includes(spec.scalar))throw Error('生成器标量输出无效');
 if(!Array.isArray(spec.libraries)||!spec.libraries.length||spec.libraries.some(name=>!Object.hasOwn(libraries,name)))throw Error('生成器缺少着色器依赖');
 if(!spec.programs||!spec.programs.color||Object.values(spec.programs).some(name=>!spec.libraries.includes(name)))throw Error('生成器渲染步骤无效');
 if(spec.effect==='fog'&&!spec.programs.density)throw Error('雾气生成器缺少密度步骤');
}
