import {messageError} from './message-catalog.js';
import {find,walk,cloneNode,removeNode,node} from './tree-model.js';

// Operations act on a forest: an explicitly selected descendant of a selected
// ancestor is highlighted, but must never be transformed or copied twice.
export function selectionRoots(root,ids){
 const set=new Set(ids),out=[];
 walk(root,n=>{if(n===root||!set.has(n.id))return;let p=find(root,n.id)?.parent;while(p){if(set.has(p.id))return;p=find(root,p.id)?.parent;}out.push(n);});return out;
}
export function rangeSelection(order,anchor,id){const a=order.indexOf(anchor),b=order.indexOf(id);return a<0||b<0?[id]:order.slice(Math.min(a,b),Math.max(a,b)+1);}
export function duplicateSelection(root,ids){
 const copies=[];for(const n of selectionRoots(root,ids)){const p=find(root,n.id).parent,c=cloneNode(n);p.children.splice(p.children.indexOf(n)+1,0,c);copies.push(c.id);}return copies;
}
export function deleteSelection(root,ids){for(const n of selectionRoots(root,ids))removeNode(root,n.id);}
export function groupSelection(root,ids){
 const nodes=selectionRoots(root,ids);if(!nodes.length)throw Error('请先选择节点');const parent=find(root,nodes[0].id).parent;
 if(nodes.some(n=>find(root,n.id).parent!==parent||parent.mask===n))throw Error('组合需要选择同一父级下的节点，请先在节点树中调整层级');
 const g=node('group');g.name='组合';const index=parent.children.indexOf(nodes[0]),set=new Set(nodes);g.children=nodes;parent.children=parent.children.filter(n=>!set.has(n));parent.children.splice(index,0,g);return g.id;
}
export function moveSelection(root,ids,parentId,index=Infinity){
 const nodes=selectionRoots(root,ids),parent=find(root,parentId)?.node;
 if(!nodes.length||!parent||parent.kind!=='group'||nodes.some(n=>find(n,parentId)))throw Error('不能移入自己或自己的子节点');
 const targetIndex=Number.isFinite(index)?index:parent.children.length;
 const before=nodes.filter(n=>find(root,n.id).parent===parent&&parent.children.indexOf(n)>=0&&parent.children.indexOf(n)<targetIndex).length;
 for(const n of nodes)removeNode(root,n.id);parent.children.splice(Math.max(0,targetIndex-before),0,...nodes);return nodes.map(n=>n.id);
}
export function groupWithTarget(root,ids,targetId,name){
 const target=find(root,targetId),sources=selectionRoots(root,ids);
 if(!target?.parent||target.node.kind!=='shape'||target.parent.mask===target.node||!sources.length||sources.some(source=>find(source,targetId)))throw messageError('nodeTree.invalidGroupTarget');
 const order=selectionRoots(root,[...sources.map(source=>source.id),targetId]).map(n=>n.id),group=node('group');
 if(name)group.name=name;group.boundary='visible';group.children=[target.node];
 target.parent.children.splice(target.parent.children.indexOf(target.node),1,group);
 moveSelection(root,sources.map(source=>source.id),group.id);group.children.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));return group.id;
}
