import test from 'node:test';
import assert from 'node:assert/strict';
import {filterGraphicList} from '../web/graphic-list-filters.js';
const entries=[
 {id:'a',name:'Glow',aliases:{en:'Bloom'},kind:'formula',category:'Energy'},
 {id:'b',name:'Cloud image',kind:'image',category:'Noise'},
 {id:'c',name:'Frame',kind:'composition',category:'Energy'},
 {id:'d',name:'Noise',kind:'formula',category:'Noise'}
];
test('multiple types and categories are OR within each group and AND across groups',()=>{
 assert.deepEqual(filterGraphicList(entries),entries);
 assert.deepEqual(filterGraphicList(entries,{types:['formula','image']}).map(e=>e.id),['a','b','d']);
 assert.deepEqual(filterGraphicList(entries,{categories:['Energy','Noise']}).map(e=>e.id),['a','b','c','d']);
 assert.deepEqual(filterGraphicList(entries,{types:['formula','composition'],categories:['Energy']}).map(e=>e.id),['a','c']);
 assert.deepEqual(filterGraphicList(entries,{types:['image'],categories:['Energy']}),[]);
});
test('search combines with selected filters and includes multilingual resource aliases',()=>{
 const before=JSON.stringify(entries);
 assert.deepEqual(filterGraphicList(entries,{types:new Set(['formula']),categories:new Set(['Energy']),query:' BLOOM '}).map(e=>e.id),['a']);
 assert.deepEqual(filterGraphicList(entries,{query:'noise'}).map(e=>e.id),['b','d']);
 assert.equal(JSON.stringify(entries),before);
});
