import test from 'node:test';
import assert from 'node:assert/strict';
import {withBuiltinGraphics} from '../web/graphic-list-defaults.js';
import {builtinIdentity} from '../web/graphics-library.js';
import {CATALOG} from '../web/catalog.js';
import {node,project,sanitizeTree} from '../web/tree-model.js';
import {createProjectResource} from '../web/project-resources.js';
import {serializeGraphicList,restoreGraphicList} from '../web/persistent-graphic-list.js';

test('default list contains every builtin with stable library identities and portable aliases',async()=>{
 const defaults=await withBuiltinGraphics([]);assert.equal(defaults.length,CATALOG.filter(p=>!p.id.startsWith('asset_')).length);
 assert.equal(new Set(defaults.map(e=>e.resourceId)).size,defaults.length);
 const circle=defaults.find(e=>e.builtin==='Circle');assert.equal(circle.resourceId,await builtinIdentity('Circle'));assert.equal(circle.root.type,'Circle');assert.equal(circle.aliases.en,'Circle');assert.equal(circle.root.resourceRef,circle.id);
 const roundtrip=restoreGraphicList(serializeGraphicList(defaults));assert.equal(roundtrip.length,defaults.length);assert.deepEqual(roundtrip.find(e=>e.id===circle.id),circle);
});
test('seeding preserves existing builtins, personal edits and unrelated resources without duplicating versions',async()=>{
 const original=createProjectResource(node('shape','Circle'),{resourceId:await builtinIdentity('Circle'),versionId:1,name:'My circle'});original.personalRevision=4;original.root.opacity=.3;
 const custom=createProjectResource(node('shape','Star'),{name:'My custom star'}),entries=[custom,original],before=JSON.stringify(entries),result=await withBuiltinGraphics(entries);
 assert.equal(JSON.stringify(entries),before);assert.equal(result[0],custom);assert.equal(result[1],original);assert.equal(result.filter(e=>e.resourceId===original.resourceId).length,1);assert.equal(result[1].root.opacity,.3);assert.equal(result[1].personalRevision,4);
 assert.deepEqual(await withBuiltinGraphics(result),result);
 const p=project();p.projectResources=result;assert.equal(sanitizeTree(p).projectResources.length,result.length);
});
