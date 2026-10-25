import {parseCreationAuthoring,assetFromCreationAuthoring} from './creation-authoring.js';
import {editResourceAliases} from './resource-alias-edit.js';
import {validateImageProcessing,validateImageTransform,validateImageColor,defaultImageProcessing} from './image-processing.js';
import {imageAsset} from './resource-pack.js';
import {contentHash,prepareAsset,registerAsset,unregisterAsset} from './resource-assets.js';
import {BY_ID,CATALOG} from './catalog.js';
import {node,project,cloneNode,find} from './tree-model.js';
import {exportContourSVG} from './contour-svg.js';
import {TreeRenderer} from './tree-renderer.js';
import {packageGraphic} from './graphics-package.js';
import {saveLibraryEntry} from './graphics-library.js';
import {graphicVariantKey} from './graphics-identity.js';

export function renderPreview(root,{previewTime=0}={}){
 const renderer=new TreeRenderer(document.createElement('canvas'));
 try{const p=project();p.root.children=[root];renderer.draw(p,160,160,{time:0,formulaSeconds:previewTime});return renderer.canvas.toDataURL();}finally{renderer.destroy();}
}
export function createLiveResource({library,render=renderPreview,save=saveLibraryEntry,getProject,revision}={}){
 return async(args,isActive=()=>true)=>{
  const previewTime=args.previewTime??0;if(!Number.isFinite(previewTime)||previewTime<0||previewTime>3600)throw Error('previewTime must be 0..3600 seconds');
  const before=args.fromNode?JSON.stringify(getProject()):null;
  if(args.fromNode&&await revision(before)!==args.expectedRevision)throw Error('Canvas changed; capture again');
  const check=async()=>{if(before!==null&&JSON.stringify(getProject())!==before)throw Error('Canvas changed; capture again');if(!isActive())throw Error('Resource request expired');if((await library('library-list',{limit:1},isActive)).revision!==args.expectedLibraryRevision)throw Error('Library changed; query forge_library again');};
  await check();
  let previous;
  if(args.updateKey){const detail=await library('library-detail',{key:args.updateKey},isActive);previous=detail.item;if(detail.revision!==args.expectedLibraryRevision)throw Error('Library changed; query again');if(previous.source!=='local')throw Error('Only local originals can be updated');}
  let asset,meta,root;
  if(args.editKey){
   const detail=await library('library-detail',{key:args.editKey,includeSource:true},isActive);if(detail.revision!==args.expectedLibraryRevision)throw Error('Library changed; query again');
   const source=detail.source,sourceRoot=source?.payload?.root??source?.root;
   asset=structuredClone(source?.assets?.find(item=>item.id===sourceRoot?.type)?.asset);
   if(sourceRoot?.kind!=='shape'||!asset)throw Error('Choose a cached single graphic resource');
   meta={name:detail.item.name,aliases:detail.item.aliases,category:detail.item.category,description:detail.item.description,kind:asset.kind==='image'?'image':'formula',generator:!!asset.definition.generator};
   if(args.defaults!==undefined){
    if(!args.defaults||typeof args.defaults!=='object'||Array.isArray(args.defaults))throw Error('Defaults must be keyed by stable parameter variable');
    for(const [variable,value]of Object.entries(args.defaults)){const spec=asset.definition.parameters.find(p=>p.variable===variable);if(!spec||!Number.isFinite(value)||value<spec.min||value>spec.max||spec.step===1&&!Number.isInteger(value))throw Error('Invalid default parameter: '+variable);spec.default=value;asset.definition.defaults[spec.slot]=value;}
   }
  }else if(args.aliasKey){
   const detail=await library('library-detail',{key:args.aliasKey,includeSource:true},isActive);if(detail.revision!==args.expectedLibraryRevision)throw Error('Library changed; query again');
   const source=detail.source,sourceRoot=source?.payload?.root??source?.root,original=source?.assets?.find(item=>item.id===sourceRoot?.type)?.asset;
   if(sourceRoot?.kind!=='shape'||!original)throw Error('Parameter aliases require a cached single graphic resource');
   ({asset,meta}=editResourceAliases(original,{name:detail.item.name,aliases:detail.item.aliases,category:detail.item.category,description:detail.item.description,kind:original.kind==='image'?'image':'formula',generator:!!original.definition.generator},args));root=cloneNode(sourceRoot);
  }else if(args.imageKey){
   const detail=await library('library-detail',{key:args.imageKey,includeSource:true},isActive);if(detail.revision!==args.expectedLibraryRevision)throw Error('Library changed; query again');
   const source=detail.source,rootId=source?.payload?.root?.type??source?.root?.type;asset=structuredClone(source?.assets?.find(item=>item.id===rootId)?.asset);
   if(asset?.kind!=='image')throw Error('Choose a cached image resource');
   if(asset.mime==='image/svg+xml'){if(args.processing&&Object.keys(args.processing).length||args.trace)throw Error('SVG supports color and transform, not bitmap processing or tracing');delete asset.imageProcessing;}
   else asset.imageProcessing={...defaultImageProcessing(),...asset.imageProcessing,...args.processing};
   if(args.transform)asset.imageTransform={scale:1,rotation:0,...asset.imageTransform,...args.transform};
   if(args.color)asset.imageColor={mode:'none',source:'#ffffff',target:'#ffffff',preserveAlpha:true,tolerance:.08,softness:.12,...asset.imageColor,...args.color};
   validateImageProcessing(asset.imageProcessing);validateImageTransform(asset.imageTransform);validateImageColor(asset.imageColor);
   meta={name:args.resourceName??detail.item.name,aliases:detail.item.aliases,category:detail.item.category,description:detail.item.description,kind:'image'};
  }else if(args.fromNode){
   const source=JSON.parse(before),selected=find(source.root,args.nodeId==='@root'?source.root.id:args.nodeId)?.node;if(!selected)throw Error('Unknown source node');
   root=cloneNode(selected);meta={name:args.resourceName??(selected.id===source.root.id?source.name:selected.name),aliases:args.aliases,category:args.category,description:args.description,kind:'composition'};
  }else{
  if(typeof args.data!=='string'||args.data.length>Math.ceil(16*1024*1024/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(args.data))throw Error('Invalid resource file');
  const bytes=Uint8Array.from(atob(args.data),c=>c.charCodeAt(0));
  if(args.mime==='application/json'){
   if(bytes.length>2*1024*1024)throw Error('Authoring JSON exceeds 2 MiB');
   const draft=parseCreationAuthoring(new TextDecoder('utf-8',{fatal:true}).decode(bytes));asset=assetFromCreationAuthoring(draft);
   meta={name:draft.name,aliases:draft.aliases,category:draft.category,description:draft.description,kind:'formula',generator:!!asset.definition.generator};
  }else{
   if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(args.mime))throw Error('Unsupported resource type');
   asset=await imageAsset(new File([bytes],args.name,{type:args.mime}));meta={name:asset.definition.name,aliases:asset.definition.aliases,kind:'image'};
  }
  }
  if(args.metadata){
   if(typeof args.metadata!=='object'||Array.isArray(args.metadata)||Object.keys(args.metadata).some(k=>!['name','category','description'].includes(k)))throw Error('Invalid resource metadata');
   for(const [key,value]of Object.entries(args.metadata)){if(typeof value!=='string'||value.length>(key==='description'?2000:80)||key==='name'&&!value.trim())throw Error('Invalid resource '+key);meta[key]=key==='description'?value:value.trim();}
   if(asset){asset.definition.name=meta.name;if(args.metadata.category!==undefined)asset.definition.category=meta.category;}
  }
  if(previous)meta={...meta,resourceId:previous.resourceId,versionId:previous.versionId+1,aliases:meta.aliases??previous.aliases,source:{resourceId:previous.resourceId,versionId:previous.versionId}};
  const id=asset?'asset_'+await contentHash(asset):null,registered=[];
  try{
   if(asset&&!BY_ID.has(id)){registerAsset(id,asset,await prepareAsset(asset));registered.push(id);}
   root??=node('shape',id);if(args.aliasKey)root.type=id;let trace;
   if(args.trace){
    const renderer=new TreeRenderer(document.createElement('canvas'));
    try{const p=project();p.root.children=[root];trace=await exportContourSVG(p,{width:args.trace.size??512,height:args.trace.size??512,threshold:args.trace.threshold??.5,smooth:args.trace.smooth??true,denoise:args.trace.denoise??1,detail:args.trace.detail??.75,check:()=>{if(!isActive())throw Error('Resource request expired');},render:(p,w,h)=>renderer.draw(p,w,h,{read:true})});}finally{renderer.destroy();}
    const converted=await imageAsset(new File([trace.svg],meta.name+'.svg',{type:'image/svg+xml'}));converted.definition.aliases=meta.aliases??{};
    const convertedId='asset_'+await contentHash(converted);if(!BY_ID.has(convertedId)){registerAsset(convertedId,converted,await prepareAsset(converted));registered.push(convertedId);}root=node('shape',convertedId);
   }
   const thumbnail=await render(root,{previewTime}),packed=await packageGraphic(root,meta,thumbnail);
   await check();if(!isActive())throw Error('Resource request expired');
   if(args.previewOnly)return {applied:false,previewOnly:true,previewTime,preview:thumbnail,metadata:meta,...(trace?{trace:{stats:trace.stats,warnings:trace.warnings}}:{}),scope:'Validated and rendered draft only; no library, list, canvas or persistent resource writes.'};
   const entry=await save(packed.entry,packed.bytes,previous?{update:true,expectedLocal:{versionId:previous.versionId,hash:previous.hash}}:{});
   return {applied:true,key:graphicVariantKey(entry),entry,preview:thumbnail,...(trace?{trace:{stats:trace.stats,warnings:trace.warnings}}:{}),scope:'Local library original only; canvas and personal graphics list are unchanged.'};
  }finally{
   // Registry indices are referenced by density fields. A concurrent native
   // import may append assets; keep this entry rather than shifting indices.
   for(const id of registered.reverse())if(BY_ID.get(id)?.index===CATALOG.length-1)unregisterAsset(id);
  }
 };
}
