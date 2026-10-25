import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createEditorMCP} from '../editor-mcp.mjs';
import {createEditorAIConnection} from '../web/editor-ai-connection.js';
import {createLiveAuthoring} from '../web/editor-live-authoring.js';
import {applyProjectRecipe,RECIPE_SCHEMA} from '../web/project-authoring.js';
import {RECIPE_LIMITS} from '../web/project-authoring-contract.js';

test('real HTTP SDK accepts the reported full-node recipe and switches graphics without replacing IDs',async()=>{
 let state=applyProjectRecipe(null,{schema:RECIPE_SCHEMA,operations:[{op:'add-node',id:'original-heart',graphic:'HeartLeafTeardrop'}]}).project,commits=0;
 const app=createEditorMCP({port:0,outputDir:resolve('test-results/editor-mcp-authoring'),
  // Only snapshot inspection/rendering is stubbed; the SDK, HTTP bridge, page
  // connection, recipe validator and native editing engine all execute for real.
  runBrowser:async()=>({ok:true,brief:{name:state.name,output:state.output,nodes:[],resources:[]}})});
 await app.start();
 const serviceOrigin='http://127.0.0.1:'+app.bridge.port,client=new Client({name:'authoring-regression',version:'1'});
 const connection=createEditorAIConnection({getProject:()=>state,onOperation:createLiveAuthoring({getProject:()=>state,commitProject:p=>{state=p;commits++;}}),serviceOrigin,
  fetch:(url,options)=>fetch(url,{...options,headers:{...options.headers,Origin:'http://127.0.0.1:18889'}})});
 try{
  await connection.connect();await client.connect(new StreamableHTTPClientTransport(new URL(serviceOrigin+'/mcp'),{requestInit:{headers:{Authorization:'Bearer '+app.bridge.agentToken}}}));
  const call=(name,args)=>client.callTool({name,arguments:args});
  const data=async(name,args)=>{const result=await call(name,args);assert.ok(!result.isError,result.content?.[0]?.text);return result.structuredContent;};
  const pageId=connection.status.pageId,initial=await data('forge_capture',{pageId});
  const fullRecipe=JSON.parse(await readFile(new URL('./fixtures/editor-mcp-full-node-recipe.json',import.meta.url),'utf8'));
  let count=0;const stack=[fullRecipe];while(stack.length){const value=stack.pop();if(value&&typeof value==='object'){const children=Object.values(value);count+=children.length;stack.push(...children);}}
  assert.ok(count>128);assert.equal((await data('forge_edit',{snapshotId:initial.snapshotId,recipe:fullRecipe})).applied,true);assert.equal(commits,1);
  assert.equal(state.root.children.length,1);assert.equal(state.root.children[0].id,'replacement-star');assert.equal(state.root.children[0].postEffects.sketch.fillColor,'#ff0000');
  const current=await data('forge_capture',{pageId}),before=structuredClone(state.root.children[0]);
  const changed=await data('forge_edit',{snapshotId:current.snapshotId,recipe:{schema:RECIPE_SCHEMA,operations:[{op:'set-graphic',node:'replacement-star',graphic:'HeartLeafTeardrop'}]}});
  assert.equal(state.root.children[0].id,before.id);assert.equal(state.root.children[0].type,'HeartLeafTeardrop');assert.deepEqual(state.root.children[0].postEffects,before.postEffects);assert.equal(changed.graphicChanges[0].from,'Star');assert.equal(commits,2);
  const fresh=await data('forge_capture',{pageId}),saved=JSON.stringify(state);
  for(const recipe of [
   {schema:RECIPE_SCHEMA,operations:Array(RECIPE_LIMITS.operations+1).fill({op:'set-project',name:'x'})},
   {schema:RECIPE_SCHEMA,operations:[],name:'x'.repeat(RECIPE_LIMITS.bytes)},
   {schema:RECIPE_SCHEMA,operations:[],values:Array(RECIPE_LIMITS.elements).fill(0)},
  ]){const rejected=await call('forge_edit',{snapshotId:fresh.snapshotId,recipe});assert.equal(rejected.isError,true);assert.match(rejected.content[0].text,/maximum|at most/);}
  let deep={};for(let i=0;i<40;i++)deep={child:deep};assert.equal((await call('forge_edit',{snapshotId:fresh.snapshotId,recipe:{schema:RECIPE_SCHEMA,operations:[],deep}})).isError,true);
  const large=await call('forge_edit',{snapshotId:fresh.snapshotId,recipe:{schema:RECIPE_SCHEMA,operations:[],values:Array(66000).fill(0)}});assert.equal(large.isError,true);assert.match(large.content[0].text,/65536/);
  assert.equal(JSON.stringify(state),saved);assert.equal(commits,2);
  const oversized=await fetch(serviceOrigin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+app.bridge.agentToken,'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'tools/call',id:999,params:{name:'forge_edit',arguments:{snapshotId:fresh.snapshotId,recipe:{schema:RECIPE_SCHEMA,operations:[],name:'x'.repeat(1024*1024)}}}})});
  assert.equal(oversized.status,400);assert.equal(commits,2);
 }finally{await connection.disconnect();await client.close();await app.close();}
});
