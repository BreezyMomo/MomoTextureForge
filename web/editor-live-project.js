import {readResourcePack} from './resource-pack.js';
import {PACK_LIMIT} from './resource-zip.js';
import {TREE_SCHEMA,sanitizeTree} from './tree-model.js';
import {projectNormalizations} from './project-authoring.js';
import {messageError} from './message-catalog.js';
import {uiError} from './ui-language.js';
import {exampleCatalog,exampleProject,projectShareLink} from './project-examples.js';

export const LIVE_PROJECT_OPERATIONS=['examples','example-open','project-share','editor-state','editor-control','history','project-open'];
export function createLiveProjectControls({getProject,commitProject,getEditorState,controlEditor,getPageURL=()=>location.href,changeHistory,validatePack=()=>{},readPack=readResourcePack,revision}){
 return async(operation,args,isActive)=>{
  if(operation==='examples')return {examples:exampleCatalog()};
  if(operation==='editor-state'){
   if(!getEditorState)throw messageError('editorBridge.unsupportedOperation');
   return structuredClone(getEditorState());
  }
  const before=JSON.stringify(getProject());
  if(await revision(before)!==args.expectedRevision)throw messageError('editorBridge.conflict');
  const check=()=>{if(!isActive())throw messageError('editorBridge.expired');if(JSON.stringify(getProject())!==before)throw messageError('editorBridge.conflict');};
  if(operation==='project-share'){check();return projectShareLink(JSON.parse(before),getPageURL());}
  if(operation==='example-open'){
   if(!commitProject)throw messageError('editorBridge.unsupportedOperation');
   const incoming=sanitizeTree(exampleProject(args.id));check();commitProject(incoming,{});
   return {applied:true,id:args.id,name:incoming.name,editRevision:await revision(JSON.stringify(getProject()))};
  }
  if(operation==='editor-control'){if(!controlEditor)throw messageError('editorBridge.unsupportedOperation');check();controlEditor(args.changes);return {applied:true,editRevision:await revision(JSON.stringify(getProject())),state:structuredClone(getEditorState())};}
  if(operation==='history'){
   if(!changeHistory||!['undo','redo'].includes(args.action))throw messageError('editorBridge.invalidRequest');
   check();
   if(getEditorState().history.revision!==args.expectedHistoryRevision)throw messageError('editorBridge.conflict');
   const applied=changeHistory(args.action),after=JSON.stringify(getProject()),state=structuredClone(getEditorState());
   return {applied,editRevision:await revision(after),state};
  }
  if(operation!=='project-open'||!commitProject)throw messageError('editorBridge.unsupportedOperation');
  let pack,applied=false;
  try{
   if(typeof args.json==='string'&&args.zip===undefined){
    if(new TextEncoder().encode(args.json).length>4000000)throw messageError('editor.jsonExceedsMB');
    pack={payload:JSON.parse(args.json),prepared:[],register(){},persist(){},rollback(){}};
   }else{
    if(args.json!==undefined||typeof args.zip!=='string'||args.zip.length>Math.ceil(PACK_LIMIT/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(args.zip))throw messageError('editorBridge.invalidRequest');
    const bytes=Uint8Array.from(atob(args.zip),c=>c.charCodeAt(0));if(bytes.length>PACK_LIMIT)throw messageError('editor.fileExceedsMB');
    pack=await readPack(bytes);
   }
   if(pack.payload?.schema!==TREE_SCHEMA)throw messageError('editorBridge.invalidRequest');
   check();pack.register();
   const incoming=sanitizeTree(pack.payload),normalizations=projectNormalizations(pack.payload,incoming);
   await validatePack(pack,incoming);check();
   commitProject(incoming,{});applied=true;
   const committed=JSON.stringify(getProject()),editRevision=await revision(committed);
   // A persistence failure after commit must not unregister live dependencies.
   let persisted=true,persistenceError=null;try{await pack.persist();}catch(error){persisted=false;persistenceError=uiError(error);}
   return {applied:true,editRevision,name:incoming.name,normalizations,persisted,persistenceError};
  }finally{if(pack&&!applied)pack.rollback();}
 };
}
