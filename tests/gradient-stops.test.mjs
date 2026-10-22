import test from 'node:test';
import assert from 'node:assert/strict';
import {gradientStops,gradientColorAt,reverseGradient} from '../web/gradient-stops.js';
test('gradient insertion samples the displayed ramp, including uneven and coincident stops',()=>{const stops=[{position:.2,color:'#000000'},{position:.6,color:'#ffffff'}];assert.equal(gradientColorAt(stops,0),'#000000');assert.equal(gradientColorAt(stops,.4),'#808080');assert.equal(gradientColorAt(stops,1),'#ffffff');assert.equal(gradientColorAt([{position:0,color:'#ff0000'},{position:0,color:'#00ff00'},{position:1,color:'#0000ff'}],.5),'#008080');});
test('reversing a ramp mirrors positions without changing colors or the source',()=>{const color={low:'#000000',high:'#ffffff'},original=gradientStops(color),reverse=reverseGradient(original);assert.deepEqual(reverse.map(s=>s.position),[1,0]);assert.deepEqual(reverseGradient(reverse),original);assert.equal(original[0].position,0);assert.equal(color.stops,undefined);});
