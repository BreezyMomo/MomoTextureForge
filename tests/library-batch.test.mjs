import test from 'node:test';
import assert from 'node:assert/strict';
import {addLibrarySelection} from '../web/library-batch.js';

test('large library selections yield progress and commit once instead of saving each item',async()=>{
 const items=Array.from({length:298},(_,id)=>({id})),updates=[];let commits=0,yields=0;
 const result=await addLibrarySelection({items,status:()=> 'available',prepare:async item=>({root:item}),
  commit:async entries=>{commits++;assert.deepEqual(entries.map(e=>e.root),items);},
  onProgress:p=>updates.push({...p}),yieldControl:async()=>{yields++;}});
 assert.equal(commits,1);assert.equal(yields,299);assert.equal(result.added.length,298);
 assert.equal(updates.at(-1).phase,'saving');assert.equal(updates.at(-1).done,298);
 assert.ok(updates.some(p=>p.done>0&&p.done<298));
});

test('canceling preserves the prepared prefix and leaves the remaining selection untouched',async()=>{
 const controller=new AbortController(),items=[0,1,2,3],rolledBack=[];let committed;
 const result=await addLibrarySelection({items,signal:controller.signal,status:()=> 'available',
  prepare:async item=>({root:item,rollback:()=>rolledBack.push(item)}),commit:async entries=>committed=entries.map(e=>e.root),
  onProgress:({done})=>{if(done===2)controller.abort();},yieldControl:async()=>{}});
 assert.equal(result.canceled,true);assert.deepEqual(result.added,[0,1]);assert.deepEqual(committed,[0,1]);assert.equal(result.done,2);assert.deepEqual(rolledBack,[]);
});

test('duplicates skip, updates require confirmation, and one broken resource does not stop the batch',async()=>{
 let committed;
 const result=await addLibrarySelection({items:['duplicate','update','broken','good'],status:item=>({duplicate:'added',update:'update'}[item]??'available'),
  prepare:async item=>{if(item==='broken')throw Error('invalid package');return {root:item};},commit:async entries=>committed=entries.map(e=>e.item),yieldControl:async()=>{}});
 assert.deepEqual(result.skipped,['duplicate']);assert.deepEqual(result.added,['good']);assert.deepEqual(committed,['good']);
 assert.equal(result.failures.length,2);assert.equal(result.failures[0].needsUpdate,true);assert.equal(result.failures[1].error.message,'invalid package');
});

test('a failed final commit rolls packs back in reverse dependency order',async()=>{
 const rolledBack=[];
 await assert.rejects(addLibrarySelection({items:[1,2,3],status:()=> 'available',prepare:async item=>({rollback:()=>rolledBack.push(item)}),
  commit:async()=>{throw Error('failed to save');},yieldControl:async()=>{}}),/failed to save/);
 assert.deepEqual(rolledBack,[3,2,1]);
});

test('abort during remote preparation stops further work and still commits completed items',async()=>{
 const controller=new AbortController();let committed;
 const result=await addLibrarySelection({items:[1,2,3],status:()=> 'available',signal:controller.signal,
  prepare:async item=>{if(item===2){controller.abort();throw new DOMException('Aborted','AbortError');}return {root:item};},
  commit:async entries=>committed=entries.map(e=>e.root),yieldControl:async()=>{}});
 assert.deepEqual(committed,[1]);assert.equal(result.failures.length,0);assert.equal(result.canceled,true);assert.equal(result.done,1);
});

test('an already canceled or entirely duplicate selection does not write the editor',async()=>{
 const controller=new AbortController();controller.abort();
 const callbacks={items:[1,2],status:()=> 'added',prepare:()=>assert.fail('must not prepare'),commit:()=>assert.fail('must not save'),yieldControl:async()=>{}};
 assert.equal((await addLibrarySelection({...callbacks,signal:controller.signal})).done,0);
 assert.deepEqual((await addLibrarySelection(callbacks)).skipped,[1,2]);
});
