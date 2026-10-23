import test from 'node:test';
import assert from 'node:assert/strict';
import {APPEARANCE_KEY,STYLE_IDS,COLOR_SCHEME_IDS,COLOR_ROLE_IDS,TAB_STYLE_IDS,normalizeAppearance,appearancePalette,colorContrast,createAppearance,defaultAppearanceColors} from '../web/appearance.js';
const defaults={theme:'classic',style:'refined',density:'compact',tabs:'segmented',scheme:'shuimo',colors:defaultAppearanceColors()};
const makeRoot=()=>({dataset:{},style:{values:new Map(),setProperty(key,value){this.values.set(key,value);},removeProperty(key){this.values.delete(key);}}});

test('fourteen complete palettes and four explicit tab styles have safe defaults',()=>{
 assert.deepEqual(COLOR_SCHEME_IDS,['shuimo','qingci','mineral','xuanqing','zhuyue','ouhe','qinghua','zhujin','yanzhi','zitong','ailv','taoyao','qiuxiang','tonglv']);assert.deepEqual(TAB_STYLE_IDS,['classic','segmented','pill','underline']);
 for(const raw of [null,[],{},'light',{theme:'unknown',scheme:'constructor',tabs:'unknown',style:'unknown',colors:{action:'url(https://example.com)'}}])assert.deepEqual(normalizeAppearance(raw),defaults);
 const p=normalizeAppearance({theme:'light',colors:{action:'#Aa00Ff',selection:'#112233',navigation:'#123',control:'bad',unknown:'#000000'}});
 assert.deepEqual(p.colors,{action:'#aa00ff',selection:'#112233',navigation:null,control:null});assert.equal(p.style,'standard');assert.equal(p.scheme,'qingci');assert.equal(p.tabs,'classic');
 const blocked=createAppearance({storage:{getItem(){throw Error('denied');}}});assert.deepEqual(blocked.get(),defaults);assert.equal(blocked.save(defaults),false);
});

test('historical schemes and custom accents migrate to complete palettes',()=>{
 for(const [old,next]of [['tianqing','qingci'],['dunhuang','mineral'],['zhusha','shuimo'],['xuanqing','xuanqing'],['zhuyue','zhuyue'],['ouhe','ouhe'],['shuimo','shuimo'],['qingci','qingci'],['mineral','mineral']]){
  const p=normalizeAppearance({scheme:old,theme:'light',style:'airy',tabs:'pill',density:'comfortable',accent:'#3399AA'});assert.equal(p.scheme,next);assert.equal(p.colors.action,'#3399aa');assert.equal(p.tabs,'pill');assert.equal(p.style,'airy');assert.equal(p.density,'comfortable');assert.deepEqual(normalizeAppearance(p),p);
 }
 assert.equal(normalizeAppearance({colors:{action:null},accent:'#ff0000'}).colors.action,null,'explicit reset beats legacy accent');
});

test('old automatic choices resolve once and stay independent from later styles',()=>{
 for(const [style,scheme,tabs]of [['standard','mineral','classic'],['refined','mineral','segmented'],['aurora','ouhe','pill'],['pulse','zhuyue','pill'],['cinema','shuimo','underline'],['candy','ouhe','pill']]){
  const controller=createAppearance({storage:{getItem:()=>JSON.stringify({theme:'classic',scheme:'auto',tabs:'auto',style,accent:'#123456'})}});assert.equal(controller.get().scheme,scheme);assert.equal(controller.get().tabs,tabs);
  for(const nextStyle of STYLE_IDS){controller.preview({...controller.get(),style:nextStyle});assert.equal(controller.get().scheme,scheme);assert.equal(controller.get().tabs,tabs);assert.equal(controller.get().colors.action,'#123456');}
 }
 assert.equal(normalizeAppearance({theme:'light',scheme:'auto'}).scheme,'qingci');assert.equal(normalizeAppearance({theme:'graphite',scheme:'auto'}).scheme,'xuanqing');
});

test('every palette has readable distinct roles independent of geometry settings',()=>{
 for(const scheme of COLOR_SCHEME_IDS)for(const theme of ['classic','graphite','light']){
  const p=appearancePalette({scheme,theme});assert.ok(new Set(Object.values(p.colors)).size>=3);
  for(const role of ['text','muted','subtle'])for(const bg of role==='subtle'?['panel']:['panel','surface','hover'])assert.ok(colorContrast(p.surfaces[role],p.surfaces[bg])>=4.5,scheme+' '+theme+' '+role+' '+bg);
  assert.ok(colorContrast(p.surfaces.text,p.roles.header)>=4.5);assert.ok(colorContrast(p.surfaces.text,p.selected)>=4.5);
  for(const role of ['selection','navigation','control'])assert.ok(colorContrast(p.roles[role],p.surfaces.panel)>=4.5);
  for(const style of STYLE_IDS)for(const tabs of TAB_STYLE_IDS)assert.deepEqual(appearancePalette({scheme,theme,style,tabs}),p);
 }
});

test('custom colors affect only their role and retain readable interaction colors',()=>{
 for(const scheme of COLOR_SCHEME_IDS)for(const theme of ['classic','graphite','light'])for(const role of COLOR_ROLE_IDS)for(const color of ['#000000','#ffffff','#ff00ff','#0000ff','#ffff00']){
  const original=appearancePalette({scheme,theme}),p=appearancePalette({scheme,theme,colors:{[role]:color}});
  for(const other of COLOR_ROLE_IDS.filter(id=>id!==role))assert.equal(p.colors[other],original.colors[other]);assert.deepEqual(p.surfaces,original.surfaces);
  assert.ok(colorContrast(p.accent,p.onAccent)>=4.5);assert.ok(colorContrast(p.hover,p.onAccent)>=4.5);assert.ok(colorContrast(p.accentText,p.surfaces.panel)>=4.5);
  if(role!=='action')assert.ok(colorContrast(p.colors[role],p.surfaces.panel)>=4.5);if(role!=='selection')assert.equal(p.selected,original.selected);
 }
});

test('switching palettes replaces all rendered role values',()=>{
 const root=makeRoot(),controller=createAppearance({root});
 for(const scheme of COLOR_SCHEME_IDS)for(const theme of ['classic','graphite','light']){
  controller.preview({...controller.get(),scheme,theme});const p=controller.palette();assert.equal(root.dataset.paletteRoles,'true');assert.equal(root.dataset.tabOverride,'true');
  for(const role of ['selection','navigation','control','header','stage'])assert.equal(root.style.values.get('--ui-'+role),p.roles[role]);assert.equal(root.style.values.get('--ui-panel'),p.surfaces.panel);assert.equal(root.style.values.get('--ui-selection-surface'),p.selected);
 }
});

test('system mode preserves custom settings and follows media only when selected',()=>{
 let changed,removed;const root=makeRoot(),media={matches:false,addEventListener(type,fn){changed=fn;},removeEventListener(type,fn){removed=fn;}};
 const controller=createAppearance({root,media});controller.preview({...defaults,theme:'system',colors:{action:'#ffcc00',selection:'#bb88ee'}});const custom=controller.get().colors;assert.equal(root.dataset.theme,'light');media.matches=true;changed();assert.equal(root.dataset.theme,'classic');assert.deepEqual(controller.get().colors,custom);
 controller.preview({...controller.get(),theme:'light'});media.matches=false;changed();media.matches=true;changed();assert.equal(root.dataset.theme,'light');controller.dispose();assert.equal(removed,changed);
});

test('save, restore, reset and cancellation do not touch projects or leak mutable settings',()=>{
 const data=new Map([['momo-texture-tree:draft:v1','authored canvas'],['momo-texture-language:v1','["en"]']]),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)},controller=createAppearance({storage,root:makeRoot()});
 const original=controller.get(),saved={...original,scheme:'ouhe',style:'soft',tabs:'underline',density:'comfortable',colors:{action:'#336699',selection:'#eebb88',navigation:'#99aaff',control:'#88ccbb'}};
 controller.preview(saved);assert.equal(data.has(APPEARANCE_KEY),false);controller.preview(original);assert.deepEqual(controller.get(),original);assert.equal(controller.save(saved),true);assert.deepEqual(JSON.parse(data.get(APPEARANCE_KEY)),saved);assert.deepEqual(createAppearance({storage}).get(),saved);
 controller.preview({...saved,colors:defaultAppearanceColors()});assert.deepEqual(controller.get().colors,defaultAppearanceColors());assert.equal(controller.get().scheme,'ouhe');assert.equal(controller.get().tabs,'underline');assert.equal(data.get('momo-texture-tree:draft:v1'),'authored canvas');assert.equal(data.get('momo-texture-language:v1'),'["en"]');
 const copy=controller.get();copy.colors.action='#000000';assert.equal(controller.get().colors.action,null);
});
