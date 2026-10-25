export const RECIPE_SCHEMA='momo.project-authoring/v1',DOCUMENT_SCHEMA='momo.project-document/v1';
export const RECIPE_LIMITS=Object.freeze({bytes:768*1024,depth:32,elements:60000,operations:2048});
// Bound containers before recursive validation/stringification. Counts match the
// MCP SDK: every array element and object member counts, including containers.
export function validateRecipe(recipe){
 const stack=[{value:recipe,depth:0}];let elements=0;
 while(stack.length){
  const {value,depth}=stack.pop();
  if(value===null||typeof value!=='object')continue;
  if(depth>RECIPE_LIMITS.depth)throw Error('Recipe exceeds maximum depth '+RECIPE_LIMITS.depth);
  for(const child of Object.values(value)){
   if(++elements>RECIPE_LIMITS.elements)throw Error('Recipe exceeds maximum '+RECIPE_LIMITS.elements+' elements');
   if(child!==null&&typeof child==='object')stack.push({value:child,depth:depth+1});
  }
 }
 safeData(recipe);
 if(new TextEncoder().encode(JSON.stringify(recipe)).length>RECIPE_LIMITS.bytes)throw Error('Recipe exceeds maximum '+RECIPE_LIMITS.bytes+' UTF-8 bytes');
 if(recipe?.schema!==RECIPE_SCHEMA||!Array.isArray(recipe.operations)||recipe.operations.length>RECIPE_LIMITS.operations)throw Error('Expected '+RECIPE_SCHEMA+' with at most '+RECIPE_LIMITS.operations+' operations');
}
export function safeData(value){
 if(value===null||['string','boolean'].includes(typeof value))return;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite JSON number');return;}
 if(typeof value!=='object')throw Error('Expected JSON data');
 for(const [key,v]of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))throw Error('Forbidden property: '+key);safeData(v);}
}
