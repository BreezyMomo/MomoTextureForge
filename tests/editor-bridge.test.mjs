import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorBridge,validBridgeOrigin} from '../editor-bridge.mjs';
import {editorMCPOptions,createEditorMCP,editorAgentToken} from '../editor-mcp.mjs';
import {EDITOR_BRIDGE_PROTOCOL} from '../web/editor-bridge-protocol.js';
import {captureEditorProject,createEditorAIConnection} from '../web/editor-ai-connection.js';
import {project} from '../web/tree-model.js';
import {readResourcePack} from '../web/resource-pack.js';
import {request as rawRequest} from 'node:http';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const origin='http://127.0.0.1:8799';
async function withBridge(fn,options={}){const bridge=new EditorBridge({port:0,...options});try{await bridge.start();await fn(bridge);}finally{await bridge.close();}}
async function http(bridge,path,{method='GET',body,token,site=origin,headers={}}={}){return fetch('http://127.0.0.1:'+bridge.port+path,{method,headers:{...(site?{Origin:site}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function register(b,name='Work'){return (await http(b,'/pages',{method:'POST',body:{protocol:EDITOR_BRIDGE_PROTOCOL,name}})).json();}
const pagePath=(page,action)=>'/pages/'+page.pageId+'/'+action;

test('bridge launch options and origins stay explicit and local',()=>{
 assert.equal(editorMCPOptions([]).port,8798);assert.equal(editorMCPOptions(['--port','18888']).port,18888);
 for(const args of [['--port','80'],['--origin','http://untrusted.example'],['--origin','https://example.com/editor'],['--port','8798','--port','8799']])assert.throws(()=>editorMCPOptions(args));
 assert.equal(validBridgeOrigin('https://breezymomo.github.io'),true);assert.equal(validBridgeOrigin('http://localhost:8799'),true);assert.equal(validBridgeOrigin('https://evil.example'),false);assert.equal(validBridgeOrigin('null'),false);assert.equal(validBridgeOrigin('https://example.com',['https://example.com']),true);
});
test('registration requires approved Origin/Host and JSON; page credentials cannot impersonate another page',async()=>withBridge(async b=>{
 assert.equal((await http(b,'/pages',{method:'POST',body:{},site:'https://evil.example'})).status,403);
 assert.equal((await http(b,'/pages',{method:'POST',body:{},site:null})).status,403);
 assert.equal((await http(b,'/pages',{method:'POST',body:{protocol:'old'}})).status,400);
 assert.equal((await http(b,'/pages',{method:'POST',body:{protocol:EDITOR_BRIDGE_PROTOCOL},headers:{'Content-Type':'text/plain'}})).status,400);
 const a=await register(b,'A'),c=await register(b,'B');assert.equal(b.status().pages.length,2);
 assert.equal((await http(b,pagePath(c,'requests'),{token:a.token})).status,401);
 assert.equal((await http(b,pagePath(a,'requests'),{token:a.token,site:'http://localhost:8799'})).status,401);
 const spoof=await new Promise((done,fail)=>{const req=rawRequest('http://127.0.0.1:'+b.port+'/health',{headers:{Host:'evil.example:'+b.port,Origin:origin}},res=>{res.resume();done(res.statusCode);});req.on('error',fail);req.end();});assert.equal(spoof,403);
 const health=await (await http(b,'/health')).json();assert.deepEqual(Object.keys(health).sort(),['access','protocol']);
 assert.equal((await http(b,'/mcp',{method:'POST',body:{},token:a.token,site:null})).status,401);
 await http(b,pagePath(a,'disconnect'),{method:'POST',token:a.token,body:{}});
 assert.equal(b.status(a.pageId).connected,false);assert.equal(b.status(c.pageId).connected,true);
}));
test('queues, responses, cancellation and revocation are scoped to one page',async()=>withBridge(async b=>{
 const a=await register(b,'A'),c=await register(b,'B'),one=b.request(a.pageId,'capture'),two=b.request(c.pageId,'capture');
 const pollA=await (await http(b,pagePath(a,'requests'),{token:a.token})).json(),pollB=await (await http(b,pagePath(c,'requests'),{token:c.token})).json();
 assert.equal(pollA.requests.length,1);assert.notEqual(pollA.requests[0].id,pollB.requests[0].id);
 assert.equal((await http(b,pagePath(c,'response'),{method:'POST',token:c.token,body:{id:pollA.requests[0].id,result:{wrong:true}}})).status,409);
 await http(b,pagePath(a,'response'),{method:'POST',token:a.token,body:{id:pollA.requests[0].id,result:{zip:'A'}}});assert.deepEqual(await one,{zip:'A'});
 const rejected=assert.rejects(two,/disconnect/);b.revoke(c.pageId);await rejected;assert.equal(b.status(a.pageId).connected,true);
 const controller=new AbortController(),cancelled=b.request(a.pageId,'capture',{signal:controller.signal});controller.abort();await assert.rejects(cancelled,/cancelled/);assert.equal(b.pages.get(a.pageId).pending.size,0);assert.equal(b.pages.get(a.pageId).queue.length,0);
}));

test('write requests require an editing page and carry their deadline and arguments',async()=>withBridge(async b=>{
 const readonly=await register(b);await assert.rejects(b.request(readonly.pageId,'edit'),/not enabled editing/);
 const writable=await (await http(b,'/pages',{method:'POST',body:{protocol:EDITOR_BRIDGE_PROTOCOL,access:'read-write',name:'Writable'}})).json();
 const args={expectedRevision:'revision',recipe:{operations:[]}},pending=b.request(writable.pageId,'edit',{args});
 const {requests}=await (await http(b,pagePath(writable,'requests'),{token:writable.token})).json();
 assert.deepEqual(requests[0].args,args);assert.ok(requests[0].expiresAt>Date.now());assert.equal(b.status(writable.pageId).access,'read-write');
 await http(b,pagePath(writable,'response'),{method:'POST',token:writable.token,body:{id:requests[0].id,result:{applied:true}}});assert.equal((await pending).applied,true);
}));
test('preflight, heartbeat expiry and page limits',async()=>withBridge(async b=>{
 const res=await http(b,'/pages',{method:'OPTIONS'});assert.equal(res.status,204);assert.equal(res.headers.get('access-control-allow-origin'),origin);assert.equal(res.headers.get('access-control-allow-private-network'),'true');
 const a=await register(b),c=await register(b);b.pages.get(a.pageId).lastSeen=0;
 assert.equal(b.status(a.pageId).connected,false);assert.equal(b.status(c.pageId).connected,true);
 for(let i=1;i<16;i++)await register(b);assert.equal((await http(b,'/pages',{method:'POST',body:{protocol:EDITOR_BRIDGE_PROTOCOL}})).status,429);
}));

test('delivered long operations retain the page lease only until their bounded deadline',async()=>withBridge(async b=>{
 const page=await register(b),pending=b.request(page.pageId,'capture',{timeout:1000}),{requests}=await (await http(b,pagePath(page,'requests'),{token:page.token})).json();
 b.pages.get(page.pageId).lastSeen=0;assert.equal(b.status(page.pageId).connected,true);
 await http(b,pagePath(page,'response'),{method:'POST',token:page.token,body:{id:requests[0].id,result:{done:true}}});assert.deepEqual(await pending,{done:true});
 const queued=b.request(page.pageId,'capture'),queuedRejected=assert.rejects(queued,/expired/);b.pages.get(page.pageId).lastSeen=0;b.expire();await queuedRejected;assert.equal(b.status(page.pageId).connected,false);
 const timed=await register(b),waiting=b.request(timed.pageId,'capture',{timeout:1000}),rejected=assert.rejects(waiting,/expired/);const polled=await (await http(b,pagePath(timed,'requests'),{token:timed.token})).json();
 b.pages.get(timed.pageId).lastSeen=0;b.pages.get(timed.pageId).pending.get(polled.requests[0].id).expiresAt=0;b.expire();await rejected;assert.equal(b.status(timed.pageId).connected,false);
 const disconnected=await register(b),active=b.request(disconnected.pageId,'capture'),aborted=assert.rejects(active,/disconnect/);await http(b,pagePath(disconnected,'requests'),{token:disconnected.token});b.pages.get(disconnected.pageId).lastSeen=0;
 await http(b,pagePath(disconnected,'disconnect'),{method:'POST',token:disconnected.token,body:{}});await aborted;assert.equal(b.status(disconnected.pageId).connected,false);
}));

test('real browser polling adapter completes work longer than its idle lease and resumes polling',async()=>{
 const b=new EditorBridge({port:0,leaseMs:80});await b.start();let started;const began=new Promise(resolve=>{started=resolve;});
 const connection=createEditorAIConnection({getProject:()=>({name:'Long import'}),onOperation:async(op,args,isActive)=>{started();await new Promise(resolve=>setTimeout(resolve,240));assert.equal(isActive(),true);return {applied:true};},serviceOrigin:'http://127.0.0.1:'+b.port,fetch:(url,options)=>fetch(url,{...options,headers:{...options.headers,Origin:origin}})});
 try{await connection.connect();const id=connection.status.pageId,result=b.request(id,'library-import',{timeout:1000});await began;await new Promise(resolve=>setTimeout(resolve,120));assert.equal(b.status(id).connected,true);assert.equal((await result).applied,true);assert.equal(b.status(id).connected,true);}finally{await connection.disconnect();await b.close();}
});
test('browser snapshot pins native values before async resource encoding',async()=>{
 const p=project();p.root.children[0].opacity=.25;const capture=captureEditorProject(()=>p);p.root.children[0].opacity=.75;const result=await capture,pack=await readResourcePack(Buffer.from(result.zip,'base64'));
 try{assert.equal(pack.payload.root.children[0].opacity,.25);assert.equal(p.root.children[0].opacity,.75);}finally{pack.rollback();}
});
test('persistent shared credential is stable across concurrent starts and restarts',async()=>{
 await mkdir('test-results/editor-bridge',{recursive:true});const dir=await mkdtemp(resolve('test-results/editor-bridge/token-'));
 const tokens=await Promise.all([editorAgentToken(dir),editorAgentToken(dir),editorAgentToken(dir)]);assert.equal(new Set(tokens).size,1);assert.equal(await editorAgentToken(dir),tokens[0]);assert.equal(tokens[0].length,43);
});
test('two real HTTP SDK agents share pages; capture requires an explicit page and disconnect invalidates only its snapshots',async()=>{
 const app=createEditorMCP({port:0,outputDir:resolve('test-results/editor-bridge/snapshots'),runBrowser:async()=>({ok:true,brief:{name:'Fixture',output:{seconds:2},nodes:[],resources:[],canvas:{},timing:{},contracts:{}}})});await app.start();
 const clients=[new Client({name:'agent-a',version:'1'}),new Client({name:'agent-b',version:'1'})],b=app.bridge;
 try{
  const url=new URL('http://127.0.0.1:'+b.port+'/mcp');
  for(const client of clients)await client.connect(new StreamableHTTPClientTransport(url,{requestInit:{headers:{Authorization:'Bearer '+b.agentToken}}}));
  const names=(await clients[0].listTools()).tools.map(t=>t.name).sort();assert.deepEqual(names,['forge_capture','forge_catalog','forge_edit','forge_guide','forge_inspect','forge_pages','forge_render','forge_resource','forge_schema','forge_status','forge_editor_state','forge_history','forge_project_open','forge_project_save','forge_library','forge_library_export','forge_library_aliases','forge_help','forge_timeline','forge_timeline_edit','forge_list_view','forge_list_view_edit','forge_inspector','forge_inspector_edit','forge_directory_open','forge_directory','forge_remote_job','forge_remote','forge_remote_edit','forge_component','forge_component_edit','forge_preview_capture','forge_workspace','forge_workspace_edit','forge_examples','forge_example_open','forge_project_share','forge_deliver','forge_editor_control','forge_export_start','forge_export_job','forge_library_process_image','forge_library_edit_resource','forge_library_export_batch','forge_library_import','forge_library_create','forge_library_update','forge_library_save_node','forge_library_delete','forge_graphics_list','forge_graphics_list_edit','forge_graphics_list_batch','forge_graphics_list_job'].sort());
  const a=await register(b,'A'),c=await register(b,'B');
  const call=(client,name,args={})=>client.callTool({name,arguments:args});
  const pages=await Promise.all(clients.map(client=>call(client,'forge_pages')));for(const result of pages)assert.equal(result.structuredContent.pages.length,2);
  assert.equal((await call(clients[0],'forge_capture')).isError,true);
  async function capture(client,page){
   const pending=call(client,'forge_capture',{pageId:page.pageId});
   const {requests}=await (await http(b,pagePath(page,'requests'),{token:page.token})).json();
   await http(b,pagePath(page,'response'),{method:'POST',token:page.token,body:{id:requests[0].id,result:{protocol:EDITOR_BRIDGE_PROTOCOL,zip:Buffer.from('PKtest').toString('base64'),createdAt:new Date().toISOString()}}});
   const result=await pending;assert.ok(!result.isError,result.content[0].text);return result.structuredContent;
  }
  const [first,second]=await Promise.all([capture(clients[0],a),capture(clients[1],c)]);
  assert.equal(first.pageId,a.pageId);assert.equal(second.pageId,c.pageId);
  await clients[0].close();assert.equal((await call(clients[1],'forge_pages')).structuredContent.pages.length,2);
  b.revoke(a.pageId);assert.equal((await call(clients[1],'forge_inspect',{snapshotId:first.snapshotId})).isError,true);
  assert.ok(!(await call(clients[1],'forge_inspect',{snapshotId:second.snapshotId})).isError);
  b.pages.get(c.pageId).lastSeen=0;b.status();assert.equal(app.service.snapshots.size,0);
 }finally{await Promise.all(clients.map(c=>c.close()));await app.close();}
});
test('browser connection is explicit and can reconnect after service restart',async()=>{
 const b=new EditorBridge({port:0});await b.start();const p=project();
 const connection=createEditorAIConnection({getProject:()=>p,serviceOrigin:'http://127.0.0.1:'+b.port,fetch:(url,options)=>fetch(url,{...options,headers:{...options.headers,Origin:origin}})});
 try{
  assert.equal(b.status().pages.length,0);await connection.connect();const first=connection.status.pageId;assert.equal(b.status().pages.length,1);
  await connection.connect();assert.equal(connection.status.pageId,first);
  await connection.disconnect();assert.equal(b.status().pages.length,0);
  await connection.connect();assert.notEqual(connection.status.pageId,first);
  await b.close();for(let i=0;i<100&&connection.status.state!=='disconnected';i++)await new Promise(done=>setTimeout(done,10));assert.equal(connection.status.state,'disconnected');
  await b.start();await connection.connect();assert.equal(connection.status.state,'connected');assert.equal(b.status().pages.length,1);
 }finally{await connection.disconnect();await b.close();}
});
test('disconnect while capture is saving cannot resurrect a revoked snapshot',async()=>{
 const app=createEditorMCP({port:0});await app.start();
 try{
  const page=await register(app.bridge),folder=resolve('test-results/editor-bridge/disconnect-race');await mkdir(folder,{recursive:true});
  let entered,release;const started=new Promise(done=>entered=done),gate=new Promise(done=>release=done);
  app.service.directory=()=>{entered();return gate;};
  app.bridge.request=async()=>({protocol:EDITOR_BRIDGE_PROTOCOL,zip:Buffer.from('PKtest').toString('base64'),createdAt:new Date().toISOString()});
  let rendered=false;app.service.runBrowser=async()=>{rendered=true;throw Error('Must not render a disconnected capture');};
  const pending=app.service.capture({pageId:page.pageId}),rejected=assert.rejects(pending,/disconnected/);
  await started;app.bridge.revoke(page.pageId);release(folder);await rejected;assert.equal(rendered,false);assert.equal(app.service.snapshots.size,0);
 }finally{await app.close();}
});
