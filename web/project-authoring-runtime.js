import {applyProjectRecipe,authoringCatalog,authoringSchema,projectNormalizations,DOCUMENT_SCHEMA,safeData} from './project-authoring.js';
import {readResourcePack,encodeResourcePack,imageAsset} from './resource-pack.js';
import {assetFor,contentHash,prepareAsset,registerAsset,unregisterAsset} from './resource-assets.js';
import {parseCreationAuthoring,assetFromCreationAuthoring} from './creation-authoring.js';
import {projectDependencyIds,serializeLocalProject} from './project-dependencies.js';
import {project as newProject,node,sanitizeTree,walk,TREE_SCHEMA,PRESET_SCHEMA} from './tree-model.js';
import {TreeRenderer} from './tree-renderer.js';
import {BY_ID} from './catalog.js';

const decode64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const encode64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
export async function runProjectAuthoring({action,input,recipe,resources=[],options}){
 const cleanup=[],graphics=new Map(),components=new Map(),imported=[];let renderer;
 const loadPack=async bytes=>{const pack=await readResourcePack(bytes);cleanup.push(()=>pack.rollback());pack.register();return pack;};
 const load=async source=>{
  if(source.zip)return (await loadPack(decode64(source.zip))).payload;
  if(source.document){const d=source.document;safeData(d);if(d.schema!==DOCUMENT_SCHEMA||!Array.isArray(d.assets)||d.assets.length>2048||d.assets.some(a=>!Array.isArray(a)||a.length!==2||typeof a[0]!=='string')||new Set(d.assets.map(a=>a[0])).size!==d.assets.length)throw Error('Expected a self-contained '+DOCUMENT_SCHEMA+' document');return (await loadPack(await encodeResourcePack(d.project,{assets:d.assets}))).payload;}
  safeData(source.project);return source.project;
 };
 try{
  if(action==='schema')return {ok:true,json:authoringSchema()};
  let raw=input?await load(input):null;
  for(const resource of resources){
   const {id,select,name,mime,data}=resource;if(graphics.has(id)||components.has(id))throw Error('Duplicate resource alias: '+id);
   const bytes=decode64(data),zip=bytes[0]===80&&bytes[1]===75;
   if(zip){
    const pack=await loadPack(bytes),payload=pack.payload;
    const roots=payload.schema==='momo.texture-library/v1'?payload.presets:payload.schema===TREE_SCHEMA||payload.schema===PRESET_SCHEMA?[{id:'@root',name:payload.name,root:payload.root}]:[];
    const available=roots.length?roots.map(e=>({id:e.id,name:e.name,kind:'component'})):[...pack.mapping].map(([original,actual])=>({id:original,graphic:actual,kind:'graphic'}));
    imported.push({alias:id,entries:available});
    if(roots.length){const entry=select?roots.find(e=>e.id===select):roots.length===1?roots[0]:null;if(!entry)throw Error('Resource '+id+' requires select: '+JSON.stringify(available));components.set(id,sanitizeTree({...newProject(),root:entry.root,projectResources:[]},{component:true}).root);}
    else{const original=select??(pack.mapping.size===1?[...pack.mapping.keys()][0]:null),actual=pack.mapping.get(original);if(!actual)throw Error('Resource '+id+' requires a graphic select: '+JSON.stringify(available));graphics.set(id,actual);}
   }else{
    const asset=mime?await imageAsset(new File([bytes],name,{type:mime})):assetFromCreationAuthoring(parseCreationAuthoring(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
    const actual='asset_'+await contentHash(asset);
    if(!BY_ID.has(actual)){const bitmap=await prepareAsset(asset);registerAsset(actual,asset,bitmap);cleanup.push(()=>unregisterAsset(actual));}
    graphics.set(id,actual);imported.push({alias:id,graphic:actual,kind:asset.definition.generator?'generator':asset.kind});
   }
  }
  if(action==='catalog'){
   const catalog=authoringCatalog({query:options.query,graphic:options.id});
   catalog.components=raw?.schema==='momo.texture-library/v1'?(raw.presets??[]).map(e=>({id:e.id,name:e.name,aliases:e.aliases??{},root:e.root})):raw?.root?[{id:'@root',name:raw.name,root:raw.root},...(raw.projectResources??[])]:[];
   return {ok:true,json:catalog};
  }
  let result={project:raw?sanitizeTree(raw):null,normalizations:[],created:{}};
  if(raw)result.normalizations=projectNormalizations(raw,result.project).map(d=>({operation:'input',...d}));
  if(action==='create'||action==='edit'){const applied=applyProjectRecipe(result.project,recipe,{graphics,components});result={...applied,normalizations:[...result.normalizations,...applied.normalizations]};}
  if(!result.project)throw Error('A native tree project is required');
  const p=result.project;
  if(action==='unpack')return {ok:true,json:{schema:DOCUMENT_SCHEMA,project:JSON.parse(serializeLocalProject(p)),assets:[...projectDependencyIds(p)].map(id=>[id,assetFor(id)])}};
  // Compile every dependency, including hidden graphics/masks and alternate density maps.
  // Draw the real composition at its start and midpoint using the editor renderer as well.
  renderer=new TreeRenderer(document.createElement('canvas'));
  for(const id of projectDependencyIds(p)){
   const probe=newProject();probe.root.children=[node('shape',id)];renderer.draw(probe,32,32,{time:.25,formulaSeconds:.25,read:true});probe.root.children[0].boundary='repeat';renderer.draw(probe,32,32,{time:.25,formulaSeconds:.25,read:true});
  }
  const width=p.canvas.ratio>=1?128:Math.max(1,Math.round(128*p.canvas.ratio)),height=p.canvas.ratio>=1?Math.max(1,Math.round(128/p.canvas.ratio)):128;
  for(const time of [0,.5])renderer.draw(p,width,height,{time,formulaSeconds:time*p.output.seconds,read:true});
  const bytes=await encodeResourcePack(p),nodes=[];walk(p.root,n=>nodes.push({id:n.id,name:n.name,kind:n.kind,type:n.kind==='shape'?n.type:undefined}));
  return {ok:true,zip:encode64(bytes),normalizations:result.normalizations,created:result.created,imported,nodes,validation:{structure:'passed',editorRendering:'passed',sampledProgress:[0,.5],engineCompilation:'not-run',visualReview:'not-reviewed'}};
 }catch(error){return {ok:false,error:error.message};}finally{renderer?.destroy();for(const dispose of cleanup.reverse())dispose();}
}
