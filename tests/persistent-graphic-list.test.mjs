import test from 'node:test';import assert from 'node:assert/strict';
import {GraphicShelf,serializeGraphicList,restoreGraphicList,canvasProject} from '../web/persistent-graphic-list.js';
import {project,node} from '../web/tree-model.js';import {createProjectResource,renameProjectResource} from '../web/project-resources.js';
import {projectDependencyIds} from '../web/project-dependencies.js';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';
import {BY_ID} from '../web/catalog.js';
import {recoverStoredGraphicList,GRAPHIC_LIST_KEY,GRAPHIC_LIST_RECOVERY_KEY} from '../web/persistent-graphic-list.js';

const storageFixture=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const obsoleteList=()=>{const good=createProjectResource(node('shape','Circle'),{name:'Personal circle'}),bad=createProjectResource(node('shape','Ring'),{name:'Old sigil'});bad.root.type='SigilFrame';return {good,bad,text:serializeGraphicList([good,bad])};};
test('one retired definition is isolated without losing valid personal resources or original text',()=>{
 const storage=storageFixture(),{good,text}=obsoleteList();storage.setItem(GRAPHIC_LIST_KEY,text);
 const result=recoverStoredGraphicList(storage,text);assert.deepEqual(result.entries,[good]);assert.equal(result.rejected[0].messageKey,'errors.unknownGraphic');
 const archive=JSON.parse(storage.getItem(GRAPHIC_LIST_RECOVERY_KEY));assert.equal(archive.snapshots[0].text,text);assert.equal(storage.getItem(GRAPHIC_LIST_KEY),text);
 recoverStoredGraphicList(storage,text);assert.equal(JSON.parse(storage.getItem(GRAPHIC_LIST_RECOVERY_KEY)).snapshots.length,1);
});
test('backup failure cannot overwrite the original list',()=>{
 const storage=storageFixture(),{text}=obsoleteList();storage.setItem(GRAPHIC_LIST_KEY,text);const set=storage.setItem;storage.setItem=(key,value)=>{if(key===GRAPHIC_LIST_RECOVERY_KEY)throw Error('quota exceeded');set(key,value);};
 assert.throws(()=>recoverStoredGraphicList(storage,text),/quota/);assert.equal(storage.getItem(GRAPHIC_LIST_KEY),text);assert.equal(storage.getItem(GRAPHIC_LIST_RECOVERY_KEY),null);
});
test('recovery keeps duplicate-ID and missing density entries aside, preserving nested contents in backup',()=>{
 const storage=storageFixture(),{good,bad}=obsoleteList(),duplicate=structuredClone(good),density=structuredClone(good);density.id='density';density.root.id='density-root';density.root.packDensity={base:'missing-density',keys:[]};
 const text=serializeGraphicList([good,duplicate,bad]),raw=JSON.parse(text);raw.projectResources.push(density);
 const result=recoverStoredGraphicList(storage,JSON.stringify(raw));assert.equal(result.entries.length,1);assert.equal(result.rejected.length,3);assert.deepEqual(JSON.parse(JSON.parse(result.backup).snapshots[0].text).projectResources[3],density);
});
test('malformed whole-list data remains blocked instead of being silently cleared',()=>{
 for(const text of ['{','{}',JSON.stringify({...project(),projectResources:{}})]){
  const storage=storageFixture();assert.throws(()=>recoverStoredGraphicList(storage,text));assert.equal(storage.getItem(GRAPHIC_LIST_RECOVERY_KEY),null);
 }
 const storage=storageFixture();assert.deepEqual(recoverStoredGraphicList(storage,serializeGraphicList([])).entries,[]);assert.equal(storage.getItem(GRAPHIC_LIST_RECOVERY_KEY),null);
});
test('new/open/preview share shelf without importing project resources; canvas-only snapshot excludes shelf dependencies',async()=>{const saved=createProjectResource(node('shape','Star')),shelf=new GraphicShelf([saved]),work=shelf.bind(project()),incoming=project();incoming.projectResources=[createProjectResource(node('shape','Ring'))];const loaded=shelf.bind(incoming),preview=shelf.bind(project());assert.equal(loaded.projectResources[0].id,saved.id);assert.equal(preview.projectResources,work.projectResources);const snapshot=canvasProject(work);assert.deepEqual(snapshot.projectResources,[]);assert.ok(!projectDependencyIds(snapshot).has('Star'));const pack=await readResourcePack(await encodeResourcePack(snapshot));assert.equal(pack.payload.projectResources.length,0);assert.equal(shelf.entries.length,1);});
test('independent list persistence roundtrips names and stable density references, including deliberate empty list',()=>{const entry=createProjectResource(node());entry.root.arrange[0]=12;entry.root.arrange[39]=BY_ID.get('ValueNoise').index;const text=serializeGraphicList([entry]),raw=JSON.parse(text);assert.equal(raw.projectResources[0].root.packDensity.base,'ValueNoise');raw.projectResources[0].root.arrange[39]=-999;const restored=restoreGraphicList(JSON.stringify(raw));assert.equal(restored[0].root.arrange[39],BY_ID.get('ValueNoise').index);assert.equal(restored[0].id,entry.id);assert.deepEqual(restoreGraphicList(serializeGraphicList([])),[]);});
test('canvas-only undo ignores old shelf snapshots while local list rename/removal undo and redo work',()=>{const original=createProjectResource(node()),shelf=new GraphicShelf([original]),work=shelf.bind(project()),canvasBefore=structuredClone(work);work.root.children[0].opacity=.3;shelf.record(canvasBefore);shelf.entries=[renameProjectResource(original,'新名字')];const canvasAfter=structuredClone(work);shelf.restore(canvasBefore,canvasAfter);assert.equal(shelf.entries[0].name,'新名字');const before=structuredClone(work);shelf.entries=[];shelf.record(before);const after=structuredClone(work);shelf.restore(before,after);assert.equal(shelf.entries[0].name,'新名字');const redoBefore=structuredClone(work);shelf.restore(after,redoBefore);assert.equal(shelf.entries.length,0);});
test('later preview/global list edits are protected from stale work history',()=>{const original=createProjectResource(node()),shelf=new GraphicShelf([original]),work=shelf.bind(project()),before=structuredClone(work);shelf.entries=[renameProjectResource(original,'第一次改名')];shelf.record(before);shelf.entries=[renameProjectResource(shelf.entries[0],'随后更新')];shelf.restore(before,structuredClone(work));assert.equal(shelf.entries[0].name,'随后更新');});
