import test from 'node:test';
import assert from 'node:assert/strict';
import {createGraphicFavorites,GRAPHIC_FAVORITES_KEY} from '../web/graphic-list-favorites.js';
const memory=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};

test('favorites persist by list entry ID without modifying graphics or losing removed entries on undo',()=>{
 const storage=memory(),favorites=createGraphicFavorites(storage),entries=[{id:'a',name:'Personal'},{id:'b',name:'Personal'}],before=JSON.stringify(entries);
 favorites.migrate(entries);favorites.toggle(entries[0]);assert.equal(favorites.count(entries),1);assert.equal(favorites.has(entries[1]),false);
 const restored=createGraphicFavorites(storage);assert.equal(restored.count([]),0);assert.equal(restored.has({...entries[0],name:'Renamed',versionId:2}),true);
 assert.equal(restored.count(entries),1);restored.toggle(entries[0]);assert.equal(createGraphicFavorites(storage).count(entries),0);assert.equal(JSON.stringify(entries),before);
});
test('legacy builtin favorites migrate once after builtin list initialization',()=>{
 const storage=memory();storage.setItem('momo-texture-forge:ui',JSON.stringify({favorites:['Circle','SigilFrame',null]}));
 const entries=[{id:'new-circle',builtin:'Circle'},{id:'personal-circle'},{id:'ring',builtin:'Ring'}],favorites=createGraphicFavorites(storage);
 favorites.migrate(entries);assert.equal(favorites.has(entries[0]),true);assert.equal(favorites.count(entries),1);
 favorites.toggle(entries[0]);createGraphicFavorites(storage).migrate(entries);assert.deepEqual(JSON.parse(storage.getItem(GRAPHIC_FAVORITES_KEY)),[]);
 assert.deepEqual(JSON.parse(storage.getItem('momo-texture-forge:ui')).favorites,['Circle','SigilFrame',null]);
});
test('storage failure leaves the existing favorite state intact',()=>{
 const storage=memory(),favorites=createGraphicFavorites(storage),entry={id:'a'};favorites.migrate([entry]);favorites.toggle(entry);
 storage.setItem=()=>{throw Error('Quota exceeded');};assert.throws(()=>favorites.toggle(entry),/Quota exceeded/);assert.equal(favorites.has(entry),true);
});
