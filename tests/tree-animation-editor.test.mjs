import test from 'node:test';import assert from 'node:assert/strict';
import {moveAnimationKey} from '../web/tree-animation-editor.js';
test('key movement sorts, clamps and merges collisions without dropping unrelated keys',()=>{const t={keys:[[0,2],[.5,3],[1,4]]};assert.equal(moveAnimationKey(t,0,.5),.5);assert.deepEqual(t.keys,[[.5,2],[1,4]]);moveAnimationKey(t,1,-1,9);assert.deepEqual(t.keys,[[0,9],[.5,2]]);moveAnimationKey(t,0,NaN);assert.deepEqual(t.keys,[[0,9],[.5,2]]);});
