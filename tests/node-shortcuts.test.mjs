import test from 'node:test';
import assert from 'node:assert/strict';
import {nodeShortcutState,NODE_SHORTCUTS_KEY,SHORTCUT_MODULES} from '../web/node-shortcuts.js';
import {node,cloneNode} from '../web/tree-model.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test('shortcut registry covers parameter modules while excluding node and graphic navigation',()=>{
 assert.equal(SHORTCUT_MODULES.includes('modules.node'),false);assert.equal(SHORTCUT_MODULES.includes('modules.generator'),false);const pins=nodeShortcutState(memory());for(const key of ['modules.shapeParameters','editor.shapeUV','editor.contentArrangement','editor.layoutVariationGradientFlow','modules.imageFilters','editor.advancedTimeControls']){pins.toggleAll(key);assert.ok(pins.get('future').includes(key));}pins.toggleAll('modules.node');assert.equal(pins.get('future').includes('modules.node'),false);
});

test('shortcut pins persist per node without changing authored nodes',()=>{
 const storage=memory(),pins=nodeShortcutState(storage);pins.toggle('a','curves.title');pins.toggle('a','editor.opacity');pins.toggle('b','editor.nodeColors');pins.toggle('a','unsupported');
 assert.deepEqual(nodeShortcutState(storage).get('a'),['curves.title','editor.opacity']);assert.deepEqual(pins.get('b'),['editor.nodeColors']);pins.toggle('a','curves.title');assert.deepEqual(pins.get('a'),['editor.opacity']);pins.toggle('a','editor.opacity');assert.equal(Object.hasOwn(JSON.parse(storage.getItem(NODE_SHORTCUTS_KEY)).nodes,'a'),false);
});
test('global defaults cover existing and future nodes while retaining individual exceptions',()=>{
 const storage=memory(),pins=nodeShortcutState(storage);pins.toggle('a','curves.title');pins.toggleAll('editor.opacity');assert.deepEqual(pins.get('a'),['editor.opacity','curves.title']);assert.deepEqual(pins.get('new-node'),['editor.opacity']);
 pins.toggle('a','editor.opacity');assert.deepEqual(pins.get('a'),['curves.title']);assert.deepEqual(pins.get('b'),['editor.opacity']);const restored=nodeShortcutState(storage);assert.equal(restored.global('editor.opacity'),true);assert.deepEqual(restored.get('a'),['curves.title']);assert.deepEqual(restored.get('future'),['editor.opacity']);
 pins.toggleAll('editor.opacity');assert.deepEqual(pins.get('b'),[]);assert.deepEqual(pins.get('a'),['curves.title']);pins.toggleAll('editor.opacity');assert.deepEqual(pins.get('a'),['editor.opacity','curves.title']);
});
test('legacy node pins migrate without becoming global settings',()=>{
 const storage=memory();storage.setItem(NODE_SHORTCUTS_KEY,JSON.stringify({a:['editor.opacity']}));const pins=nodeShortcutState(storage);assert.deepEqual(pins.get('a'),['editor.opacity']);assert.deepEqual(pins.get('b'),[]);pins.toggleAll('editor.opacity');pins.toggleAll('editor.opacity');const restored=nodeShortcutState(storage);assert.deepEqual(restored.get('a'),['editor.opacity']);assert.deepEqual(restored.get('b'),[]);
});
test('invalid pins and unavailable storage do not break workspace controls',()=>{
 const storage=memory();for(const text of ['null','[]','broken']){storage.setItem(NODE_SHORTCUTS_KEY,text);assert.deepEqual(nodeShortcutState(storage).get('a'),[]);}
 storage.setItem(NODE_SHORTCUTS_KEY,JSON.stringify({a:['curves.title','bad','curves.title'],b:7}));const pins=nodeShortcutState(storage);assert.deepEqual(pins.get('a'),['curves.title']);assert.deepEqual(pins.get('b'),[]);storage.setItem=()=>{throw Error('full');};pins.toggle('a','editor.opacity');assert.deepEqual(pins.get('a'),['curves.title','editor.opacity']);
});
test('clones carry explicit pins and exclusions throughout groups and masks without changing content',()=>{
 const storage=memory(),pins=nodeShortcutState(storage),source=node('group');source.children=[node('shape','Circle'),node('shape','Star')];source.mask=node('shape','Ring');pins.toggleAll('editor.opacity');pins.toggle(source.id,'editor.nodeColors');pins.toggle(source.children[0].id,'editor.opacity');pins.toggle(source.children[0].id,'curves.title');pins.toggle(source.mask.id,'editor.nodeColors');
 const copy=cloneNode(source),before=JSON.stringify([source,copy]);pins.copyTree(source,copy);assert.deepEqual(pins.get(copy.id),['editor.opacity','editor.nodeColors']);assert.deepEqual(pins.get(copy.children[0].id),['curves.title']);assert.deepEqual(pins.get(copy.mask.id),['editor.opacity','editor.nodeColors']);assert.equal(JSON.stringify([source,copy]),before);
 pins.toggle(copy.id,'editor.nodeColors');assert.deepEqual(pins.get(source.id),['editor.opacity','editor.nodeColors']);const restored=nodeShortcutState(storage);assert.deepEqual(restored.get(copy.children[0].id),['curves.title']);
 pins.toggleAll('editor.opacity');assert.deepEqual(pins.get(copy.children[1].id),[]);assert.deepEqual(pins.get(copy.mask.id),['editor.nodeColors']);
});
