import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeArrangement,ringCounts,arrangementSpec} from '../web/arrangement.js';
import {generateArrangement} from '../web/arrangement-layouts.js';
import {project,sanitizeTree} from '../web/tree-model.js';
test('ring spacing scales counts by radius, equal mode and zero radius are explicit',()=>{const a=sanitizeArrangement([8]);a[3]=24;a[33]=3;a[36]=0;assert.deepEqual(ringCounts(a),[1,12,24]);assert.equal(generateArrangement(a).length,37);a[58]=0;assert.deepEqual(ringCounts(a),[1,24,24]);a[36]=.5;assert.deepEqual(ringCounts(a),[24,24,24]);a[58]=1;assert.deepEqual(ringCounts(a),[12,18,24]);assert.equal(arrangementSpec(8,3,a).label,'最外圈数量');a[33]=1;assert.deepEqual(ringCounts(a),[24]);});
test('ring distribution respects budget and survives project serialization',()=>{const p=project();const a=p.root.children[0].arrange;a[0]=8;a[3]=256;a[33]=16;a[36]=0;a[58]=1;assert.equal(generateArrangement(a).length,512);assert.equal(ringCounts(a)[0],1);assert.equal(sanitizeTree(p).root.children[0].arrange[58],1);a[58]=0;assert.equal(sanitizeTree(p).root.children[0].arrange[58],0);});

test('single ring ignores outer scale while multiple rings interpolate from inner size',()=>{const a=sanitizeArrangement([8]);a[33]=1;a[4]=.2;a[18]=3;assert.equal(arrangementSpec(8,4,a).label,'实例尺寸');assert.ok(generateArrangement(a).every(p=>Math.abs(p.size-.2)<1e-9));const normal=generateArrangement(a,{seamless:true});a[18]=1;assert.deepEqual(generateArrangement(a,{seamless:true}),normal);a[33]=3;a[18]=3;const ps=generateArrangement(a);assert.equal(arrangementSpec(8,4,a).label,'内圈实例尺寸');assert.ok(Math.abs(ps[0].size-.2)<1e-9);assert.ok(Math.abs(ps.at(-1).size-.6)<1e-9);});
