export const RECIPE_SCHEMA='momo.project-authoring/v1',DOCUMENT_SCHEMA='momo.project-document/v1';
export function safeData(value){
 if(value===null||['string','boolean'].includes(typeof value))return;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite JSON number');return;}
 if(typeof value!=='object')throw Error('Expected JSON data');
 for(const [key,v]of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))throw Error('Forbidden property: '+key);safeData(v);}
}
