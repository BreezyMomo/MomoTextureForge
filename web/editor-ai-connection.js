import {EDITOR_BRIDGE_PROTOCOL,EDITOR_BRIDGE_ORIGIN} from './editor-bridge-protocol.js';
import {editorRevision} from './editor-live-authoring.js';
import {encodeResourcePack} from './resource-pack.js';
import {uiText,uiFormat,uiError,localizeApplicationMarkup} from './ui-language.js';
import {onLanguageChange,interfaceLanguage} from './language.js';
import {messageError} from './message-catalog.js';
import {makeDialogMovable} from './movable-dialog.js';

const encode64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
export async function captureEditorProject(getProject){
 // Clone before the first await: concurrent UI edits cannot change this snapshot.
 const project=structuredClone(getProject()),createdAt=new Date().toISOString(),bytes=await encodeResourcePack(project);
 return {protocol:EDITOR_BRIDGE_PROTOCOL,zip:encode64(bytes),editRevision:await editorRevision(JSON.stringify(project)),createdAt};
}
export function createEditorAIConnection({getProject,onOperation,onChange=()=>{},fetch:request=globalThis.fetch.bind(globalThis),serviceOrigin=EDITOR_BRIDGE_ORIGIN}){
 let session=null,connecting=null,generation=0,status={state:'disconnected',error:null,lastCapture:null,pageId:null,configuration:null};
 const publish=values=>{status={...status,...values};onChange({...status});};
 const name=()=>{try{return String(getProject().name??'').slice(0,160);}catch{return globalThis.document?.title??'';}};
 const http=async(origin,path,{token,body,signal,keepalive=false}={})=>{
  let response;try{response=await request(origin+path,{method:body===undefined?'GET':'POST',mode:'cors',credentials:'omit',cache:'no-store',targetAddressSpace:'loopback',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal,keepalive});}
  catch(error){if(error.name==='AbortError')throw error;throw messageError('editorBridge.unreachable');}
  if(path.endsWith('/response')&&response.status===409)return {expired:true};
  if(!response.ok)throw messageError(response.status===401?'editorBridge.expired':response.status===403?'editorBridge.originDenied':'editorBridge.requestFailed');
  return response.json();
 };
 async function disconnect({keepalive=false}={}){
  const previous=session;session=null;generation++;connecting?.abort();connecting=null;previous?.controller.abort();publish({state:'disconnected',error:null,pageId:null,configuration:null,lastCapture:null});
  if(previous)try{await http(serviceOrigin,'/pages/'+previous.pageId+'/disconnect',{token:previous.token,body:{},signal:AbortSignal.timeout(2000),keepalive});}catch{}
 }
 async function poll(connection,version){
  try{
   while(session===connection&&generation===version){
    const result=await http(serviceOrigin,'/pages/'+connection.pageId+'/requests?name='+encodeURIComponent(name()),{token:connection.token,signal:connection.controller.signal});
    for(const operation of result.requests??[]){
     if(generation!==version)break;
     let result,error;
     try{publish({state:'capturing'});if(operation.operation==='capture')result=await captureEditorProject(getProject);else if(onOperation)result=await onOperation(operation.operation,operation.args,()=>generation===version&&session===connection&&Date.now()<operation.expiresAt);else throw messageError('editorBridge.unsupportedOperation');}
     catch(cause){error=uiError(cause);}
     if(generation!==version)break;
     const ack=await http(serviceOrigin,'/pages/'+connection.pageId+'/response',{token:connection.token,body:{id:operation.id,...(error?{error}:{result})},signal:connection.controller.signal});
     publish({state:'connected',lastCapture:error||ack.expired?status.lastCapture:(result.createdAt??status.lastCapture),error:error&&!ack.expired?{message:error}:null});
    }
   }
  }catch(error){if(generation===version){session=null;connection.controller.abort();generation++;publish({state:'disconnected',pageId:null,configuration:null,error});}}
 }
 return {
  get status(){return {...status};},disconnect,
  async connect(){
   if(session||connecting)return;
   const version=++generation,controller=new AbortController();connecting=controller;publish({state:'connecting',error:null,lastCapture:null});
   try{
    const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(12000)]),location=globalThis.location;
    // Only the local application backend can launch Node. Static/HTTPS deployments
    // use an already-running helper and never pretend a browser can spawn a process.
    if(location&&['127.0.0.1','localhost'].includes(location.hostname)&&location.protocol==='http:'){
     try{await http(location.origin,'/api/editor-mcp/start',{body:{},signal});}catch(error){if(controller.signal.aborted)throw error;}
    }
    const health=await http(serviceOrigin,'/health',{signal});
    if(health.protocol!==EDITOR_BRIDGE_PROTOCOL)throw messageError('editorBridge.incompatible');
    const registered=await http(serviceOrigin,'/pages',{body:{protocol:EDITOR_BRIDGE_PROTOCOL,name:name(),access:onOperation?'read-write':'read-only'},signal});
    if(registered.protocol!==EDITOR_BRIDGE_PROTOCOL||registered.access!==(onOperation?'read-write':'read-only')||typeof registered.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(registered.token)||typeof registered.pageId!=='string')throw messageError('editorBridge.incompatible');
    if(generation!==version){try{await http(serviceOrigin,'/pages/'+registered.pageId+'/disconnect',{token:registered.token,body:{},signal:AbortSignal.timeout(2000)});}catch{}return;}
    session={pageId:registered.pageId,token:registered.token,controller:new AbortController()};publish({state:'connected',error:null,lastCapture:null,pageId:registered.pageId,configuration:registered.configuration});void poll(session,version);
   }catch(error){if(generation!==version)return;publish({state:'disconnected',error});throw error;}finally{if(connecting===controller)connecting=null;}
  },
 };
}
export function installEditorAIConnection({button,getProject,onOperation,onStart,onStatus=()=>{},returnFocus:focusTarget}){
 let dialog=null,view=null;
 const render=()=>{
  const status=connection.status,active=['connected','capturing'].includes(status.state);
  onStatus(status);
  button.textContent=uiText(active?'editorBridge.connectedButton':'editorBridge.open');button.dataset.connected=String(active);button.title=uiText('editorBridge.title');
  if(!view)return;
  if(dialog.classList.contains('movable-dialog')){const header=dialog.querySelector(':scope>header');header.setAttribute('aria-label',uiText('dialog.moveWindow'));header.title=uiText('dialog.moveHint');}
  view.status.textContent=uiText('editorBridge.state.'+status.state);view.error.textContent=status.error?uiError(status.error):'';
  view.last.textContent=status.lastCapture?uiFormat('editorBridge.lastCapture',new Date(status.lastCapture).toLocaleTimeString(interfaceLanguage())):uiText('editorBridge.notRead');
  view.connect.disabled=active||status.state==='connecting';view.disconnect.hidden=!active&&status.state!=='connecting';view.copy.disabled=!active;
  view.configuration.value=status.configuration?JSON.stringify(status.configuration,null,2):'';
  view.configDetails.hidden=!active;view.page.textContent=status.pageId?uiFormat('editorBridge.pageId',status.pageId):'';
  if(status.error)view.setup.open=true;
 };
 const connection=createEditorAIConnection({getProject,onOperation,onChange:render});onLanguageChange(render);render();
 button.onclick=()=>{
  if(dialog){dialog.focus();return;}
  const returnFocus=focusTarget??button;dialog=document.createElement('dialog');dialog.className='editor-ai-dialog';dialog.setAttribute('aria-labelledby','editor-ai-title');dialog.setAttribute('aria-describedby','editor-ai-description');
  dialog.innerHTML='<header><h2 id="editor-ai-title" data-i18n="editorBridge.title"></h2><button type="button" data-close data-i18n="common.close"></button></header><p id="editor-ai-description" data-i18n="editorBridge.description"></p><div class="ai-tools-actions"><button type="button" data-connect data-i18n="editorBridge.connect"></button><button type="button" data-copy data-i18n="editorBridge.copyConfiguration" disabled></button><button type="button" data-disconnect data-i18n="editorBridge.disconnect" hidden></button></div><p class="editor-ai-state" role="status"></p><p class="editor-ai-error" role="alert"></p><p class="editor-ai-page tree-note"></p><p class="editor-ai-last tree-note"></p><details data-config hidden><summary data-i18n="editorBridge.configuration"></summary><label for="editor-ai-config" class="tree-note" data-i18n="editorBridge.configHelp"></label><textarea id="editor-ai-config" readonly rows="9" spellcheck="false"></textarea></details><details data-setup><summary data-i18n="editorBridge.setup"></summary><p data-i18n="editorBridge.setupAI"></p><button type="button" data-start-back data-i18n="editorBridge.backToStart"></button></details><p class="tree-note" data-i18n="editorBridge.networkPermission"></p>';
  const q=selector=>dialog.querySelector(selector);
  view={connect:q('[data-connect]'),copy:q('[data-copy]'),disconnect:q('[data-disconnect]'),status:q('[role=status]'),error:q('[role=alert]'),last:q('.editor-ai-last'),page:q('.editor-ai-page'),configuration:q('textarea'),configDetails:q('[data-config]'),setup:q('[data-setup]')};
  q('[data-close]').onclick=()=>dialog.close();view.disconnect.onclick=()=>void connection.disconnect();q('[data-start-back]').onclick=()=>{dialog.addEventListener('close',()=>onStart?.(),{once:true});dialog.close();};
  view.connect.onclick=()=>void connection.connect().catch(()=>{});
  view.copy.onclick=async()=>{const current=view;try{await navigator.clipboard.writeText(current.configuration.value);if(view===current)current.status.textContent=uiText('editorBridge.copied');}catch{if(view===current){current.configDetails.open=true;current.configuration.focus();current.configuration.select();current.status.textContent=uiText('editorBridge.copyManually');}}};
  document.body.append(dialog);const disposeLanguage=localizeApplicationMarkup(dialog);dialog.addEventListener('close',()=>{disposeLanguage();dialog.remove();dialog=null;view=null;returnFocus.focus();},{once:true});
  render();dialog.showModal();makeDialogMovable(dialog);view.connect.focus();
 };
 globalThis.addEventListener?.('pagehide',()=>{void connection.disconnect({keepalive:true});});
 return Object.assign(connection,{open:()=>button.onclick()});
}
