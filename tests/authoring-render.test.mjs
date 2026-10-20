import test from 'node:test';
import assert from 'node:assert/strict';
import {renderOptions} from '../authoring-render.mjs';
test('CLI rendering bounds and command-specific options',()=>{
 assert.deepEqual(renderOptions('check',[]).times,[0,.25,.5,1,2]);
 assert.equal(renderOptions('render',['--size','256','--time','1.5']).times[0],1.5);
 for(const args of [['--size','0'],['--size','2049'],['--time','NaN'],['--time','-1'],['--time','0,1'],['--times','0'],['--output','test.jpg'],['--timeout','0'],['--size'],['--bogus','1']])assert.throws(()=>renderOptions('render',args));
 assert.throws(()=>renderOptions('check',['--times',Array(17).fill(0).join(',')]));
});
