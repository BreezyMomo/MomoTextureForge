import {folderLibrary} from './folder-library.js';
import {uiText,uiFormat,uiError} from './ui-language.js';
import {manageFolderCleanup} from './folder-library-cleanup.js';
import {onLibraryChange} from './library-events.js';
import {messageError} from './message-catalog.js';

export async function manageFolderLibrary({modal,el,button,labelled,onChange,legacyUpgrade,selectOnly=false,upgradeOnOpen=false}){
 const {d,body}=modal(uiText(upgradeOnOpen?'folder.upgradeTitle':'folder.title'));d.classList.add('folder-library-dialog');
 const current=el('section',{className:'folder-library-current'}),actions=el('div',{className:'graphics-actions'}),candidate=el('section',{className:'folder-library-candidate',hidden:true}),legacy=el('section',{className:'folder-library-legacy',hidden:true}),status=el('p',{role:'status','aria-live':'polite'}),progress=el('progress',{hidden:true,max:1,value:0,'aria-label':uiText('folder.progressLabel')}),cancel=button(uiText('common.cancel'),()=>controller?.abort());cancel.hidden=true;
 const close=d.querySelector('.graphics-close'),intro=el('p',{text:uiText(upgradeOnOpen?'folder.upgradeIntro':'folder.intro')});let controller=null,busy=false,migrating=false,phase='saving',chosen=null,hasLegacy=false;
 const choose=button(uiText('folder.choose'),async()=>{
  if(busy)return;
  // Keep the native picker inside the user's click gesture.
  let handle;try{handle=await window.showDirectoryPicker({mode:'readwrite',id:'momo-texture-forge-library'});}catch(error){if(error.name!=='AbortError')status.textContent=uiError(error);return;}
  await action(async()=>{const state=await folderLibrary.inspect(handle);chosen={handle,state};showCandidate();});
 });choose.dataset.folderChoose='';
 body.append(intro,current,actions,candidate,legacy,progress,status,cancel,el('p',{className:'tree-note',text:uiText('folder.scope')}));
 async function action(run){if(busy)return;busy=true;actions.inert=candidate.inert=legacy.inert=true;close.disabled=true;try{await run();}catch(error){status.textContent=uiError(error);}finally{busy=false;actions.inert=candidate.inert=legacy.inert=false;close.disabled=false;progress.hidden=cancel.hidden=true;controller=null;try{await render();}catch(error){status.textContent=uiError(error);}}}
 function onProgress({done,total,name}){progress.hidden=false;progress.max=Math.max(1,total);progress.value=done;status.textContent=uiFormat(phase==='list'?'folder.listProgress':'folder.progress',done,total,name);}
 function onPhase(next){phase=next;progress.hidden=false;progress.removeAttribute('value');status.textContent=uiText({publishing:'folder.publishingLegacy',verifying:'folder.verifyingLegacy',cleaning:'folder.cleaningLegacy',list:'folder.importingLegacyList',finishing:'folder.finishingLegacy'}[next]);}
 function showCandidate(){
  candidate.hidden=false;candidate.replaceChildren();const {handle,state}=chosen,isNew=state.revision==='missing',name=el('input',{value:state.index.name,maxLength:80});
  candidate.append(el('strong',{text:uiFormat(isNew?'folder.newDirectory':'folder.existingDirectory',handle.name,state.index.entries.length)}));
  if(isNew)candidate.append(labelled(uiText('folder.libraryName'),name));
  candidate.append(el('p',{className:'tree-note',text:uiText(hasLegacy?'folder.migrationOpenHint':'folder.openHint')}));legacy.hidden=true;
  const apply=button(uiText(hasLegacy?(isNew?'folder.createAndMigrate':'folder.openAndMigrate'):(isNew?'folder.createAndUse':'folder.useDirectory')),()=>action(async()=>{await folderLibrary.connect(handle,{name:name.value});chosen=null;candidate.hidden=true;await render();await onChange();if(hasLegacy)await importLegacy();else status.textContent=uiText('folder.opened');if(selectOnly)d.close();}));apply.dataset.folderConnect='';
  candidate.append(el('div',{className:'graphics-actions'},[apply,button(uiText('common.cancel'),async()=>{chosen=null;candidate.hidden=true;await render();})]));
 }
 async function render(){
  const [state,browser,listCount]=await Promise.all([folderLibrary.status(),folderLibrary.legacyBrowserStatus(),legacyUpgrade?.count()??0]);if(!d.open)return;
  current.replaceChildren();current.classList.remove('folder-needs-attention');actions.replaceChildren(choose);actions.hidden=migrating;choose.disabled=false;
  if(state.mode==='none')current.append(el('strong',{text:uiText('folder.noFolder')}),el('p',{text:uiText('folder.noFolderHint')}));
  else{
   current.append(el('strong',{text:uiFormat('folder.currentFolder',state.index?.name??state.binding.name)}),el('p',{text:uiFormat('folder.directoryName',state.binding.folderName)}),el('p',{text:migrating?uiText('folder.migratingLibrary'):state.state==='ready'?uiFormat('folder.ready',state.entries.length):uiError(state.error)}));
   if(state.state!=='ready')current.classList.add('folder-needs-attention');
   const resume=button(uiText(state.state==='permission'?'folder.authorize':'folder.refresh'),()=>action(async()=>{await folderLibrary.resume();await render();await onChange();if(hasLegacy)await importLegacy();else status.textContent=uiText('folder.reconnected');if(selectOnly)d.close();}));resume.dataset.folderResume='';actions.append(resume);
   const disconnect=button(uiText('folder.closeLibrary'),()=>action(async()=>{await folderLibrary.disconnect();chosen=null;candidate.hidden=true;await render();await onChange();status.textContent=uiText('folder.closed');}));disconnect.dataset.folderDisconnect='';actions.append(disconnect);
   if(!selectOnly){const cleanup=button(uiText('folder.cleanupTitle'),()=>manageFolderCleanup({modal,el,button,onChange}));cleanup.dataset.folderCleanup='';cleanup.disabled=state.state!=='ready';actions.append(cleanup);}
  }
  if(!globalThis.showDirectoryPicker){choose.disabled=true;current.append(el('p',{text:uiText('folder.unsupported')}));}
  hasLegacy=!!(browser.count||listCount);legacy.hidden=!hasLegacy||!!chosen||migrating;legacy.replaceChildren();
  if(hasLegacy){legacy.append(el('p',{className:'tree-note',text:uiText(state.state==='ready'?'folder.legacyHint':'folder.legacyChooseHint')}));if(state.state==='ready'){const migrate=button(uiText('folder.importLegacy'),()=>action(importLegacy));migrate.dataset.folderImportLegacy='';legacy.append(migrate);}}

 }
 async function importLegacy(){
  controller=new AbortController();const {signal}=controller;migrating=true;phase='saving';legacy.hidden=true;cancel.hidden=false;status.textContent=uiText('folder.importingLegacy');
  try{
   await render();
   await folderLibrary.importBrowserResources({signal,onProgress,onPhase});if(signal.aborted)throw messageError('folder.canceled');
   onPhase('list');const result=await legacyUpgrade?.run({signal,onProgress});if(signal.aborted)throw messageError('folder.canceled');
   onPhase('finishing');await onChange();await render();if(hasLegacy)throw messageError('folder.browserChanged');
   if(upgradeOnOpen){d.querySelector('header strong').textContent=uiText('folder.upgradeCompleteTitle');intro.hidden=true;}
   status.textContent=result?.warnings?.length?uiFormat('folder.legacyImportedWithoutThumbnails',result.warnings.length):uiText('folder.legacyImported');
  }finally{migrating=false;}
 }
 let refreshTimer;const unlisten=onLibraryChange(()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(d.open&&!busy)render().catch(error=>{if(d.open)status.textContent=uiError(error);});},0);});
 d.addEventListener('cancel',event=>{if(busy){event.preventDefault();controller?.abort();}});d.addEventListener('close',()=>{clearTimeout(refreshTimer);unlisten();controller?.abort();},{once:true});await render();if(upgradeOnOpen&&(await folderLibrary.status()).state==='ready')await action(importLegacy);return d;
}

export async function ensureFolderLibrary(options){
 if((await folderLibrary.status()).state==='ready')return true;
 const dialog=await manageFolderLibrary({...options,selectOnly:true});
 if(dialog.open)await new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));
 return (await folderLibrary.status()).state==='ready';
}

export async function libraryDestinationState(){
 const state=await folderLibrary.status();
 return {token:state.binding?.token??null,text:state.mode==='none'?uiText('folder.destinationNone'):uiFormat(state.state==='ready'?'folder.destinationFolder':'folder.destinationUnavailable',state.index?.name??state.binding.name)};
}
export const libraryDestinationText=async()=>(await libraryDestinationState()).text;
