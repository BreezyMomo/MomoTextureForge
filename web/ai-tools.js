import {SKILL_AGENTS,installPathLabel,skillDirectoryParts} from './agent-install-paths.js';
import {skillFiles,downloadSkill} from './skill-downloads.js';
import {installSkill,installRoot} from './skill-install.js';
import {uiText,uiFormat,uiError,localizeApplicationMarkup} from './ui-language.js';
import {onLanguageChange} from './language.js';
import {makeDialogMovable} from './movable-dialog.js';
import {installEditorAIConnection} from './editor-ai-connection.js';
import {messageError} from './message-catalog.js';

const preferredKey='momo-ai-tools:agent:v1',kinds=['author','effects'];
export function installAITools({button,getProject,onCatalog}){
 try{globalThis.indexedDB?.deleteDatabase('momo-ai-install:v1');}catch{}
 let agent='codex';try{const saved=localStorage.getItem(preferredKey);if(SKILL_AGENTS.some(a=>a.id===saved))agent=saved;}catch{}
 let dialog=null,view=null,locked=false,tab='install',message=null;
 const bridgeButton=document.createElement('button');bridgeButton.hidden=true;document.body.append(bridgeButton);
 const bridge=installEditorAIConnection({button:bridgeButton,returnFocus:button,getProject,onDownloadSkill:()=>downloadSkill('author'),onStatus:status=>{button.dataset.connected=String(['connected','capturing'].includes(status.state));if(view)view.connection.textContent=uiText('editorBridge.state.'+status.state);}});
 const supported=()=>typeof globalThis.showDirectoryPicker==='function'&&globalThis.isSecureContext;
 const selected=()=>kinds.filter(kind=>view?.checks[kind].checked);
 const render=()=>{
  button.textContent=uiText('aiTools.open');button.title=uiText('aiTools.title');if(!view)return;
  view.agent.disabled=locked;
  view.hint.textContent=uiFormat('aiTools.directoryHint',installPathLabel(agent));
  dialog.querySelector('[data-close]').disabled=locked;for(const node of view.tabs)node.disabled=locked;
  for(const check of Object.values(view.checks))check.disabled=locked;for(const button of view.downloads)button.disabled=locked;
  view.install.disabled=locked||!supported()||!selected().length;
  view.install.title=uiText(supported()?'aiTools.installHint':'aiTools.unsupported');view.progress.textContent=message?uiFormat(message.key,...message.values):supported()?'':uiText('aiTools.unsupported');
  view.clearError.textContent=message?.error?uiError(message.error):'';view.connection.textContent=uiText('editorBridge.state.'+bridge.status.state);
  for(const node of view.panels)node.hidden=node.dataset.panel!==tab;
  for(const node of view.tabs){node.setAttribute('aria-selected',String(node.dataset.tab===tab));node.tabIndex=node.dataset.tab===tab?0:-1;}
  const header=dialog.querySelector('header');if(dialog.classList.contains('movable-dialog')){header.title=uiText('dialog.moveHint');header.setAttribute('aria-label',uiText('dialog.moveWindow'));}
 };
 async function install(){
  if(locked)return;const choices=selected();if(!choices.length)return;locked=true;message={key:'aiTools.installing',values:[]};render();
  try{
   const handle=await showDirectoryPicker({id:'momo-skills-'+agent,mode:'readwrite'});
   if(handle.requestPermission&&await handle.requestPermission({mode:'readwrite'})!=='granted')throw messageError('aiTools.permissionDenied');
   const root=await installRoot(handle,agent,'personal',{create:true});let backups=0;
   for(const kind of choices){const result=await installSkill(root,skillFiles(kind),{agent});if(result.backup)backups++;}
   message={key:backups?'aiTools.installedWithBackup':'aiTools.installed',values:[choices.length,[handle.name,...skillDirectoryParts(agent,'personal',handle.name)].join('/')]};
  }catch(error){if(error.name==='AbortError')message=null;else message={key:'aiTools.failed',values:[],error};}
  finally{locked=false;render();}
 }
 const close=()=>{if(!locked)dialog.close();};
 const open=()=>{
  if(dialog){dialog.focus();return;}
  dialog=document.createElement('dialog');dialog.className='ai-tools-dialog';dialog.setAttribute('aria-labelledby','ai-tools-title');
  dialog.innerHTML='<header><h2 id="ai-tools-title" data-i18n="aiTools.title"></h2><button type="button" data-close data-i18n="common.close"></button></header><div class="ai-tools-target"><label><span data-i18n="aiTools.agent"></span><select id="ai-tools-agent"></select></label></div><nav role="tablist" data-i18n-aria-label="aiTools.sections"><button role="tab" data-tab="install" data-i18n="aiTools.installTab"></button><button role="tab" data-tab="work" data-i18n="aiTools.workTab"></button></nav><section role="tabpanel" data-panel="install"><p data-i18n="aiTools.installDescription"></p><p class="tree-note" data-directory-hint></p><div class="ai-tools-skills"><div class="ai-tools-skill-row"><label><input type="checkbox" data-skill="author" checked><span><strong data-i18n="aiTools.author"></strong><small data-i18n="aiTools.authorDescription"></small></span></label><button type="button" id="download-author-skill" data-i18n="aiTools.downloadZIP" data-i18n-aria-label="aiTools.downloadAuthorZIP" data-i18n-title="aiTools.downloadZIPHint"></button></div><div class="ai-tools-skill-row"><label><input type="checkbox" data-skill="effects" checked><span><strong data-i18n="aiTools.effects"></strong><small data-i18n="aiTools.effectsDescription"></small></span></label><button type="button" id="download-effects-skill" data-i18n="aiTools.downloadZIP" data-i18n-aria-label="aiTools.downloadEffectsZIP" data-i18n-title="aiTools.downloadZIPHint"></button></div></div><div class="ai-tools-actions"><button type="button" data-install data-i18n="aiTools.install"></button></div><p class="tree-note" data-i18n="aiTools.runtimeHelp"></p><p role="status" data-progress></p><p role="alert" data-error></p></section><section role="tabpanel" data-panel="work" hidden><h3 data-i18n="aiTools.mcp"></h3><p data-i18n="aiTools.mcpDescription"></p><p data-connection role="status"></p><div class="ai-tools-actions"><button type="button" data-connection-open data-i18n="aiTools.connectionSettings"></button></div><h3 data-i18n="aiTools.context"></h3><p class="tree-note" data-i18n="aiTools.contextDescription"></p><div class="ai-tools-actions"><button type="button" data-catalog data-i18n="library.exportAIGraphicsCatalog"></button></div></section>';
  const q=selector=>dialog.querySelector(selector);
  view={agent:q('#ai-tools-agent'),hint:q('[data-directory-hint]'),downloads:[q('#download-author-skill'),q('#download-effects-skill')],checks:Object.fromEntries(kinds.map(k=>[k,q('[data-skill='+k+']')])),install:q('[data-install]'),progress:q('[data-progress]'),clearError:q('[data-error]'),connection:q('[data-connection]'),panels:[...dialog.querySelectorAll('[role=tabpanel]')],tabs:[...dialog.querySelectorAll('[role=tab]')]};
  for(const target of SKILL_AGENTS){const option=document.createElement('option');option.value=target.id;option.textContent=target.name;view.agent.append(option);}view.agent.value=agent;
  view.agent.onchange=()=>{agent=view.agent.value;message=null;try{localStorage.setItem(preferredKey,agent);}catch{}render();};
  view.install.onclick=install;
  for(const check of Object.values(view.checks))check.onchange=render;
  q('#download-author-skill').onclick=()=>downloadSkill('author');q('#download-effects-skill').onclick=()=>downloadSkill('effects');
  q('[data-catalog]').onclick=()=>{close();onCatalog();};q('[data-connection-open]').onclick=()=>{close();bridge.open();};q('[data-close]').onclick=close;
  for(const target of view.tabs){target.onclick=()=>{tab=target.dataset.tab;render();};target.onkeydown=event=>{const index=view.tabs.indexOf(target),next=event.key==='ArrowRight'?(index+1)%view.tabs.length:event.key==='ArrowLeft'?(index+view.tabs.length-1)%view.tabs.length:event.key==='Home'?0:event.key==='End'?view.tabs.length-1:null;if(next!==null){event.preventDefault();tab=view.tabs[next].dataset.tab;render();view.tabs[next].focus();}};}
  dialog.addEventListener('cancel',event=>{if(locked)event.preventDefault();});
  document.body.append(dialog);const dispose=localizeApplicationMarkup(dialog);dialog.addEventListener('close',()=>{dispose();dialog.remove();dialog=null;view=null;message=null;button.focus();},{once:true});render();dialog.showModal();makeDialogMovable(dialog);
 };
 button.onclick=open;onLanguageChange(render);render();return {open,connection:bridge};
}
