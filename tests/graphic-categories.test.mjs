import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG,CATEGORIES,BY_ID} from '../web/catalog.js';
import {graphicCategory,graphicCategoryGroups} from '../web/graphic-categories.js';
import {filterGraphicList} from '../web/graphic-list-filters.js';
import {setLanguageOrder} from '../web/language.js';
import {node} from '../web/tree-model.js';

test('all builtins have one populated category, ordered from construction to effects and data',()=>{
 assert.deepEqual(CATEGORIES.map(c=>c.id),['shape','gradient','pattern','ornament','tile','fabric','noise','natural','grunge','digital','light','energy','atmosphere','water','ribbon','vector','mask']);
 const entries=CATALOG.map(p=>({builtin:p.id})),groups=graphicCategoryGroups(entries);
 assert.equal(groups.length,CATEGORIES.length);
 assert.deepEqual(groups.map(g=>g.key),CATEGORIES.map(c=>c.name));
 assert.deepEqual(groups.flatMap(g=>g.members).sort((a,b)=>a.builtin.localeCompare(b.builtin)),[...entries].sort((a,b)=>a.builtin.localeCompare(b.builtin)));
 for(const category of CATEGORIES)assert.ok(category.count>0,category.id);
 for(const [id,category]of Object.entries({Circle:'shape',PuzzlePiece:'shape',Thorn:'gradient',RadialGradient:'gradient',Checker:'pattern',WebSigil:'ornament',OgeeFlowerTile:'tile',Knit:'fabric',FilmGrain:'noise',Wood:'natural',Scratch:'grunge',Circuit:'digital',LensFlare:'light',BallisticSparks:'light',VortexGate:'energy',BranchedLightning:'energy',Smoke:'atmosphere',PlumeSmoke:'atmosphere',Fire:'atmosphere',VolumeFlame:'atmosphere',Water:'water',FlowingWater:'water',BezierRibbon:'ribbon',FoldedRibbon:'ribbon',HeightNormal:'vector',DissolveNoise:'mask',PixelDissolve:'mask'}))assert.equal(BY_ID.get(id).definition.category,category,id);
});

test('old builtin copies follow current categories without changing stored metadata or personal edits',()=>{
 const entries=[{id:'a',builtin:'Circle',name:'My round shape',category:'径向',personalRevision:3,root:{params:[.3]}},{id:'b',builtin:'PlumeSmoke',category:'特效素材'},{id:'c',builtin:'FlowingWater',category:'VFX textures'},{id:'d',name:'My shape',category:'My own category'}],before=JSON.stringify(entries);
 assert.deepEqual(entries.map(graphicCategory),['基础形状','烟雾与火焰','水纹与焦散','My own category']);
 assert.deepEqual(filterGraphicList(entries,{categories:['基础形状']}).map(e=>e.id),['a']);
 assert.deepEqual(filterGraphicList(entries,{query:'水纹与焦散'}).map(e=>e.id),['c']);
 assert.equal(JSON.stringify(entries),before);
});

test('localized category labels and search preserve grouping keys and user categories',()=>{
 const entries=[{id:'water',builtin:'Water',category:'自然材质'},{id:'smoke',builtin:'PlumeSmoke',category:'特效素材'},{id:'custom',category:'My category'}],before=JSON.stringify(entries);
 try{
  setLanguageOrder(['zh-CN','en']);const keys=graphicCategoryGroups(entries).map(g=>g.key);
  assert.deepEqual(filterGraphicList(entries,{query:'water and caustics'}).map(e=>e.id),['water']);
  setLanguageOrder(['en','zh-CN']);const groups=graphicCategoryGroups(entries);
  assert.deepEqual(groups.map(g=>g.key),keys);assert.deepEqual(groups.map(g=>g.title),['Smoke and fire','Water and caustics','My category']);
  assert.deepEqual(filterGraphicList(entries,{query:'water and caustics'}).map(e=>e.id),['water']);
  assert.deepEqual(filterGraphicList(entries,{mode:'recent',recent:['preset:water','preset:smoke']}).map(e=>e.id),['water','smoke']);
  assert.equal(JSON.stringify(entries),before);
 }finally{setLanguageOrder(['zh-CN','en']);}
});

test('early shelves without builtin markers join current groups while custom assets and categories stay separate',()=>{
 const entries=[{id:'old-circle',category:'径向',root:node('shape','Circle')},{id:'old-star',category:'形状',root:node('shape','Star')},{id:'old-ribbon',category:'Trails',root:node('shape','RibbonWave')},{id:'new-circle',builtin:'Circle',category:'基础形状',root:node('shape','Circle')},{id:'custom-category',category:'My shapes',root:node('shape','Circle')},{id:'custom-asset',name:'Circle',category:'形状',root:{kind:'shape',type:'asset_custom'}},{id:'custom-group',category:'形状',root:node('group')}].map(entry=>({...entry,resourceId:'legacy:'+entry.id})),before=JSON.stringify(entries);
 assert.deepEqual(entries.map(graphicCategory),['基础形状','基础形状','丝带与拖尾','基础形状','My shapes','形状','形状']);
 assert.deepEqual(graphicCategoryGroups(entries)[0].members.map(e=>e.id),['old-circle','old-star','new-circle']);
 assert.deepEqual(filterGraphicList(entries,{categories:['基础形状']}).map(e=>e.id),['old-circle','old-star','new-circle']);
 assert.equal(JSON.stringify(entries),before);
});
