import {EDITOR_BRIDGE_PROTOCOL,parseEditorPairingCode} from './editor-bridge-protocol.js';
import {encodeResourcePack} from './resource-pack.js';
import {uiText,uiFormat,uiError,localizeApplicationMarkup} from './ui-language.js';
import {onLanguageChange,interfaceLanguage} from './language.js';
import {messageError} from './message-catalog.js';
import {makeDialogMovable} from './movable-dialog.js';

const encode64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
export async function captureEditorProject(getProject){
 // Clone before the first await: concurrent UI edits cannot change this snapshot.
 const project=structuredClone(getProject()),createdAt=new Date().toISOString(),bytes=await encodeResourcePack(project);
 return {protocol:EDITOR_BRIDGE_PROTOCOL,zip:encode64(bytes),createdAt};
}
export function createEditorAIConnection({getProject,onChange=()=>{},fetch:request=globalThis.fetch.bind(globalThis)}){
 let session=null,connecting=null,generation=0,status={state:'disconnected',error:null,lastCapture:null};
 const publish=values=>{status={...status,...values};onChange({...status});};
 const http=async(origin,path,{token,body,signal}={})=>{
  let response;try{response=await request(origin+path,{method:body===undefined?'GET':'POST',mode:'cors',credentials:'omit',cache:'no-store',targetAddressSpace:'loopback',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal});}
  catch(error){if(error.name==='AbortError')throw error;throw messageError('editorBridge.unreachable');}
  if(path==='/response'&&response.status===409)return {expired:true};
  if(!response.ok)throw messageError(response.status===401?'editorBridge.expired':response.status===403?'editorBridge.originDenied':'editorBridge.requestFailed');
  return response.json();
 };
 async function disconnect(){
  const previous=session;session=null;generation++;connecting?.abort();connecting=null;previous?.controller.abort();publish({state:'disconnected',error:null});
  if(previous)try{await http(previous.origin,'/disconnect',{token:previous.token,body:{},signal:AbortSignal.timeout(2000)});}catch{}
 }
 async function poll(connection,version){
  try{
   while(session===connection&&generation===version){
    const result=await http(connection.origin,'/requests',{token:connection.token,signal:connection.controller.signal});
    for(const operation of result.requests??[]){
     if(generation!==version)break;
     let result,error;
     try{if(operation.operation!=='capture')throw messageError('editorBridge.readOnly');publish({state:'capturing'});result=await captureEditorProject(getProject);}
     catch(cause){error=uiError(cause);}
     if(generation!==version)break;
     const ack=await http(connection.origin,'/response',{token:connection.token,body:{id:operation.id,...(error?{error}:{result})},signal:connection.controller.signal});
     publish({state:'connected',lastCapture:error||ack.expired?status.lastCapture:result.createdAt,error:error&&!ack.expired?{message:error}:null});
    }
   }
  }catch(error){if(generation===version){session=null;connection.controller.abort();generation++;publish({state:'disconnected',error});}}
 }
 return {
  get status(){return {...status};},disconnect,
  async connect(value){
   let code;try{code=parseEditorPairingCode(value);}catch{throw messageError('editorBridge.invalidCode');}
   await disconnect();const version=generation,controller=new AbortController();connecting=controller;publish({state:'connecting',error:null});
   try{
    const paired=await http(code.origin,'/pair',{body:{protocol:EDITOR_BRIDGE_PROTOCOL,code:code.code},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});
    if(paired.protocol!==EDITOR_BRIDGE_PROTOCOL||paired.access!=='read-only'||typeof paired.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(paired.token))throw messageError('editorBridge.incompatible');
    if(generation!==version)return;
    session={origin:code.origin,token:paired.token,controller:new AbortController()};publish({state:'connected',error:null,lastCapture:null});void poll(session,version);
   }catch(error){if(generation!==version)return;publish({state:'disconnected',error});throw error;}finally{if(connecting===controller)connecting=null;}
  },
 };
}
export function installEditorAIConnection({button,getProject,onDownloadSkill,onStatus=()=>{},returnFocus:focusTarget}){
 let dialog=null,view=null;
 const render=()=>{
  const status=connection.status,active=['connected','capturing'].includes(status.state);
  onStatus(status);
  button.textContent=uiText(active?'editorBridge.connectedButton':'editorBridge.open');button.dataset.connected=String(active);button.title=uiText('editorBridge.title');
  if(!view)return;
  if(dialog.classList.contains('movable-dialog')){const header=dialog.querySelector(':scope>header');header.setAttribute('aria-label',uiText('dialog.moveWindow'));header.title=uiText('dialog.moveHint');}
  view.status.textContent=uiText('editorBridge.state.'+status.state);view.error.textContent=status.error?uiError(status.error):'';
  view.last.textContent=status.lastCapture?uiFormat('editorBridge.lastCapture',new Date(status.lastCapture).toLocaleTimeString(interfaceLanguage())):uiText('editorBridge.notRead');
  view.connect.disabled=active||status.state==='connecting';view.disconnect.hidden=!active&&status.state!=='connecting';view.code.disabled=active||status.state==='connecting';
 };
 const connection=createEditorAIConnection({getProject,onChange:render});onLanguageChange(render);render();
 button.onclick=()=>{
  if(dialog){dialog.focus();return;}
  const returnFocus=focusTarget??button;dialog=document.createElement('dialog');dialog.className='editor-ai-dialog';dialog.setAttribute('aria-labelledby','editor-ai-title');dialog.setAttribute('aria-describedby','editor-ai-description');
  dialog.innerHTML='<header><h2 id="editor-ai-title" data-i18n="editorBridge.title"></h2><button type="button" data-close data-i18n="common.close"></button></header><p id="editor-ai-description" data-i18n="editorBridge.description"></p><form><label for="editor-ai-code" data-i18n="editorBridge.code"></label><div class="editor-ai-pair"><input id="editor-ai-code" type="password" autocomplete="off" spellcheck="false" maxlength="60" required data-i18n-placeholder="editorBridge.codePlaceholder"><button type="submit" data-connect data-i18n="editorBridge.connect"></button></div></form><p class="editor-ai-state" role="status"></p><p class="editor-ai-error" role="alert"></p><p class="editor-ai-last tree-note"></p><button type="button" data-disconnect data-i18n="editorBridge.disconnect" hidden></button><details><summary data-i18n="editorBridge.setup"></summary><ol><li data-i18n="editorBridge.setupDownload"></li><li data-i18n="editorBridge.setupConfigure"></li><li data-i18n="editorBridge.setupPair"></li></ol><pre><code>{"mcpServers":{"texture-forge":{"command":"node","args":["/absolute/path/texture-forge-author/scripts/texforge.mjs","mcp"]}}}</code></pre><p class="tree-note" data-i18n="editorBridge.networkPermission"></p><button type="button" data-download data-i18n="editor.authoringSkill"></button></details>';
  view={code:dialog.querySelector('input'),connect:dialog.querySelector('[data-connect]'),disconnect:dialog.querySelector('[data-disconnect]'),status:dialog.querySelector('[role=status]'),error:dialog.querySelector('[role=alert]'),last:dialog.querySelector('.editor-ai-last')};
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();view.disconnect.onclick=()=>{view.code.value='';void connection.disconnect();};
  dialog.querySelector('[data-download]').onclick=onDownloadSkill;
  dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const formView=view;try{await connection.connect(formView.code.value);if(view===formView&&connection.status.state==='connected')formView.code.value='';}catch(error){if(view===formView)formView.error.textContent=uiError(error);}};
  document.body.append(dialog);const disposeLanguage=localizeApplicationMarkup(dialog);dialog.addEventListener('close',()=>{disposeLanguage();dialog.remove();dialog=null;view=null;returnFocus.focus();},{once:true});
  render();dialog.showModal();makeDialogMovable(dialog);view.code.focus();
 };
 globalThis.addEventListener?.('pagehide',()=>{void connection.disconnect();});
 return Object.assign(connection,{open:()=>button.onclick()});
}
