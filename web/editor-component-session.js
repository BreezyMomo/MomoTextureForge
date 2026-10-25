import {captureEditorProject} from './editor-ai-connection.js';

export function createComponentSession({getSession,operate,revision}){
 return async(operation,args,isActive)=>{
  if(!getSession)throw Error('Component sessions are unavailable');
  const before=getSession(),serialized=JSON.stringify(before),currentRevision=await revision(serialized);
  const read=async()=>{const {guard,...state}=getSession();return {...state,revision:await revision(JSON.stringify(getSession()))};};
  if(operation==='component-state')return read();
  if(!isActive()||JSON.stringify(getSession())!==serialized)throw Error('Component session changed; read it again');
  if(operation==='component-capture'){
   if(!before.active)throw Error('Open a component trial session first');
   const snapshot=await captureEditorProject(()=>before.project);
   // Component snapshots are render/export references, never main-canvas edit tokens.
   return {...snapshot,editRevision:'component:'+currentRevision};
  }
  if(operation!=='component-edit'||!operate)throw Error('Unsupported component session operation');
  if(args.expectedSessionRevision!==currentRevision)throw Error('Component session changed; read it again');
  const result=operate(args);return {...await read(),result};
 };
}
