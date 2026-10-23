import test from 'node:test';
import assert from 'node:assert/strict';
import {APPEARANCE_KEY,THEME_IDS,PRESET_THEME_IDS,STYLE_IDS,COLOR_ROLE_IDS,TAB_STYLE_IDS,normalizeAppearance,appearancePalette,colorContrast,createAppearance,defaultAppearanceColors} from '../web/appearance.js';
const defaults={theme:'xuanhei',style:'refined',density:'compact',tabs:'segmented',colors:defaultAppearanceColors()};
const makeRoot=()=>({dataset:{},style:{values:new Map(),setProperty(key,value){this.values.set(key,value);},removeProperty(key){this.values.delete(key);}}});

test('complete themes have one selection and safe defaults without palette/mode migrations',()=>{
 assert.deepEqual(THEME_IDS,['xuanhei','shuimo','yuebai','qingci','qinghua','mineral','ouhe']);
 for(const raw of [null,[],{},'light',{theme:'constructor',scheme:'ouhe',style:'unknown',colors:{action:'url(https://example.com)'}}])assert.deepEqual(normalizeAppearance(raw),defaults);
 for(const theme of ['system','classic','graphite','light','tianqing','zhuyue'])assert.equal(normalizeAppearance({theme}).theme,'xuanhei');
 const p=normalizeAppearance({theme:'ouhe',colors:{action:'#Aa00Ff',selection:'#112233',navigation:'#123',control:'bad'}});
 assert.deepEqual(p.colors,{action:'#aa00ff',selection:'#112233',navigation:null,control:null});assert.equal('scheme' in p,false);
 const blocked=createAppearance({storage:{getItem(){throw Error('denied');}}});assert.deepEqual(blocked.get(),defaults);assert.equal(blocked.save(defaults),false);
});

test('complete theme, shape and tabs remain independent',()=>{
 for(const theme of PRESET_THEME_IDS)for(const tabs of TAB_STYLE_IDS){
  const controller=createAppearance({storage:{getItem:()=>JSON.stringify({...defaults,theme,tabs,colors:{action:'#123456'}})}});
  for(const style of STYLE_IDS){controller.preview({...controller.get(),style});assert.equal(controller.get().theme,theme);assert.equal(controller.get().tabs,tabs);assert.equal(controller.get().colors.action,'#123456');}
 }
});

test('workspace, headers and content have distinct readable surfaces in every complete theme',()=>{
 for(const theme of PRESET_THEME_IDS){
  const p=appearancePalette({theme});assert.equal(new Set([p.surfaces.bg,p.roles.header,p.surfaces.panel]).size,3);
  for(const role of ['text','muted','subtle'])for(const bg of ['bg','inset','panel','surface','hover'])assert.ok(colorContrast(p.surfaces[role],p.surfaces[bg])>=4.5,theme+' '+role+'/'+bg);
  for(const role of ['header-text','header-muted'])assert.ok(colorContrast(p.roles[role],p.roles.header)>=4.5,theme+' '+role);
  assert.ok(colorContrast(p.roles['header-navigation'],p.roles['header-navigation-bg'])>=4.5);
  assert.ok(colorContrast(p.surfaces.text,p.selected)>=4.5);
  for(const role of ['selection','navigation','control'])assert.ok(colorContrast(p.roles[role],p.roleSurfaces[role])>=4.5,theme+' '+role);
  for(const style of STYLE_IDS)for(const tabs of TAB_STYLE_IDS)assert.deepEqual(appearancePalette({theme,style,tabs}),p);
 }
});

test('custom interactions do not recolor workspace or content and remain readable',()=>{
 for(const theme of PRESET_THEME_IDS)for(const role of COLOR_ROLE_IDS)for(const color of ['#000000','#ffffff','#ff00ff','#0000ff','#ffff00']){
  const original=appearancePalette({theme}),p=appearancePalette({theme,colors:{[role]:color}});
  for(const other of COLOR_ROLE_IDS.filter(id=>id!==role))assert.equal(p.colors[other],original.colors[other]);assert.deepEqual(p.surfaces,original.surfaces);assert.equal(p.roles.header,original.roles.header);
  assert.ok(colorContrast(p.accent,p.onAccent)>=4.5);assert.ok(colorContrast(p.hover,p.onAccent)>=4.5);assert.ok(colorContrast(p.accentText,p.surfaces.panel)>=4.5);
  if(role!=='action')assert.ok(colorContrast(p.colors[role],p.surfaces.panel)>=4.5);
 }
});

test('rendering uses the complete theme identity and internal contrast environment',()=>{
 const root=makeRoot(),controller=createAppearance({root});
 for(const theme of PRESET_THEME_IDS){controller.preview({...controller.get(),theme});const p=controller.palette();assert.equal(root.dataset.appearanceTheme,theme);assert.equal(root.dataset.theme,p.theme);assert.equal(root.dataset.paletteRoles,'true');
  for(const role of ['selection','navigation','control','header','stage','header-text','section'])assert.equal(root.style.values.get('--ui-'+role),p.roles[role]);assert.equal(root.style.values.get('--ui-panel'),p.surfaces.panel);
 }
});

test('save, cancel and reset isolate preferences from artwork and undo storage',()=>{
 const data=new Map([['momo-texture-tree:draft:v1','authored canvas'],['momo-texture-language:v1','["en"]']]),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)},controller=createAppearance({storage,root:makeRoot()});
 const original=controller.get(),saved={...original,theme:'ouhe',style:'soft',tabs:'underline',density:'comfortable',colors:{action:'#336699',selection:'#eebb88',navigation:'#99aaff',control:'#88ccbb'}};
 controller.preview(saved);assert.equal(data.has(APPEARANCE_KEY),false);controller.preview(original);assert.deepEqual(controller.get(),original);assert.equal(controller.save(saved),true);assert.deepEqual(JSON.parse(data.get(APPEARANCE_KEY)),saved);assert.deepEqual(createAppearance({storage}).get(),saved);
 controller.preview({...saved,colors:defaultAppearanceColors()});assert.deepEqual(controller.get().colors,defaultAppearanceColors());assert.equal(controller.get().theme,'ouhe');assert.equal(controller.get().tabs,'underline');assert.equal(data.get('momo-texture-tree:draft:v1'),'authored canvas');assert.equal(data.get('momo-texture-language:v1'),'["en"]');
 const copy=controller.get();copy.colors.action='#000000';assert.equal(controller.get().colors.action,null);
});

test('carbon theme has deeper neutral surfaces without the ink theme blue cast',()=>{
 const carbon=appearancePalette({theme:'xuanhei'}),ink=appearancePalette({theme:'shuimo'});
 for(const value of [...Object.values(carbon.surfaces).slice(0,7),carbon.roles.header]){
  const channels=[1,3,5].map(at=>parseInt(value.slice(at,at+2),16));
  assert.equal(Math.max(...channels)-Math.min(...channels),0,'neutral structural surface '+value);
 }
 for(const key of ['bg','inset','panel','surface','hover']){
  const brightness=value=>[1,3,5].reduce((sum,at)=>sum+parseInt(value.slice(at,at+2),16),0);
  assert.ok(brightness(carbon.surfaces[key])<brightness(ink.surfaces[key]),'deeper '+key);
 }
});
