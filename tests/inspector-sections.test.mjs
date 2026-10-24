import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectorSectionState,INSPECTOR_SECTIONS_KEY} from '../web/inspector-sections.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test('section expansion persists by semantic ID with independent graphic parameter states',()=>{
 const storage=memory(),state=inspectorSectionState(storage);assert.equal(state.open('editor.nodeRegion',true),true);assert.equal(state.open('editor.advancedTimeControls',false),false);
 state.remember('editor.nodeRegion',false);state.remember('modules.shapeParameters:Circle',false);state.remember('modules.shapeParameters:Star',true);
 const restored=inspectorSectionState(storage);assert.equal(restored.open('editor.nodeRegion',true),false);assert.equal(restored.open('modules.shapeParameters:Circle',true),false);assert.equal(restored.open('modules.shapeParameters:Star',false),true);
 assert.deepEqual(Object.keys(JSON.parse(storage.getItem(INSPECTOR_SECTIONS_KEY))).sort(),['editor.nodeRegion','modules.shapeParameters:Circle','modules.shapeParameters:Star']);
});
test('invalid section preferences and unavailable storage leave the inspector usable',()=>{
 const storage=memory();for(const text of ['null','[]','broken']){storage.setItem(INSPECTOR_SECTIONS_KEY,text);assert.equal(inspectorSectionState(storage).open('editor.nodeRegion',true),true);}
 storage.setItem(INSPECTOR_SECTIONS_KEY,JSON.stringify({'editor.nodeRegion':'false','editor.shapeUV':false}));const state=inspectorSectionState(storage);assert.equal(state.open('editor.nodeRegion',true),true);assert.equal(state.open('editor.shapeUV',true),false);
 storage.setItem=()=>{throw Error('Storage full');};state.remember('editor.nodeRegion',false);assert.equal(state.open('editor.nodeRegion',true),false);
});

test('module order persists per tab and retains temporarily absent modules',()=>{
 const storage=memory(),state=inspectorSectionState(storage);assert.deepEqual(state.order('shape',['a','b','c']),['a','b','c']);state.rememberOrder('shape',['c','a','b']);state.rememberOrder('shape',['b','c']);const restored=inspectorSectionState(storage);assert.deepEqual(restored.order('shape',['a','b','c','d']),['b','a','c','d']);assert.deepEqual(restored.order('layout',['a','b','c']),['a','b','c']);storage.setItem=()=>{throw Error('full');};restored.rememberOrder('shape',['c','a','b']);assert.deepEqual(restored.order('shape',['a','b','c']),['c','a','b']);
});

test('resetting one tab restores its default order and preserves other preferences',()=>{
 const storage=memory(),state=inspectorSectionState(storage);
 state.rememberOrder('shape',['colors','parameters']);state.rememberOrder('layout',['size','position']);state.remember('modules.node',false);
 state.resetOrder('shape');
 const restored=inspectorSectionState(storage);
 assert.deepEqual(restored.order('shape',['parameters','colors']),['parameters','colors']);
 assert.deepEqual(restored.order('layout',['position','size']),['size','position']);
 assert.equal(restored.open('modules.node',true),false);
});
