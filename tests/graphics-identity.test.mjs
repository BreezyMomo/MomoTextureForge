import test from 'node:test';
import assert from 'node:assert/strict';
import {groupGraphics,preferredGraphic,graphicVariantKey} from '../web/graphics-identity.js';
const local={resourceId:'AA',versionId:1,hash:'a',name:'local'};
const remote={resourceId:'aa',versionId:1,sha256:'a',remote:true,sourceId:'one',name:'remote'};
test('one identity card keeps independent sources, local default and explicit remote choice',()=>{
 const group=groupGraphics([remote,local,{...remote,sourceId:'two'},remote])[0];
 assert.equal(group.variants.length,3);assert.equal(group.status,'本地已有 · 内容一致');assert.equal(preferredGraphic(group.variants),local);
 assert.equal(preferredGraphic(group.variants,graphicVariantKey(remote)),remote);assert.equal(groupGraphics([local,{...local,resourceId:'different'}]).length,2);
 assert.equal(preferredGraphic(group.variants,'removed'),local);
});
test('version comparisons and conflicting historical peers are not silent overwrites',()=>{
 assert.equal(groupGraphics([local,{...remote,versionId:3}])[0].status,'远程有新版');
 assert.equal(groupGraphics([{...local,versionId:3},remote])[0].status,'本地版本较新');
 const conflict=groupGraphics([local,{...remote,sha256:'b'},{...remote,sourceId:'two',versionId:4}])[0];
 assert.equal(conflict.conflict,true);assert.match(conflict.status,/内容冲突/);assert.equal(preferredGraphic(conflict.variants),local);
 assert.match(groupGraphics([{...local,hash:undefined},remote])[0].status,/待核对/);
});
test('remote-only default is latest and explicit cached older versions remain selectable',()=>{
 const newer={...remote,versionId:7},group=groupGraphics([remote,newer,{...newer,sourceId:'two'}])[0];
 assert.equal(preferredGraphic(group.variants).versionId,7);assert.equal(preferredGraphic(group.variants,graphicVariantKey(remote)),remote);
 assert.match(group.status,/版本不同/);assert.equal(groupGraphics([{...local,builtin:'Circle'},remote])[0].variants.length,2);
});
