import test from 'node:test';
import assert from 'node:assert/strict';
import {animationWorkspaceSettings} from '../web/animation-workspace-controls.js';
import {project,node} from '../web/tree-model.js';
test('timeline controls validate all state before mutation and require local scope for nonlinear keys',()=>{
 const p=project(),n=p.root.children[0];n.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,1],[1,0]]};
 const base={scope:p.root.id,view:'keys',filter:'all',snap:'grid',zoom:1,start:0,selection:[],curvePath:null,folded:[],extraOpen:false};
 const next=animationWorkspaceSettings(base,{zoom:4,start:.25,snap:'frames',selection:[{id:n.id,path:'opacity',time:0}],curvePath:{id:n.id,path:'opacity'}},p.root);assert.equal(next.zoom,4);assert.equal(next.selection.length,1);
 const curve=animationWorkspaceSettings(next,{view:'curves'},p.root);assert.equal(curve.scope,n.id);assert.deepEqual(animationWorkspaceSettings(curve,{restore:base},p.root),base);
 assert.throws(()=>animationWorkspaceSettings(base,{zoom:2,start:.75},p.root));assert.throws(()=>animationWorkspaceSettings(base,{selection:[{id:n.id,path:'opacity',time:.5}]},p.root));
 n.timing.loop=true;assert.throws(()=>animationWorkspaceSettings(base,{selection:[{id:n.id,path:'opacity',time:0}]},p.root),/local/);
 assert.equal(animationWorkspaceSettings(base,{scope:n.id,selection:[{id:n.id,path:'opacity',time:0}]},p.root).selection.length,1);assert.equal(base.selection.length,0);
});
