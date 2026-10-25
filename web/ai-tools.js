import {prepareDialogLayout} from './dialog-layout.js';
import {SKILL_AGENTS,installPathLabel,skillDirectoryParts} from './agent-install-paths.js';
import {skillFiles,downloadSkill} from './skill-downloads.js';
import {installSkill,installRoot} from './skill-install.js';
import {uiText,uiFormat,uiError,localizeApplicationMarkup} from './ui-language.js';
import {onLanguageChange} from './language.js';
import {makeDialogMovable} from './movable-dialog.js';
import {installEditorAIConnection} from './editor-ai-connection.js';
import {messageError} from './message-catalog.js';

const preferredKey='momo-ai-tools:agent:v1',kinds=['author','effects'];
export function installAITools({button,getProject,onOperation,onCatalog}){
 try{globalThis.indexedDB?.deleteDatabase('momo-ai-install:v1');}catch{}
 let agent='codex';try{const saved=localStorage.getItem(preferredKey);if(SKILL_AGENTS.some(a=>a.id===saved))agent=saved;}catch{}
 let dialog=null,view=null,locked=false,message=null,copyFeedback=null;
 const bridgeButton=document.createElement('button');bridgeButton.hidden=true;document.body.append(bridgeButton);
 const bridge=installEditorAIConnection({button:bridgeButton,returnFocus:button,getProject,onOperation,onStart:()=>{open();view.startCopy.focus();},onStatus:status=>{button.dataset.connected=String(['connected','capturing'].includes(status.state));if(view)view.connection.textContent=uiText('editorBridge.state.'+status.state);}});
 const supported=()=>typeof globalThis.showDirectoryPicker==='function'&&globalThis.isSecureContext;
 const selected=()=>kinds.filter(kind=>view?.checks[kind].checked);
 const render=()=>{
  button.textContent=uiText('aiTools.open');button.title=uiText('aiTools.title');if(!view)return;
  view.agent.disabled=locked;view.startCopy.disabled=locked;view.configure.disabled=locked;view.catalog.disabled=locked;
  view.startPrompt.value=uiText('aiTools.startPrompt');view.startFeedback.textContent=copyFeedback?uiText(copyFeedback):'';
  view.hint.textContent=uiFormat('aiTools.directoryHint',installPathLabel(agent));
  dialog.querySelector('[data-close]').disabled=locked;
  for(const check of Object.values(view.checks))check.disabled=locked;for(const button of view.downloads)button.disabled=locked;
  view.install.disabled=locked||!supported()||!selected().length;
  view.install.title=uiText(supported()?'aiTools.installHint':'aiTools.unsupported');view.progress.textContent=message?uiFormat(message.key,...message.values):supported()?'':uiText('aiTools.unsupported');
  view.clearError.textContent=message?.error?uiError(message.error):'';view.connection.textContent=uiText('editorBridge.state.'+bridge.status.state);
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
  dialog.innerHTML='<header><h2 id="ai-tools-title" data-i18n="aiTools.title"></h2><button type="button" data-close data-i18n="common.close"></button></header><p class="tree-note ai-tools-flow" data-i18n="aiTools.flow"></p><section class="ai-tools-step" data-step="install"><h3 data-i18n="aiTools.installStep"></h3><div class="ai-tools-target"><label><span data-i18n="aiTools.agent"></span><select id="ai-tools-agent"></select></label></div><p data-i18n="aiTools.installDescription"></p><p class="tree-note" data-directory-hint></p><div class="ai-tools-skills"><div class="ai-tools-skill-row"><label><input type="checkbox" data-skill="author" checked><span><strong data-i18n="aiTools.author"></strong><small data-i18n="aiTools.authorDescription"></small></span></label><button type="button" id="download-author-skill" data-i18n="aiTools.downloadZIP" data-i18n-aria-label="aiTools.downloadAuthorZIP" data-i18n-title="aiTools.downloadZIPHint"></button></div><div class="ai-tools-skill-row"><label><input type="checkbox" data-skill="effects" checked><span><strong data-i18n="aiTools.effects"></strong><small data-i18n="aiTools.effectsDescription"></small></span></label><button type="button" id="download-effects-skill" data-i18n="aiTools.downloadZIP" data-i18n-aria-label="aiTools.downloadEffectsZIP" data-i18n-title="aiTools.downloadZIPHint"></button></div></div><div class="ai-tools-actions"><button type="button" data-install data-i18n="aiTools.install"></button></div><p class="tree-note" data-i18n="aiTools.runtimeHelp"></p><p role="status" data-progress></p><p role="alert" data-error></p></section><section class="ai-tools-step" data-step="start"><h3 data-i18n="aiTools.startStep"></h3><p data-i18n="aiTools.startDescription"></p><label for="ai-start-prompt" data-i18n="aiTools.promptLabel"></label><textarea id="ai-start-prompt" data-start-prompt readonly rows="4" spellcheck="false"></textarea><div class="ai-tools-actions"><button type="button" data-start-copy data-i18n="aiTools.copyStart"></button></div><p role="status" data-start-feedback></p></section><section class="ai-tools-step" data-step="configure"><h3 data-i18n="aiTools.configureStep"></h3><p data-i18n="aiTools.mcpDescription"></p><p data-connection role="status"></p><div class="ai-tools-actions"><button type="button" data-connection-open data-i18n="aiTools.connectionSettings"></button></div></section><details class="ai-tools-extra"><summary data-i18n="aiTools.context"></summary><p class="tree-note" data-i18n="aiTools.contextDescription"></p><div class="ai-tools-actions"><button type="button" data-catalog data-i18n="library.exportAIGraphicsCatalog"></button></div></details>';
  const q=selector=>dialog.querySelector(selector);
  view={configure:q('[data-connection-open]'),catalog:q('[data-catalog]'),startCopy:q('[data-start-copy]'),startPrompt:q('[data-start-prompt]'),startFeedback:q('[data-start-feedback]'),agent:q('#ai-tools-agent'),hint:q('[data-directory-hint]'),downloads:[q('#download-author-skill'),q('#download-effects-skill')],checks:Object.fromEntries(kinds.map(k=>[k,q('[data-skill='+k+']')])),install:q('[data-install]'),progress:q('[data-progress]'),clearError:q('[data-error]'),connection:q('[data-connection]')};
  for(const target of SKILL_AGENTS){const option=document.createElement('option');option.value=target.id;option.textContent=target.name;view.agent.append(option);}view.agent.value=agent;
  view.agent.onchange=()=>{agent=view.agent.value;message=null;try{localStorage.setItem(preferredKey,agent);}catch{}render();};
  view.install.onclick=install;
  view.startCopy.onclick=async()=>{const current=view;try{await navigator.clipboard.writeText(current.startPrompt.value);if(view!==current)return;copyFeedback='aiTools.startCopied';}catch{if(view!==current)return;current.startPrompt.focus();current.startPrompt.select();copyFeedback='aiTools.startCopyManually';}render();};
  for(const check of Object.values(view.checks))check.onchange=render;
  q('#download-author-skill').onclick=()=>downloadSkill('author');q('#download-effects-skill').onclick=()=>downloadSkill('effects');
  view.catalog.onclick=()=>{if(locked)return;close();onCatalog();};view.configure.onclick=()=>{if(locked)return;close();bridge.open();};q('[data-close]').onclick=close;
  dialog.addEventListener('cancel',event=>{if(locked)event.preventDefault();});
  document.body.append(dialog);const dispose=localizeApplicationMarkup(dialog);dialog.addEventListener('close',()=>{dispose();dialog.remove();dialog=null;view=null;message=null;copyFeedback=null;button.focus();},{once:true});render();prepareDialogLayout(dialog);dialog.showModal();makeDialogMovable(dialog);
 };
 button.onclick=open;onLanguageChange(render);render();return {open,connection:bridge};
}
