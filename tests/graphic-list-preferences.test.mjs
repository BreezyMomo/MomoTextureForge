import test from 'node:test';
import assert from 'node:assert/strict';
import {graphicListPreferences} from '../web/graphic-list-preferences.js';
test('list preference changes preserve unknown historical favorites and restore without changing resources',()=>{
 const entries=[{id:'a',name:'A',category:'Test'},{id:'b',name:'B',category:'Other'}],base={mode:'all',categories:[],query:'',view:'grid',favorites:['old'],recent:['preset:a'],closedGroups:[]};
 const next=graphicListPreferences(base,{mode:'favorites',favorites:[{id:'a',favorite:true}],categories:['Test'],query:'A',groups:[{category:'Test',open:false}]},entries,['grid','list']);
 assert.deepEqual(next.favorites,['old','a']);assert.deepEqual(next.recent,base.recent);assert.deepEqual(next.closedGroups,['closed:Test']);assert.deepEqual(graphicListPreferences(next,{restore:base},entries,['grid','list']),base);
 const before=JSON.stringify(base);assert.throws(()=>graphicListPreferences(base,{mode:'recent',favorites:[{id:'missing',favorite:true}]},entries,['grid']));assert.equal(JSON.stringify(base),before);assert.equal(entries.length,2);
 assert.throws(()=>graphicListPreferences(base,{categories:['missing']},entries,['grid']));assert.deepEqual(graphicListPreferences(base,{clearRecent:true},entries,['grid']).recent,[]);
});
