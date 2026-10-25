import {treeSamples} from './tree-samples.js';
import {project,cloneNode} from './tree-model.js';
import {projectDependencyIds} from './project-dependencies.js';

export function exampleCatalog(){return treeSamples().map(({nameKey,name,description,category,tags,previewTime})=>({id:nameKey,name,descriptionKey:description,category,tags,previewTime:previewTime??.3}));}
export function exampleProject(id){
 const sample=treeSamples().find(s=>s.nameKey===id);if(!sample)throw Error('Unknown example ID');
 const p=project();p.name=sample.name;p.root.children=[cloneNode(sample.root)];Object.assign(p.output,sample.output);
 return p;
}
export function projectShareLink(p,pageURL){
 const url=new URL(pageURL),dependencies=[...projectDependencyIds(p)].filter(id=>id.startsWith('asset_'));
 if(!['http:','https:'].includes(url.protocol))return {available:false,reason:'file-page',alternative:'forge_project_save'};
 if(dependencies.length)return {available:false,reason:'custom-dependencies',dependencies,alternative:'forge_project_save'};
 const bytes=new TextEncoder().encode(JSON.stringify(p));
 if(bytes.length>100000)return {available:false,reason:'size-limit',bytes:bytes.length,limit:100000,alternative:'forge_project_save'};
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return {available:true,url:url.origin+url.pathname+'#tree='+btoa(binary),bytes:bytes.length,scope:'Configuration link; no upload or clipboard write. Recipients may use their own editor URL with this fragment.'};
}
