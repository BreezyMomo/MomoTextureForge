import {folderLibrary} from './folder-library.js';
import {graphicLabel} from './graphic-label.js';
import {restoreMessageError} from './message-catalog.js';
import {uiText,uiFormat,uiError} from './ui-language.js';

const sizeText=bytes=>uiFormat(bytes<1024*1024?'folder.cleanupSizeKB':'folder.cleanupSizeMB',(bytes/(bytes<1024*1024?1024:1024*1024)).toFixed(1));
export async function manageFolderCleanup({modal,el,button,onChange=async()=>{},result=null}){
 const {d,body}=modal(uiText('folder.cleanupTitle'));d.classList.add('folder-library-dialog','folder-cleanup-dialog');
 const location=el('p',{className:'folder-save-destination',hidden:true}),summary=el('p'),list=el('ul',{className:'library-cleanup-files'}),status=el('p',{role:'status','aria-live':'polite'}),progress=el('progress',{hidden:true,max:1,value:0,'aria-label':uiText('folder.cleanupProgressLabel')});
 let plan=result?.plan??null,failed=result?.failed??[],busy=false,controller=null;const deletion=!!result?.removed;
 const scan=button(uiText('folder.cleanupRescan'),()=>action(scanFiles)),remove=button(uiText('folder.cleanupDelete'),()=>action(async()=>{
  const next=await folderLibrary.cleanFiles(plan.id,{signal:controller.signal,onProgress});folderLibrary.releaseCleanup(plan.id);plan=next.plan;failed=next.failed;await onChange();render();showResult(next);
 })),cancel=button(uiText('common.cancel'),()=>controller?.abort()),close=d.querySelector('.graphics-close');cancel.hidden=true;
 scan.dataset.cleanupScan='';remove.dataset.cleanupDelete='';remove.classList.add('graphics-delete-download');
 body.append(el('p',{text:uiText('folder.cleanupIntro')}),location,summary,list,el('div',{className:'graphics-actions'},[scan,remove,cancel]),progress,status);
 function onProgress({done,total,name}){progress.hidden=false;progress.max=Math.max(1,total);progress.value=done;status.textContent=uiFormat('folder.cleanupProgress',done,total,name);}
 function render(){
  if(plan){location.hidden=false;location.textContent=uiFormat('folder.cleanupLibrary',plan.name,plan.folderName);}
  const files=plan?.files??[];summary.textContent=files.length?uiFormat('folder.cleanupSummary',files.length,sizeText(plan.bytes)):uiText('folder.cleanupEmpty');list.replaceChildren();remove.disabled=!files.length;
  for(const file of files){const row=el('li'),name=file.name?graphicLabel(file)+' · v'+file.versionId:file.path,details=el('div',{},[el('strong',{text:name})]);if(file.name)details.append(el('small',{text:file.path}));const error=failed.find(item=>item.path===file.path);if(error)details.append(el('small',{className:'library-cleanup-error',text:uiError(restoreMessageError(error))}));row.append(details,el('span',{text:sizeText(file.bytes)}));list.append(row);}
 }
 function showResult(value){status.textContent=value.complete?uiFormat('folder.cleanupDone',value.deleted.length,sizeText(value.bytes)):uiFormat(deletion?'folder.deletePartial':'folder.cleanupPartial',value.failed.length);}
 async function scanFiles(){status.textContent=uiText('folder.cleanupScanning');const next=await folderLibrary.scanUnused({signal:controller.signal,onProgress});if(plan)folderLibrary.releaseCleanup(plan.id);plan=next;failed=[];render();status.textContent='';}
 async function action(run){if(busy)return;busy=true;controller=new AbortController();scan.disabled=remove.disabled=close.disabled=true;cancel.hidden=false;try{await run();}catch(error){status.textContent=uiError(error);}finally{busy=false;scan.disabled=close.disabled=false;remove.disabled=!plan?.files.length;cancel.hidden=progress.hidden=true;controller=null;}}
 d.addEventListener('cancel',event=>{if(busy){event.preventDefault();controller?.abort();}});d.addEventListener('close',()=>{controller?.abort();if(plan)folderLibrary.releaseCleanup(plan.id);},{once:true});
 if(result){render();showResult(result);}else await action(scanFiles);return d;
}
