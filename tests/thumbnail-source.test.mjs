import test from 'node:test';
import assert from 'node:assert/strict';
import {node} from '../web/tree-model.js';
import {CATALOG} from '../web/catalog.js';
import {createProjectResource,renameProjectResource} from '../web/project-resources.js';
import {builtinThumbnail,thumbnailVisualKey,thumbnailCacheKey} from '../web/thumbnail-source.js';
import {createThumbnailCache} from '../web/thumbnail-cache.js';

test('only current unchanged built-ins use their precomputed images',()=>{
 const spec=CATALOG.find(p=>p.id==='Spiral'),entry=createProjectResource(node('shape',spec.id),{builtin:spec.id,versionId:spec.definition.revision});
 assert.match(builtinThumbnail(entry),/^data:image\/png;base64,/);
 assert.equal(builtinThumbnail(renameProjectResource(entry,'Renamed')),builtinThumbnail(entry),'a name change does not alter pixels');
 const changed=structuredClone(entry);changed.root.opacity=.5;assert.equal(builtinThumbnail(changed),null);
 const old={...entry,versionId:entry.versionId+1};assert.equal(builtinThumbnail(old),null);
 const custom=createProjectResource(node('shape',spec.id));assert.equal(builtinThumbnail(custom),null);
});
test('persistent identity follows rendered content, not names, object key order, or instance IDs',async()=>{
 const a=node(),b=structuredClone(a);b.id='copy';b.name='另一个名称';b.resourceRef='other';b.transform=Object.fromEntries(Object.entries(b.transform).reverse());
 assert.equal(thumbnailVisualKey(a),thumbnailVisualKey(b));assert.equal(await thumbnailCacheKey(a),await thumbnailCacheKey(b));
 b.opacity=.5;assert.notEqual(await thumbnailCacheKey(a),await thumbnailCacheKey(b));
 const group=node('group');group.children=[a];const before=JSON.stringify(group),key=await thumbnailCacheKey(group);assert.equal(JSON.stringify(group),before);
 group.mask=node('shape','Ring');assert.notEqual(await thumbnailCacheKey(group),key);
});
test('unavailable browser storage stays optional',async()=>{
 const cache=createThumbnailCache(null);assert.equal(await cache.get('missing'),undefined);await cache.put('key','data:image/png;base64,AAAA');await cache.remove('key');cache.close();
 const denied=createThumbnailCache({open(){throw Error('denied');}});assert.equal(await denied.get('missing'),undefined);await denied.put('key','data:image/png;base64,AAAA');denied.close();
});
