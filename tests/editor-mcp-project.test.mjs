import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createEditorMCP} from '../editor-mcp.mjs';
import {createEditorAIConnection} from '../web/editor-ai-connection.js';
import {createLiveAuthoring,editorRevision} from '../web/editor-live-authoring.js';
import {createLiveLibrary} from '../web/editor-live-library.js';
import {createLiveLibraryImport} from '../web/editor-live-library-io.js';
import {createLiveResource} from '../web/editor-live-resource.js';
import {bytesHash,bundleKey} from '../web/graphics-library.js';
import {project,node} from '../web/tree-model.js';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';

test('HTTP MCP state/history and native ZIP/JSON save/open preserve edits and reject stale or invalid requests',async()=>{
 await mkdir('test-results/editor-mcp-project',{recursive:true});const dir=await mkdtemp(resolve('test-results/editor-mcp-project/run-'));
 let state=project(),history=[],future=[],historyRevision=0,allowImport=true;
 const initial=structuredClone(state),getEditorState=()=>({project:{name:state.name},history:{undo:history.length,redo:future.length,revision:historyRevision},selection:{ids:[]}});
 const app=createEditorMCP({port:0,outputDir:dir,runBrowser:async()=>({ok:true,brief:{name:state.name,output:state.output,nodes:[],resources:[]}})});await app.start();
 const serviceOrigin='http://127.0.0.1:'+app.bridge.port,client=new Client({name:'project-controls-regression',version:'1'});
 let localEntries=[];const localBundles=new Map(),library=createLiveLibrary({readLocal:async()=>localEntries,readSources:async()=>[],readCatalogs:async()=>[],readDownloads:async()=>[],readLocalBundle:async key=>localBundles.get(key),removeLocal:async(id,{expectedLocal})=>{const old=localEntries.find(e=>e.resourceId===id);assert.equal(expectedLocal.hash,old.hash);localEntries=localEntries.filter(e=>e!==old);localBundles.delete(bundleKey(old));}});
 const resource=createLiveResource({library,getProject:()=>state,revision:editorRevision,render:()=>'',save:async(entry,bytes,options)=>{if(options?.expectedLocal){const old=localEntries.find(e=>e.resourceId===entry.resourceId);assert.equal(old.hash,options.expectedLocal.hash);assert.equal(old.versionId,options.expectedLocal.versionId);localBundles.delete(bundleKey(old));localEntries=localEntries.filter(e=>e!==old);}entry={...entry,hash:await bytesHash(bytes)};localEntries.push(entry);localBundles.set(bundleKey(entry),bytes);return entry;}});
 const importLibrary=createLiveLibraryImport({library,readLocal:async()=>localEntries,render:()=>'',save:async(records,{expectedEntries})=>{assert.deepEqual(expectedEntries,localEntries);const added=await Promise.all(records.map(async({entry,bytes})=>{localBundles.set(bundleKey(entry),bytes);return {...entry,hash:await bytesHash(bytes)};}));localEntries.push(...added);return added;}});
 const operations=createLiveAuthoring({importLibrary,getProject:()=>state,getComponents:()=>state.projectResources,getEditorState,library,resource,
  commitGraphicsList:(p,entries)=>{history.push(structuredClone(state));future=[];historyRevision++;state={...p,projectResources:entries};},
  commitProject:p=>{history.push(structuredClone(state));future=[];historyRevision++;const {projectResources,...canvas}=p;state={projectResources,...canvas};},
  changeHistory:action=>{const from=action==='undo'?history:future,to=action==='undo'?future:history;if(!from.length)return false;to.push(structuredClone(state));state=from.pop();historyRevision++;return true;},
  readPack:async bytes=>({...await readResourcePack(bytes),persist:async()=>{}}),
  validatePack:()=>{if(!allowImport)throw Error('Test validation failure');}});
 const connection=createEditorAIConnection({getProject:()=>state,onOperation:operations,serviceOrigin,fetch:(url,options)=>fetch(url,{...options,headers:{...options.headers,Origin:'http://127.0.0.1:18889'}})});
 try{
  await connection.connect();await client.connect(new StreamableHTTPClientTransport(new URL(serviceOrigin+'/mcp'),{requestInit:{headers:{Authorization:'Bearer '+app.bridge.agentToken}}}));
  const call=(name,args)=>client.callTool({name,arguments:args}),data=async(name,args)=>{const result=await call(name,args);assert.ok(!result.isError,result.content?.[0]?.text);return result.structuredContent;},pageId=connection.status.pageId;
  const initialSnapshot=await data('forge_capture',{pageId});assert.equal((await data('forge_editor_state',{pageId})).history.undo,0);
  const libraryList=await data('forge_library',{pageId,source:'builtin',limit:2});assert.equal(libraryList.items.length,2);
  const libraryDetail=await data('forge_library',{pageId,key:libraryList.items[0].key});assert.ok(libraryDetail.details.definitions.length);
  const exportedLibrary=await data('forge_library_export',{pageId,key:libraryList.items[0].key}),exportedPack=await readResourcePack(await readFile(exportedLibrary.file));assert.equal(exportedPack.payload.root.type,libraryList.items[0].builtin);exportedPack.rollback();assert.deepEqual(state,initial);
  const createdResource=await data('forge_library_create',{pageId,inputFile:resolve('skills/texture-forge-author/references/example.graphic.json'),expectedLibraryRevision:libraryList.revision});assert.equal(createdResource.applied,true);assert.equal(localEntries.length,1);assert.deepEqual(state,initial);
  const localList=await data('forge_library',{pageId,source:'local'});assert.equal(localList.total,1);assert.equal(localList.items[0].key,createdResource.key);
  assert.equal((await call('forge_library_delete',{pageId,key:createdResource.key,expectedLibraryRevision:libraryList.revision})).isError,true);assert.equal(localEntries.length,1);
  assert.equal((await call('forge_library_delete',{pageId,key:libraryList.items[0].key,expectedLibraryRevision:localList.revision})).isError,true);
  await data('forge_library_export',{pageId,key:createdResource.key});await data('forge_library_delete',{pageId,key:createdResource.key,expectedLibraryRevision:localList.revision});assert.equal(localEntries.length,0);assert.deepEqual(state,initial);
  const publish=await data('forge_library_save_node',{snapshotId:initialSnapshot.snapshotId,nodeId:'@root',name:'Whole canvas',expectedLibraryRevision:(await data('forge_library',{pageId})).revision});assert.equal(publish.entry.kind,'composition');assert.deepEqual(state,initial);
  const updated=await data('forge_library_update',{pageId,key:publish.key,inputFile:resolve('skills/texture-forge-author/references/example.generator.json'),expectedLibraryRevision:(await data('forge_library',{pageId})).revision});assert.equal(updated.entry.resourceId,publish.entry.resourceId);assert.equal(updated.entry.versionId,2);assert.equal(updated.entry.generator,true);assert.equal(localEntries.length,1);assert.deepEqual(state,initial);
  await data('forge_library_delete',{pageId,key:updated.key,expectedLibraryRevision:(await data('forge_library',{pageId})).revision});
  const backup=await data('forge_library_export_batch',{pageId,keys:libraryList.items.map(e=>e.key)});
  const imported=await data('forge_library_import',{pageId,inputFiles:[backup.file],expectedLibraryRevision:(await data('forge_library',{pageId})).revision});assert.equal(imported.entries.length,2);assert.deepEqual(state,initial);
  const repeated=await data('forge_library_import',{pageId,inputFiles:[backup.file],expectedLibraryRevision:(await data('forge_library',{pageId})).revision});assert.equal(repeated.applied,false);assert.equal(repeated.skipped.length,2);
  for(const entry of imported.entries)await data('forge_library_delete',{pageId,key:entry.key,expectedLibraryRevision:(await data('forge_library',{pageId})).revision});
  assert.equal((await data('forge_schema',{pageId})).editorControls.history,true);
  const nodeSchema=await data('forge_schema',{pageId,nodeId:state.root.children[0].id});assert.equal(nodeSchema.currentNode.id,state.root.children[0].id);assert.ok(nodeSchema.currentNode.density.parameters.length);
  const editResult=await data('forge_edit',{snapshotId:initialSnapshot.snapshotId,recipe:{schema:'momo.project-authoring/v1',operations:[{op:'patch-node',node:'@root',values:{name:'Edited root'}}]}});
  const edited=structuredClone(state),editedSnapshot=await data('forge_capture',{pageId}),editor=await data('forge_editor_state',{pageId});assert.equal(editor.history.undo,1);assert.equal(editResult.editRevision,editedSnapshot.editRevision);
  assert.equal((await call('forge_history',{snapshotId:editedSnapshot.snapshotId,action:'undo',expectedHistoryRevision:0})).isError,true);assert.deepEqual(state,edited);
  const undone=await data('forge_history',{snapshotId:editedSnapshot.snapshotId,action:'undo',expectedHistoryRevision:editor.history.revision});assert.equal(undone.applied,true);assert.deepEqual(state,initial);
  const undoSnapshot=await data('forge_capture',{pageId});await data('forge_history',{snapshotId:undoSnapshot.snapshotId,action:'redo',expectedHistoryRevision:undone.state.history.revision});assert.deepEqual(state,edited);
  const saved=await data('forge_project_save',{snapshotId:editedSnapshot.snapshotId,outputFile:resolve(dir,'saved.zip')});
  assert.deepEqual(await readFile(saved.file),await readFile(editedSnapshot.sourceProject));
  assert.equal((await call('forge_project_save',{snapshotId:editedSnapshot.snapshotId,outputFile:saved.file})).isError,true);
  await data('forge_project_save',{snapshotId:editedSnapshot.snapshotId,outputFile:saved.file,overwrite:true});
  assert.equal((await call('forge_project_save',{snapshotId:editedSnapshot.snapshotId,outputFile:'relative.zip'})).isError,true);
  const incoming=project();incoming.name='Opened ZIP';incoming.root.children=[node('shape','Star')];const inputFile=resolve(dir,'incoming.zip');await writeFile(inputFile,await encodeResourcePack(incoming));
  assert.equal((await call('forge_project_open',{snapshotId:initialSnapshot.snapshotId,inputFile})).isError,true);assert.deepEqual(state,edited);
  const current=await data('forge_capture',{pageId});allowImport=false;assert.equal((await call('forge_project_open',{snapshotId:current.snapshotId,inputFile})).isError,true);assert.deepEqual(state,edited);
  allowImport=true;const opened=await data('forge_project_open',{snapshotId:current.snapshotId,inputFile});assert.equal(opened.applied,true);assert.equal(opened.persisted,true);assert.equal(state.name,'Opened ZIP');assert.equal(state.root.children[0].type,'Star');
  const afterOpen=await data('forge_capture',{pageId});assert.equal(opened.editRevision,afterOpen.editRevision);await data('forge_history',{snapshotId:afterOpen.snapshotId,action:'undo',expectedHistoryRevision:historyRevision});assert.deepEqual(state,edited);
  const invalid=resolve(dir,'invalid.zip');await writeFile(invalid,'not a ZIP');assert.equal((await call('forge_project_open',{snapshotId:editedSnapshot.snapshotId,inputFile:invalid})).isError,true);
  assert.deepEqual(state,edited);
  const tutorial=await readFile('docs/examples/animation-star.json','utf8'),jsonFile=resolve(dir,'tutorial-without-json-extension.data');await writeFile(jsonFile,tutorial);
  allowImport=false;assert.equal((await call('forge_project_open',{snapshotId:editedSnapshot.snapshotId,inputFile:jsonFile})).isError,true);assert.deepEqual(state,edited);
  allowImport=true;const openedJSON=await data('forge_project_open',{snapshotId:editedSnapshot.snapshotId,inputFile:jsonFile});assert.equal(openedJSON.applied,true);assert.equal(openedJSON.persisted,true);assert.equal(state.name,JSON.parse(tutorial).name);
  const jsonSnapshot=await data('forge_capture',{pageId});assert.equal(openedJSON.editRevision,jsonSnapshot.editRevision);await data('forge_history',{snapshotId:jsonSnapshot.snapshotId,action:'undo',expectedHistoryRevision:historyRevision});assert.deepEqual(state,edited);
  for(const [name,content]of [['wrong-schema.json','{"schema":"other"}'],['null.json','null'],['oversized.json',' '.repeat(4000001)]]){
   const inputFile=resolve(dir,name);await writeFile(inputFile,content);assert.equal((await call('forge_project_open',{snapshotId:editedSnapshot.snapshotId,inputFile})).isError,true);assert.deepEqual(state,edited);
  }
  const densityNode=state.root.children[0].id;
  await data('forge_edit',{snapshotId:(await data('forge_capture',{pageId})).snapshotId,recipe:{schema:'momo.project-authoring/v1',operations:[{op:'set-density',node:densityNode,graphic:'Star',parameters:{starPoints:7}}]}});
  await data('forge_edit',{snapshotId:(await data('forge_capture',{pageId})).snapshotId,recipe:{schema:'momo.project-authoring/v1',operations:[{op:'set-density',node:densityNode,parameters:{starPoints:9}}]}});
  const densityReadback=await data('forge_schema',{pageId,nodeId:densityNode});assert.equal(densityReadback.currentNode.density.graphic,'Star');assert.equal(densityReadback.currentNode.density.parameters.find(p=>p.variable==='starPoints').value,9);
  const editList=async action=>data('forge_graphics_list_edit',{snapshotId:(await data('forge_capture',{pageId})).snapshotId,expectedListRevision:(await data('forge_graphics_list',{pageId})).revision,...action});
  const savedNode=await editList({action:'save-node',nodeId:densityNode,name:'Saved density circle'});assert.equal((await data('forge_graphics_list',{pageId})).total,1);
  const listDetail=await data('forge_graphics_list',{pageId,id:savedNode.entryId});assert.equal(listDetail.entry.root.name,'Saved density circle');
  const insertedNode=await editList({action:'insert-list',entryId:savedNode.entryId}),beforeRename=structuredClone(state.root.children.find(n=>n.id===insertedNode.nodeId));
  await editList({action:'rename',entryId:savedNode.entryId,name:'Renamed list entry'});assert.deepEqual(state.root.children.find(n=>n.id===insertedNode.nodeId),beforeRename);
  await editList({action:'remove',entryId:savedNode.entryId});assert.equal((await data('forge_graphics_list',{pageId})).total,0);assert.deepEqual(state.root.children.find(n=>n.id===insertedNode.nodeId),beforeRename);
 }finally{await connection.disconnect();await client.close();await app.close();}
});
