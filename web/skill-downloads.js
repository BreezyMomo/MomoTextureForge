import authoringRuntime from './authoring-kit-runtime.js';
import effectsFiles from './effects-kit-runtime.js';
import {AUTHORING_SKILL,AUTHORING_GUIDE,AUTHORING_EXAMPLE} from './ai-authoring.js';
import {encodeZIP,download} from './encoders.js';
export function skillPackage(kind){
 let folder,filename,files;
 if(kind==='author'){folder='texture-forge-author';filename='texture-forge-ai-skill.zip';files={...authoringRuntime,'SKILL.md':AUTHORING_SKILL,'references/authoring-guide.md':AUTHORING_GUIDE,'references/example.graphic.json':JSON.stringify(AUTHORING_EXAMPLE,null,2)};}
 else if(kind==='effects'){folder='texture-forge-effects';filename='texture-forge-effects-skill.zip';files=effectsFiles;}
 else throw Error('未知Skill类型');
 return {filename,bytes:encodeZIP(Object.entries(files).map(([name,text])=>({name:folder+'/'+name,data:new TextEncoder().encode(text)})))};
}
export function downloadSkill(kind){const {filename,bytes}=skillPackage(kind);download(bytes,filename,'application/zip');}
