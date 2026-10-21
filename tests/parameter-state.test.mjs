import test from 'node:test';
import assert from 'node:assert/strict';
import {node,evaluateNode} from '../web/tree-model.js';
import {parameterState} from '../web/parameter-state.js';

test('animation explanations distinguish normal, recording, base and paused tracks',()=>{
 const n=node();n.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,0],[1,1]]};
 assert.equal(parameterState(n,n,'opacity').locked,true);
 assert.equal(parameterState(n,n,'opacity','record').animation,'录制中');
 assert.equal(parameterState(n,n,'opacity','base').locked,false);
 n.tracks.opacity.muted=true;assert.equal(parameterState(n,n,'opacity').animation,'');
 n.tracks.opacity.muted=false;n.animationEnabled=false;assert.equal(parameterState(n,n,'opacity').locked,false);
});

test('dependencies follow keyed master parameters without treating fog or smoke-only resources as gated',()=>{
 const n=node('shape','TurbulentFlame');n.tracks['params.13']={mode:'absolute',ease:'linear',keys:[[0,0],[1,1]]};
 assert.match(parameterState(n,evaluateNode(n,0).node,'params.16').dependency,/烟气混合为0/);
 assert.equal(parameterState(n,evaluateNode(n,1).node,'params.16').dependency,'');
 n.params[15]=0;assert.match(parameterState(n,evaluateNode(n,1).node,'params.17').dependency,/烟气密度为0/);
 assert.equal(parameterState(n,evaluateNode(n,0).node,'params.18').dependency,'');
 assert.equal(parameterState(node('shape','PlumeSmoke'),node('shape','PlumeSmoke'),'params.16').dependency,'');
 const plain=node();assert.match(parameterState(plain,plain,'uv.5').dependency,/UV滚动速度/);assert.match(parameterState(plain,plain,'contour.radius').dependency,/轮廓方式/);
 plain.uv[4]=1;plain.contour.mode='outline';assert.equal(parameterState(plain,plain,'uv.5').dependency,'');assert.equal(parameterState(plain,plain,'contour.radius').dependency,'');
});
