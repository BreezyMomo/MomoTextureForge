import test from 'node:test';
import assert from 'node:assert/strict';
import {bindFormulaParameters} from '../web/formula-parameters.js';
const params=[{slot:0,variable:'radius'},{slot:3,variable:'softness'}];
test('named parameters compile to stable slots without changing source',()=>{
 const source='fill(r-radius,softness)';
 const result=bindFormulaParameters(source,params);assert.equal(result.kind,'body');assert.ok(result.compiled.includes(source));assert.ok(result.compiled.includes('float radius = a.x;'));assert.deepEqual(result.unused,[]);
 assert.equal(source,'fill(r-radius,softness)');
});
test('unused detection ignores comments, longer identifiers and member names',()=>{
 const result=bindFormulaParameters('innerRadius + v.radius /* radius */ // softness\n',params);
 assert.deepEqual(result.unused,['radius','softness']);
});
test('invalid duplicate reserved and function names reject binding',()=>{
 for(const variable of ['time','a','bad-name','3radius','gl_test'])assert.throws(()=>bindFormulaParameters('1.',[{slot:0,variable}]));
 assert.throws(()=>bindFormulaParameters('radius', [...params,{slot:2,variable:'radius'}]));
 assert.throws(()=>bindFormulaParameters('sin(r)',[{slot:0,variable:'sin'}]));
});
test('legacy aliases bind and slots stay stable when a parameter is removed',()=>{
 assert.deepEqual(bindFormulaParameters('R+S',[{slot:0,variable:'R'},{slot:3,variable:'S'}]).unused,[]);
 assert.ok(bindFormulaParameters('softness',[params[1]]).compiled.includes('float softness = a.w;'));
});

test('local variables are preserved and do not count as parameter references',()=>{
 const source='float a=1.;float R=a;return R;';const result=bindFormulaParameters(source,[{slot:0,variable:'R'}],'body');
 assert.ok(result.compiled.includes(source));assert.deepEqual(result.unused,['R']);
});
test('native slot reads count before shadowing and nested locals stay scoped',()=>{
 const result=bindFormulaParameters('float original=a.y;{float radius=1.;}return radius+original;',params,'body');
 assert.deepEqual(result.unused,['softness']);
 assert.deepEqual(bindFormulaParameters('float original=a.w;float a=1.;return original;',params,'body').unused,['radius']);
 assert.deepEqual(bindFormulaParameters('float a=1.;return a.x;',params,'body').unused,['radius','softness']);
});
test('comma declarations and comments do not create false parameter references',()=>{
 assert.deepEqual(bindFormulaParameters('float x=1., radius=2.;return radius; // softness',params,'body').unused,['radius','softness']);
});

import {vectorParameterSlots} from '../web/formula-parameters.js';
test('whole vectors forwarded to helpers count as parameter usage',()=>{
 assert.deepEqual(bindFormulaParameters('helper(q,a,b,c,d)',params).unused,[]);
});
test('vector-only output parameters are recognized for the matching graphic',()=>{
 const definition={id:'Example',outputs:{vector:{library:'vectors'}}},libraries={vectors:'if(id=={{id:Other}})return params[3];\nif(id=={{id:Example}})return vec3(params[0].x);\nreturn vec3(.5);'};
 assert.deepEqual(vectorParameterSlots(definition,libraries),[0]);
 assert.deepEqual(bindFormulaParameters('u.x',params,'expression',vectorParameterSlots(definition,libraries)).unused,['softness']);
});
