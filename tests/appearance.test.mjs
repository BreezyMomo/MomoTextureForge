import test from 'node:test';
import assert from 'node:assert/strict';
import {APPEARANCE_KEY,APPEARANCE_PRESETS,STYLE_IDS,normalizeAppearance,appearancePalette,colorContrast,createAppearance} from '../web/appearance.js';
const defaults={theme:'classic',accent:null,style:'refined',density:'compact',tabs:'auto'};

test('appearance restores only supported themes and literal six-digit colors',()=>{
 for(const value of [null,[],{},'light',{theme:'unknown',accent:'url(https://example.com)',style:'unknown',density:'huge'}])assert.deepEqual(normalizeAppearance(value),defaults);
 assert.deepEqual(normalizeAppearance({theme:'light',accent:'#Aa00Ff',root:{children:[]}}),{...defaults,theme:'light',accent:'#aa00ff',style:'standard'});
 const controller=createAppearance({storage:{getItem(){throw Error('denied');}}});assert.deepEqual(controller.get(),defaults);assert.equal(controller.save({theme:'light'}),false);assert.equal(controller.palette().theme,'light');
});

test('custom colors retain readable button and accent text across every theme',()=>{
 for(const style of STYLE_IDS)for(const theme of ['classic','graphite','light'])for(const accent of ['#000000','#ffffff','#ffff00','#0000ff','#ff0000','#808080','#dfae72']){
  const p=appearancePalette({theme,style,accent}),panel=p.surfaces?.panel??{classic:'#1e2229',graphite:'#262729',light:'#ffffff'}[theme];
  assert.ok(colorContrast(p.accent,p.onAccent)>=4.5,theme+' '+accent+' button');
  assert.ok(colorContrast(p.hover,p.onAccent)>=4.5,theme+' '+accent+' hover');
  assert.ok(colorContrast(p.accentText,panel)>=4.5,theme+' '+accent+' text');
  assert.equal(p.accent,accent);
 }
});

test('creative presets use independent UI palettes and remove every override on return to an existing style',()=>{
 const values=new Map(),root={dataset:{},style:{setProperty:(key,value)=>values.set(key,value),removeProperty:key=>values.delete(key)}};
 const controller=createAppearance({root});const original=controller.palette();
 for(const preset of APPEARANCE_PRESETS){
  controller.preview({...preset,accent:null});const p=controller.palette();
  assert.equal(root.dataset.interfaceStyle,preset.style);assert.equal(values.get('--ui-panel'),p.surfaces.panel);
  assert.ok(colorContrast(p.accent,p.onAccent)>=4.5);assert.ok(colorContrast(p.surfaces.text,p.surfaces.panel)>=4.5);assert.ok(colorContrast(p.surfaces.muted,p.surfaces.panel)>=4.5);
  const vivid=appearancePalette({...preset,theme:'classic'}),neutral=appearancePalette({...preset,theme:'graphite'});assert.notEqual(vivid.surfaces.panel,neutral.surfaces.panel);
  controller.preview({theme:'classic',style:'standard'});assert.equal(controller.palette().surfaces,undefined);assert.equal(values.has('--ui-panel'),false);assert.equal(values.has('--ui-line-strong'),false);
  assert.equal(controller.palette().accent,original.accent);
 }
});

test('system changes follow only the system preset; preview, cancel and saving stay outside project storage',()=>{
 const data=new Map([['momo-texture-tree:draft:v1','authored canvas'],['momo-texture-language:v1','["en"]']]);
 let changed,removed;
 const media={matches:false,addEventListener(type,fn){changed=fn;},removeEventListener(type,fn){removed=fn;}};
 const root={dataset:{},style:{setProperty(key,value){this[key]=value;}}};
 const storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 const controller=createAppearance({storage,root,media}),original=controller.get();
 controller.preview({theme:'system',accent:'#ffcc00'});assert.equal(root.dataset.theme,'light');assert.equal(data.has(APPEARANCE_KEY),false);
 media.matches=true;changed();assert.equal(root.dataset.theme,'classic');assert.equal(controller.palette().accent,'#ffcc00');
 controller.preview(original);assert.equal(root.dataset.theme,'classic');
 assert.equal(controller.save({theme:'graphite',style:'soft',density:'comfortable'}),true);media.matches=false;changed();assert.equal(root.dataset.theme,'graphite');assert.equal(root.dataset.interfaceStyle,'soft');assert.equal(root.dataset.density,'comfortable');
 assert.equal(data.get('momo-texture-tree:draft:v1'),'authored canvas');assert.equal(data.get('momo-texture-language:v1'),'["en"]');
 assert.deepEqual(JSON.parse(data.get(APPEARANCE_KEY)),{theme:'graphite',accent:null,style:'soft',density:'comfortable',tabs:'auto'});
 const restored=createAppearance({storage});assert.deepEqual(restored.get(),controller.get());
 controller.dispose();assert.equal(removed,changed);
});

test('existing color-only preferences migrate without losing their palette',()=>{
 const old={theme:'light',accent:'#336699'};
 const storage={getItem:()=>JSON.stringify(old)};
 const controller=createAppearance({storage});assert.deepEqual(controller.get(),{...old,style:'standard',density:'compact',tabs:'auto'});
 const original=controller.get();controller.preview({...original,style:'minimal',density:'comfortable'});assert.deepEqual(controller.palette(),appearancePalette(old));
 controller.preview(original);assert.deepEqual(controller.get(),original);
});

test('saved original styling stays original while fresh profiles use a distinct refined preset',()=>{
 const old={theme:'classic',accent:'#dfae72',style:'standard',density:'comfortable',tabs:'auto'};
 const restored=createAppearance({storage:{getItem:()=>JSON.stringify(old)}});
 assert.deepEqual(restored.get(),old);
 assert.equal(normalizeAppearance({theme:'classic'}).style,'standard');
 assert.equal(normalizeAppearance(null).style,'refined');
 restored.preview({...old,style:'refined'});assert.equal(restored.get().style,'refined');
 restored.preview(old);assert.deepEqual(restored.get(),old);
});

test('tab shape is independent from skin, survives saving, and auto follows the skin without losing compatibility',()=>{
 const data=new Map(),root={dataset:{},style:{setProperty(){},removeProperty(){}}};
 const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const controller=createAppearance({root,storage});
 controller.save({theme:'classic',style:'aurora',tabs:'underline',accent:'#aabbcc',density:'comfortable'});
 assert.equal(root.dataset.tabStyle,'underline');assert.equal(root.dataset.tabOverride,'true');
 controller.preview({...controller.get(),style:'standard'});assert.equal(root.dataset.tabStyle,'underline');assert.equal(controller.palette().accent,'#aabbcc');
 const restored=createAppearance({storage});assert.equal(restored.get().tabs,'underline');assert.equal(restored.get().style,'aurora');
 controller.preview({...controller.get(),tabs:'auto'});assert.equal(root.dataset.tabStyle,'classic');assert.equal(root.dataset.tabOverride,'false');
 controller.preview({...controller.get(),style:'pulse'});assert.equal(root.dataset.tabStyle,'pill');
 assert.equal(normalizeAppearance({theme:'classic',tabs:'unsupported'}).tabs,'auto');
});
