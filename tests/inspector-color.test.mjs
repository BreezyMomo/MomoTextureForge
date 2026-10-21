import test from 'node:test';
import assert from 'node:assert/strict';
import {node,project,evaluateNode} from '../web/tree-model.js';
import {colorContext,colorBackground,independentColor,normalizeHex} from '../web/inspector-color.js';

test('color source follows inheritance through preserving groups and independent child colors',()=>{
 const p=project(),parent=node('group'),inner=node('group'),child=node();parent.color={mode:'own',fill:'solid',low:'#000000',high:'#80dfff'};parent.children=[inner];inner.children=[child];p.root.children=[parent];
 const context=colorContext(p.root,child.id);assert.equal(context.source.id,parent.id);assert.equal(context.palette.high,'#80dfff');assert.equal(context.children,false);
 const copied=independentColor(context);assert.equal(copied.mode,'own');copied.high='#ff0000';assert.equal(parent.color.high,'#80dfff');
 child.color.mode='own';assert.equal(colorContext(p.root,child.id).source.id,child.id);
 assert.equal(colorContext(p.root,inner.id).children,true);assert.equal(colorContext(p.root,'missing'),null);
});
test('default palette and ancestor remaps are reported independently',()=>{
 const p=project(),child=p.root.children[0];assert.equal(colorContext(p.root,child.id).source,null);assert.equal(colorBackground(colorContext(p.root,child.id).palette),'linear-gradient(90deg,#000000 0%,#ffffff 100%)');
 const outer=node('group'),inner=node('group');outer.color.mode=inner.color.mode='remap';inner.children=[child];outer.children=[inner];p.root.children=[outer];child.color.mode='own';
 assert.equal(colorContext(p.root,child.id).override.id,outer.id);assert.equal(colorContext(p.root,child.id).source.id,child.id);
});
test('source previews use evaluated animation and copy multicolor stops without sharing state',()=>{
 const p=project(),group=node('group');group.color={mode:'own',fill:'gradient',low:'#000000',high:'#ffffff',stops:[{color:'#000000',position:0},{color:'#80dfff',position:.5},{color:'#ffffff',position:1}]};group.children=p.root.children;p.root.children=[group];group.tracks['color.high']={mode:'absolute',ease:'linear',keys:[[0,'#ff0000'],[1,'#0000ff']]};
 const context=colorContext(p.root,group.children[0].id,n=>evaluateNode(n,1).node);assert.equal(context.palette.high,'#0000ff');const copied=independentColor(context);copied.stops[0].color='#ffffff';assert.equal(group.color.stops[0].color,'#000000');
 const before=JSON.stringify(group.color.stops);assert.match(colorBackground(group.color),/#80dfff 50%/);assert.equal(JSON.stringify(group.color.stops),before);
});
test('HEX accepts compact/full colors and rejects malformed values',()=>{
 assert.equal(normalizeHex(' A0F '),'#aa00ff');assert.equal(normalizeHex('#80DFFF'),'#80dfff');assert.equal(normalizeHex('#80dfff00'),null);assert.equal(normalizeHex('red'),null);assert.equal(normalizeHex(''),null);
});
