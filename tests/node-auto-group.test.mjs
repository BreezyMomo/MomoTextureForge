import test from 'node:test';
import assert from 'node:assert/strict';
import {project,node,find} from '../web/tree-model.js';
import {groupWithTarget} from '../web/tree-selection.js';

test('automatic grouping preserves sibling order and node data with a neutral group',()=>{
 const p=project(),a=node(),b=node(),c=node();a.name='A';b.name='B';c.name='C';a.transform.x=.2;b.opacity=.4;p.root.children=[a,b,c];const before=structuredClone([a,b]);
 const id=groupWithTarget(p.root,[a.id],b.id,'Group');assert.equal(p.root.children[0].id,id);assert.deepEqual(p.root.children[0].children,before);assert.equal(p.root.children[1],c);assert.equal(p.root.children[0].boundary,'visible');assert.equal(p.root.children[0].color.mode,'preserve');
});
test('automatic grouping handles a selected forest from multiple parents only once',()=>{
 const p=project(),a=node('group'),child=node(),b=node(),target=node(),holder=node('group');a.children=[child];holder.children=[b];p.root.children=[a,holder,target];const id=groupWithTarget(p.root,[a.id,child.id,b.id],target.id);const group=find(p.root,id).node;
 assert.deepEqual(group.children.map(n=>n.id),[a.id,b.id,target.id]);assert.equal(holder.children.length,0);assert.equal(a.children[0],child);
});
test('automatic grouping rejects self, descendant and mask targets before mutating',()=>{
 const p=project(),a=node('group'),child=node(),mask=node();a.children=[child];a.mask=mask;p.root.children=[a];
 for(const [ids,target]of [[[a.id],child.id],[[child.id],child.id],[[child.id],mask.id],[[child.id],a.id],[[],child.id]]){const before=structuredClone(p);assert.throws(()=>groupWithTarget(p.root,ids,target));assert.deepEqual(p,before);}
});
