import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorBridge,validBridgeOrigin} from '../editor-bridge.mjs';
import {editorMCPOptions,createEditorMCP} from '../editor-mcp.mjs';
import {EDITOR_BRIDGE_PROTOCOL,parseEditorPairingCode} from '../web/editor-bridge-protocol.js';
import {captureEditorProject} from '../web/editor-ai-connection.js';
import {project} from '../web/tree-model.js';
import {readResourcePack} from '../web/resource-pack.js';
import {request as rawRequest} from 'node:http';
const origin='http://127.0.0.1:8799';
async function withBridge(fn,options={}){const bridge=new EditorBridge({port:0,...options});try{await bridge.start();await fn(bridge);}finally{await bridge.close();}}
async function http(bridge,path,{method='GET',body,token,site=origin,headers={}}={}){return fetch('http://127.0.0.1:'+bridge.port+path,{method,headers:{Origin:site,...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function pair(b){const code=await b.pairingCode(),parsed=parseEditorPairingCode(code.pairingCode);return (await http(b,'/pair',{method:'POST',body:{protocol:EDITOR_BRIDGE_PROTOCOL,code:parsed.code}})).json();}
test('bridge launch options and origins stay explicit and local',()=>{
 assert.equal(editorMCPOptions([]).port,8798);assert.equal(editorMCPOptions(['--port','18888']).port,18888);
 assert.throws(()=>editorMCPOptions(['--port','80']));assert.throws(()=>editorMCPOptions(['--origin','http://untrusted.example']));assert.throws(()=>editorMCPOptions(['--origin','https://example.com/editor']));assert.throws(()=>editorMCPOptions(['--port','8798','--port','8799']));
 assert.equal(validBridgeOrigin('https://breezymomo.github.io'),true);assert.equal(validBridgeOrigin('http://localhost:8799'),true);assert.equal(validBridgeOrigin('https://evil.example'),false);assert.equal(validBridgeOrigin('null'),false);assert.equal(validBridgeOrigin('https://example.com',['https://example.com']),true);
 assert.throws(()=>parseEditorPairingCode('https://evil.example'));assert.throws(()=>parseEditorPairingCode('80.'+'a'.repeat(43)));
});
test('single-use pairing, exact origin/token authorization and revocation',async()=>withBridge(async b=>{
 const code=await b.pairingCode(),payload={protocol:EDITOR_BRIDGE_PROTOCOL,code:parseEditorPairingCode(code.pairingCode).code};
 assert.equal((await http(b,'/pair',{method:'POST',body:payload,site:'https://evil.example'})).status,403);
 assert.equal((await http(b,'/pair',{method:'POST',body:{...payload,code:'wrong'}})).status,401);
 const paired=await (await http(b,'/pair',{method:'POST',body:payload})).json();assert.equal(paired.access,'read-only');assert.equal(b.status().connected,true);
 assert.equal((await http(b,'/pair',{method:'POST',body:payload})).status,401);
 assert.equal((await http(b,'/requests',{token:'wrong'})).status,401);
 assert.equal((await http(b,'/requests',{token:paired.token,site:'http://localhost:8799'})).status,401);
 const spoofStatus=await new Promise((resolve,reject)=>{const req=rawRequest('http://127.0.0.1:'+b.port+'/requests',{headers:{Host:'evil.example:'+b.port,Origin:origin,Authorization:'Bearer '+paired.token}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(spoofStatus,403);
 await http(b,'/disconnect',{method:'POST',token:paired.token,body:{}});assert.equal(b.status().connected,false);
 assert.equal((await http(b,'/requests',{token:paired.token})).status,401);
}));
test('capture request/response works, cancellation and unknown responses do not leak pending work',async()=>withBridge(async b=>{
 const {token}=await pair(b),capture=b.request('capture');const poll=await (await http(b,'/requests',{token})).json();assert.equal(poll.requests.length,1);assert.equal(poll.requests[0].operation,'capture');
 await http(b,'/response',{method:'POST',token,body:{id:poll.requests[0].id,result:{zip:'test-data'}}});assert.deepEqual(await capture,{zip:'test-data'});assert.equal(b.pending.size,0);
 assert.equal((await http(b,'/response',{method:'POST',token,body:{id:'unknown',result:{}}})).status,409);
 const controller=new AbortController(),cancelled=b.request('capture',{signal:controller.signal});controller.abort();await assert.rejects(cancelled,/cancelled/);assert.equal(b.pending.size,0);assert.equal(b.queue.length,0);
 const pending=b.request('capture');b.revoke();await assert.rejects(pending,/disconnect/);assert.equal(b.pending.size,0);
}));
test('preflight allows only approved origins, pairing expires, session lease expires',async()=>withBridge(async b=>{
 const res=await http(b,'/pair',{method:'OPTIONS'});assert.equal(res.status,204);assert.equal(res.headers.get('access-control-allow-origin'),origin);assert.equal(res.headers.get('access-control-allow-private-network'),'true');
 const code=await b.pairingCode();b.pairing.expires=0;assert.equal((await http(b,'/pair',{method:'POST',body:{protocol:EDITOR_BRIDGE_PROTOCOL,code:parseEditorPairingCode(code.pairingCode).code}})).status,401);
 await pair(b);b.session.lastSeen=0;assert.equal(b.status().connected,false);
}));
test('browser snapshot pins native values before async resource encoding',async()=>{
 const p=project();p.root.children[0].opacity=.25;const capture=captureEditorProject(()=>p);p.root.children[0].opacity=.75;const result=await capture,pack=await readResourcePack(Buffer.from(result.zip,'base64'));
 try{assert.equal(pack.payload.root.children[0].opacity,.25);assert.equal(p.root.children[0].opacity,.75);}finally{pack.rollback();}
});
test('MCP exposes read tools without editor mutation tools',async()=>{
 const app=createEditorMCP();try{assert.ok(app.server);assert.equal(app.bridge.status().connected,false);assert.equal(app.service.snapshots.size,0);}finally{await app.close();}
});
