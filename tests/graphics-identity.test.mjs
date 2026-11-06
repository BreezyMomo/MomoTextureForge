import test from 'node:test';
import assert from 'node:assert/strict';
import {groupGraphics,preferredGraphic,graphicVariantKey} from '../web/graphics-identity.js';

test('a saved folder version remains the default when an unsaved remote update is advertised',()=>{
 const saved={resourceId:'a',versionId:1,sourceId:'team',remote:true,folder:true},latest={...saved,versionId:3,folder:false};
 assert.equal(preferredGraphic([latest,saved]),saved);
 assert.equal(preferredGraphic([latest,saved],graphicVariantKey(latest)),latest);
});
test('the folder storage choice is distinct from its builtin and remote origin without a new identity',()=>{
 const folder={resourceId:'a',versionId:1,remote:true,folder:true,folderVariant:true,sourceId:'team',hash:'same'},remote={...folder,folderVariant:false,sha256:'same'},builtin={resourceId:'a',versionId:3,builtin:'Circle'};
 const group=groupGraphics([builtin,remote,folder])[0];assert.equal(group.variants.length,3);assert.equal(graphicVariantKey(folder),'local:a@1');assert.equal(graphicVariantKey(remote),'remote:team:a@1');assert.equal(preferredGraphic(group.variants),folder);assert.equal(preferredGraphic(group.variants,graphicVariantKey(remote)),remote);assert.equal(group.conflict,false);
});
const local={resourceId:'AA',versionId:1,hash:'a',name:'local'};
const remote={resourceId:'aa',versionId:1,sha256:'a',remote:true,sourceId:'one',name:'remote'};
test('one identity card keeps independent sources, local default and explicit remote choice',()=>{
 const group=groupGraphics([remote,local,{...remote,sourceId:'two'},remote])[0];
 assert.equal(group.variants.length,3);assert.equal(group.status,'library.identityLocalIdentical');assert.equal(preferredGraphic(group.variants),local);
 assert.equal(preferredGraphic(group.variants,graphicVariantKey(remote)),remote);assert.equal(groupGraphics([local,{...local,resourceId:'different'}]).length,2);
 assert.equal(preferredGraphic(group.variants,'removed'),local);
});
test('version comparisons and conflicting historical peers are not silent overwrites',()=>{
 assert.equal(groupGraphics([local,{...remote,versionId:3}])[0].status,'library.identityRemoteNewer');
 assert.equal(groupGraphics([{...local,versionId:3},remote])[0].status,'library.identityLocalNewer');
 const conflict=groupGraphics([local,{...remote,sha256:'b'},{...remote,sourceId:'two',versionId:4}])[0];
 assert.equal(conflict.conflict,true);assert.match(conflict.status,/identityConflict/);assert.equal(preferredGraphic(conflict.variants),local);
 assert.match(groupGraphics([{...local,hash:undefined},remote])[0].status,/NeedsComparison/);
});
test('remote-only default is latest and explicit cached older versions remain selectable',()=>{
 const newer={...remote,versionId:7},group=groupGraphics([remote,newer,{...newer,sourceId:'two'}])[0];
 assert.equal(preferredGraphic(group.variants).versionId,7);assert.equal(preferredGraphic(group.variants,graphicVariantKey(remote)),remote);
 assert.match(group.status,/MultipleVersions/);assert.equal(groupGraphics([{...local,builtin:'Circle'},remote])[0].variants.length,2);
});
