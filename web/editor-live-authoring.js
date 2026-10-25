import {createLiveRemote} from './editor-live-remote.js';
import {createComponentSession} from './editor-component-session.js';
import {applyProjectRecipe,authoringCatalog,authoringSchema,densityInfo} from './project-authoring.js';
import {find} from './tree-model.js';
import {createLiveLibrary} from './editor-live-library.js';
import {createLiveResource} from './editor-live-resource.js';
import {createLiveLibraryImport} from './editor-live-library-io.js';
import {createLiveListBatch} from './editor-live-list-batch.js';
import {createLiveGraphicsList} from './editor-live-list.js';
import {createLiveProjectControls,LIVE_PROJECT_OPERATIONS} from './editor-live-project.js';
import {messageError} from './message-catalog.js';

const semanticJSON=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);

// Compare native canvas state, independently of ZIP timestamps and view settings.
export async function editorRevision(serialized){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(serialized));
 return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export function createLiveAuthoring({getProject,commitProject,commitGraphicsList,arrangementRecords,getComponents=()=>[],getEditorState,controlEditor,getPageURL,getTimeline,controlTimeline,getListView,controlListView,getInspector,controlInspector,getComponentSession,controlComponentSession,capturePreview,getWorkspace,controlWorkspace,changeHistory,validatePack,readPack,library=createLiveLibrary(),resource=createLiveResource({library,getProject,revision:editorRevision}),importLibrary=createLiveLibraryImport({library})}){
 const remote=createLiveRemote({revision:editorRevision});
 const componentSession=createComponentSession({getSession:getComponentSession,operate:controlComponentSession,revision:editorRevision});
 const controls=createLiveProjectControls({getProject,commitProject,getEditorState,controlEditor,getPageURL,changeHistory,validatePack,readPack,revision:editorRevision});
 const listBatch=createLiveListBatch({getProject,getEntries:getComponents,commit:commitGraphicsList,revision:editorRevision,library,validatePack,readPack});
 const graphicsList=createLiveGraphicsList({getProject,getEntries:getComponents,commit:commitGraphicsList,revision:editorRevision,library,validatePack});
 return async(operation,args={},isActive=()=>true)=>{
  if(operation==='help-read'){
   const {helpSections}=await import('./user-help.js'),sections=helpSections(args.language??'en');if(args.id&&!sections.some(s=>s.id===args.id))throw Error('Unknown help section');
   return {sections:args.id?sections.filter(s=>s.id===args.id):sections,detailedGuide:'https://github.com/BreezyMomo/MomoTextureForge/blob/main/README'+(args.language==='zh-CN'?'':'.en')+'.md'};
  }
  if(operation==='skill-export'){
   const {skillPackage}=await import('./skill-downloads.js'),{filename,bytes}=skillPackage(args.kind);if(!isActive())throw messageError('editorBridge.expired');let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {filename,zip:btoa(binary)};
  }
  if(['remote-state','remote-edit','remote-job'].includes(operation))return remote(operation,args,isActive);
  if(['component-state','component-edit','component-capture'].includes(operation))return componentSession(operation,args,isActive);
  if(operation==='preview-capture'){
   if(!capturePreview)throw messageError('editorBridge.unsupportedOperation');if(!isActive())throw messageError('editorBridge.expired');
   const {project,...result}=capturePreview(args);return {...result,sourceRevision:await editorRevision(project)};
  }
  if(operation==='timeline-state'||operation==='timeline-edit'){
   if(!getTimeline)throw messageError('editorBridge.unsupportedOperation');const state=getTimeline(),before=JSON.stringify(state),revision=await editorRevision(before);const {guard,...publicState}=state;
   if(operation==='timeline-state')return {...publicState,revision};
   if(!controlTimeline||revision!==args.expectedTimelineRevision||JSON.stringify(getTimeline())!==before)throw messageError('editorBridge.conflict');if(!isActive())throw messageError('editorBridge.expired');
   controlTimeline(args.changes);const next=getTimeline(),{guard:nextGuard,...publicNext}=next;return {...publicNext,revision:await editorRevision(JSON.stringify(next))};
  }
  if(operation==='list-view'||operation==='list-view-edit'){
   if(!getListView)throw messageError('editorBridge.unsupportedOperation');const state=getListView(),before=JSON.stringify(state),revision=await editorRevision(before);
   if(operation==='list-view')return {...state,revision};
   if(!controlListView||revision!==args.expectedViewRevision||JSON.stringify(getListView())!==before)throw messageError('editorBridge.conflict');if(!isActive())throw messageError('editorBridge.expired');
   controlListView(args.changes);const next=getListView();return {...next,revision:await editorRevision(JSON.stringify(next))};
  }
  if(operation==='inspector-state'||operation==='inspector-edit'){
   if(!getInspector)throw messageError('editorBridge.unsupportedOperation');const state=getInspector(),before=JSON.stringify(state),revision=await editorRevision(before);
   if(operation==='inspector-state')return {...state,revision};
   if(!controlInspector||revision!==args.expectedInspectorRevision||JSON.stringify(getInspector())!==before)throw messageError('editorBridge.conflict');if(!isActive())throw messageError('editorBridge.expired');
   controlInspector(args.changes);const next=getInspector();return {...next,revision:await editorRevision(JSON.stringify(next))};
  }
  if(operation==='workspace-state'||operation==='workspace-edit'){
   if(!getWorkspace)throw messageError('editorBridge.unsupportedOperation');const settings=getWorkspace(),before=JSON.stringify(settings),revision=await editorRevision(before);
   if(operation==='workspace-state')return {settings,revision,panels:['nodes','library','canvas','inspector','timeline'],presets:['default','browse','animation','focus']};
   if(!controlWorkspace||revision!==args.expectedWorkspaceRevision||JSON.stringify(getWorkspace())!==before)throw messageError('editorBridge.conflict');if(!isActive())throw messageError('editorBridge.expired');
   controlWorkspace(args.operations);const next=getWorkspace();return {settings:next,revision:await editorRevision(JSON.stringify(next))};
  }
  if(['library-catalog-export','library-authoring-export','library-list','library-detail','library-export','library-export-batch','library-delete'].includes(operation))return library(operation,args,isActive);
  if(operation==='library-import')return importLibrary(args,isActive);
  if(['library-edit-resource','library-aliases','library-create','library-update','library-save-node','library-process-image'].includes(operation))return resource({...args,fromNode:operation==='library-save-node'},isActive);
  if(['graphics-list-batch','graphics-list-job'].includes(operation))return listBatch(operation,args,isActive);
  if(['graphics-list','graphics-list-edit'].includes(operation))return graphicsList(operation,args,isActive);
  if(LIVE_PROJECT_OPERATIONS.includes(operation))return controls(operation,args,isActive);
  if(operation==='schema'){
   let currentNode;
   if(args.nodeId!==undefined){const project=getProject(),n=find(project.root,args.nodeId==='@root'?project.root.id:args.nodeId)?.node;if(!n)throw messageError('editorBridge.invalidRequest');currentNode={id:n.id,kind:n.kind,graphic:n.kind==='shape'?n.type:null,density:densityInfo(n)};}
   return {...authoringSchema(),...(currentNode?{currentNode}:{}),editorControls:{state:!!getEditorState,control:!!controlEditor,history:!!changeHistory,projectOpen:!!commitProject}};
  }
  if(operation==='catalog'){
   const {query='',graphic,offset=0,limit=30}=args;
   if(typeof query!=='string'||!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>100)throw messageError('editorBridge.invalidRequest');
   const catalog=authoringCatalog({query,graphic});
   return {...catalog,scope:'Graphics currently registered in this page; components from its graphics list. No external downloads.',total:catalog.graphics.length,offset,
    graphics:catalog.graphics.slice(offset,offset+limit).map(({definition,asset,...summary})=>graphic?{...summary,definition,asset}:summary),
    components:getComponents().filter(r=>JSON.stringify([r.id,r.name,r.aliases]).toLowerCase().includes(query.toLowerCase())).slice(offset,offset+limit).map(r=>({id:r.id,name:r.name,aliases:r.aliases??{}}))};
  }
  if(operation!=='edit'||!commitProject)throw messageError('editorBridge.unsupportedOperation');
  const {expectedRevision,recipe,mode='edit'}=args;
  if(!['edit','create'].includes(mode)||!recipe||recipe.resources?.length)throw messageError('editorBridge.invalidRequest');
  const before=JSON.stringify(getProject());
  if(await editorRevision(before)!==expectedRevision)throw messageError('editorBridge.conflict');
  const result=applyProjectRecipe(mode==='create'?null:JSON.parse(before),recipe,{components:new Map(getComponents().map(r=>[r.id,r.root])),records:arrangementRecords});
  const unchanged=semanticJSON(result.project)===semanticJSON(JSON.parse(before));
  // The user may edit or disconnect during hashing. Commit synchronously after
  // the final check, as one normal editor undo step, never a partial recipe.
  if(!isActive())throw messageError('editorBridge.expired');
  if(JSON.stringify(getProject())!==before)throw messageError('editorBridge.conflict');
  if(unchanged)return {applied:false,editRevision:expectedRevision,created:result.created,normalizations:result.normalizations,graphicChanges:result.graphicChanges};
  commitProject(result.project,result.created,{shortcutCopies:result.shortcutCopies,usedComponents:result.usedComponents});
  const committed=JSON.stringify(getProject());
  return {applied:true,editRevision:await editorRevision(committed),created:result.created,normalizations:result.normalizations,graphicChanges:result.graphicChanges};
 };
}
