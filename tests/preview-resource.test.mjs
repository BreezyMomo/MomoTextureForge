import test from 'node:test';
import assert from 'node:assert/strict';
import {previewResourceRoot} from '../web/preview-resource.js';
import {project,node} from '../web/tree-model.js';

test('a normal preview saves the complete canvas, independent of the selected node',()=>{
 const p=project(),first=node('shape','Circle'),second=node('shape','Ring');p.root.children=[first,second];assert.equal(previewResourceRoot(p),p.root);assert.equal(previewResourceRoot(p).children.length,2);const before=JSON.stringify(p);previewResourceRoot(p,{soloId:first.id});assert.equal(JSON.stringify(p),before);
});
test('solo preview saves only the visible node and keeps its editable descendants',()=>{
 const p=project(),group=node('group');group.children=[node('shape','Circle'),node('shape','Star')];group.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,0],[1,1]]};p.root.children=[group,node('shape','Ring')];assert.equal(previewResourceRoot(p,{soloId:group.id}),group);assert.equal(previewResourceRoot(p,{soloId:group.id}).children.length,2);assert.deepEqual(previewResourceRoot(p,{soloId:group.id}).tracks,group.tracks);
});
test('a resource trial saves the whole edited resource even when a child is selected',()=>{
 const p=project(),group=node('group');group.children=[node('shape','Circle'),node('shape','Ring')];p.root.children=[group];assert.equal(previewResourceRoot(p,{resourceEditing:true}),group);p.root.children.push(node('shape','Star'));assert.equal(previewResourceRoot(p,{resourceEditing:true}),p.root);
});
test('empty previews and missing solo targets fail without silently saving another scope',()=>{
 const p=project();p.root.children=[];assert.throws(()=>previewResourceRoot(p),e=>e.messageKey==='editor.addSomeContentNodesFirst');assert.throws(()=>previewResourceRoot(p,{soloId:'missing'}),e=>e.messageKey==='unified.resourceMissing');
});
