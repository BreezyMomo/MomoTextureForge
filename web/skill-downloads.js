import {AUTHORING_SKILL,AUTHORING_GUIDE,AUTHORING_EXAMPLE} from './ai-authoring.js';
import {encodeZIP,download} from './encoders.js';
export async function skillFiles(kind){
 let folder,filename,files;
 if(kind==='author'){const {default:authoringRuntime}=await import('./authoring-kit-runtime.js');folder='texture-forge-author';filename='texture-forge-ai-skill.zip';files={...authoringRuntime,'SKILL.md':AUTHORING_SKILL,'references/authoring-guide.md':AUTHORING_GUIDE,'references/example.graphic.json':JSON.stringify(AUTHORING_EXAMPLE,null,2)};}
 else if(kind==='effects'){folder='texture-forge-effects';filename='texture-forge-effects-skill.zip';files=(await import('./effects-kit-runtime.js')).default;}
 else throw Error('未知Skill类型');
 return {folder,filename,files};
}
export async function skillPackage(kind){const {folder,filename,files}=await skillFiles(kind);return {filename,bytes:encodeZIP(Object.entries(files).map(([name,text])=>({name:folder+'/'+name,data:new TextEncoder().encode(text)})))};}
export async function downloadSkill(kind){const {filename,bytes}=await skillPackage(kind);download(bytes,filename,'application/zip');}
