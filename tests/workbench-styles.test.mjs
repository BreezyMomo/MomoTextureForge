import test from 'node:test';
import assert from 'node:assert/strict';
import {readEditorStyle} from '../tools/workbench-styles.mjs';
test('offline styles contain the shared controls and recursively inline their dependencies',async()=>{
 const settings=await readEditorStyle('theme-tokens.css'),tabs=await readEditorStyle('tab-styles.css');
 assert.match(settings,/\.momo-appearance-dialog/);assert.match(settings,/\.momo-field/);assert.match(tabs,/data-tab-style/);
 assert.doesNotMatch(settings+tabs,/@import\s/);
});
