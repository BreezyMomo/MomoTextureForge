import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectorPreferenceChanges} from '../web/inspector-preferences.js';
import {inspectorSectionState} from '../web/inspector-sections.js';
import {nodeShortcutState} from '../web/node-shortcuts.js';
test('native inspector preferences validate atomically, preserve scoped expansion and global pin exceptions',()=>{
 const base={tab:'shape',primaryOnly:false,sections:inspectorSectionState().snapshot(),shortcuts:nodeShortcutState().snapshot()},context={nodeIds:['a','b'],order:['modules.shapeParameters','editor.nodeColors'],modules:[{key:'modules.shapeParameters',scope:'modules.shapeParameters:Circle',open:true},{key:'editor.nodeColors',scope:'editor.nodeColors',open:true}]};
 const changed=inspectorPreferenceChanges(base,{expanded:[{key:'modules.shapeParameters',open:false}],order:[...context.order].reverse(),pins:[{key:'editor.nodeColors',pinned:true,allNodes:true},{nodeId:'a',key:'editor.nodeColors',pinned:false}]},context);
 assert.equal(changed.sections.expanded['modules.shapeParameters:Circle'],false);assert.deepEqual(changed.sections.orders.shape,[...context.order].reverse());assert.deepEqual(changed.shortcuts.defaults,['editor.nodeColors']);assert.deepEqual(changed.shortcuts.nodes.a.hidden,['editor.nodeColors']);
 assert.deepEqual(inspectorPreferenceChanges(changed,{restore:base},context),base);
 const before=JSON.stringify(changed);assert.throws(()=>inspectorPreferenceChanges(changed,{pins:[{key:'editor.opacity',pinned:true,allNodes:true},{nodeId:'missing',key:'editor.opacity',pinned:true}]},context));assert.equal(JSON.stringify(changed),before);
 assert.throws(()=>inspectorPreferenceChanges(base,{order:[context.order[0],context.order[0]]},context));assert.throws(()=>inspectorPreferenceChanges(base,{tab:'layout',expanded:[{key:'modules.shapeParameters',open:false}]},context));
 assert.throws(()=>inspectorPreferenceChanges(base,{restore:{...base,sections:{expanded:{bad:'true'},orders:{}}}},context));
});
