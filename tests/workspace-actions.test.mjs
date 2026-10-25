import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceActions} from '../web/workspace-actions.js';
import {sanitizeLayoutSettings,panelStack,findLayoutNode} from '../web/dock-layout.js';
import {validateEditorSettings} from '../web/editor-preferences.js';
import {createLiveAuthoring} from '../web/editor-live-authoring.js';

test('workspace transactions preserve panels, resize and restore complete named layouts',()=>{
 const original=sanitizeLayoutSettings(null),before=structuredClone(original);
 let next=workspaceActions(original,[{action:'preset',preset:'animation'},{action:'save',name:'Animation'},{action:'float',panel:'inspector',rect:{x:.1,y:.1,w:.4,h:.5}}]);
 assert.deepEqual(original,before);assert.equal(next.named.length,1);assert.equal(next.current.floats.length,1);
 const splitId=next.current.root.id;
 next=workspaceActions(next,[{action:'move-float',id:next.current.floats[0].id,rect:{x:.2,y:.1,w:.5,h:.6}},{action:'dock',panel:'inspector',target:'root',edge:'right'},{action:'resize',id:next.current.root.id,ratio:.65}]);
 assert.equal(next.current.floats.length,0);assert.equal(findLayoutNode(next.current,splitId).ratio,.65);assert.ok(panelStack(next.current,'inspector'));
 const restored=workspaceActions(next,[{action:'restore',settings:original}]);assert.deepEqual(restored,original);
 assert.throws(()=>workspaceActions(next,[{action:'hide',panel:'nodes'},{action:'save',name:'Animation'}]),/overwrite/);assert.ok(panelStack(next.current,'nodes'));
 const ops=Array.from({length:13},(_,i)=>({action:'save',name:'Layout '+i}));assert.throws(()=>workspaceActions(original,ops),/12 named/);assert.deepEqual(original,before);
 assert.throws(()=>workspaceActions(original,[{action:'dock',panel:'nodes',target:'missing',edge:'left'}]),/target/);
});
test('workspace edits reject stale revisions and leave canvas/history outside the transaction',async()=>{
 let settings=sanitizeLayoutSettings(null);const run=createLiveAuthoring({getProject:()=>{throw Error('Canvas must not be accessed');},getWorkspace:()=>structuredClone(settings),controlWorkspace:ops=>{settings=workspaceActions(settings,ops);}});
 const first=await run('workspace-state');const next=await run('workspace-edit',{expectedWorkspaceRevision:first.revision,operations:[{action:'preset',preset:'focus'}]});assert.notEqual(next.revision,first.revision);
 await assert.rejects(run('workspace-edit',{expectedWorkspaceRevision:first.revision,operations:[{action:'preset',preset:'default'}]}));
 await assert.rejects(run('workspace-edit',{expectedWorkspaceRevision:next.revision,operations:[{action:'preset',preset:'default'}]},()=>false));assert.deepEqual(settings,next.settings);
});
test('preview and appearance settings reject unknown keys, invalid enums and non-finite coordinates',()=>{
 for(const changes of [{language:'xx'},{appearance:{theme:'system'}},{appearance:{colors:{danger:'#123456'}}},{effect:{brightness:4}},{effect:{blend:'unknown'}},{material:{orbit:[0,1.5]}},{material:{tiling:1.5}},{material:{model:NaN}},{material:{arbitrary:true}}])assert.throws(()=>validateEditorSettings(changes));
 validateEditorSettings({language:'en',appearance:{theme:'xuanhei',colors:{action:null}},material:{model:2,orbit:[1,-1.4]},effect:{color:'#123456',brightness:3}});
});
