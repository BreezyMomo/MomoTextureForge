import test from 'node:test';
import assert from 'node:assert/strict';
import {APPEARANCE_KEY,normalizeAppearance,appearancePalette,colorContrast,createAppearance} from '../web/appearance.js';
const defaults={theme:'classic',accent:null,style:'refined',density:'compact'};

test('appearance restores only supported themes and literal six-digit colors',()=>{
 for(const value of [null,[],{},'light',{theme:'unknown',accent:'url(https://example.com)',style:'unknown',density:'huge'}])assert.deepEqual(normalizeAppearance(value),defaults);
 assert.deepEqual(normalizeAppearance({theme:'light',accent:'#Aa00Ff',root:{children:[]}}),{...defaults,theme:'light',accent:'#aa00ff',style:'standard'});
 const controller=createAppearance({storage:{getItem(){throw Error('denied');}}});assert.deepEqual(controller.get(),defaults);assert.equal(controller.save({theme:'light'}),false);assert.equal(controller.palette().theme,'light');
});

test('custom colors retain readable button and accent text across every theme',()=>{
 for(const theme of ['classic','graphite','light'])for(const accent of ['#000000','#ffffff','#ffff00','#0000ff','#ff0000','#808080','#dfae72']){
  const p=appearancePalette({theme,accent}),panel={classic:'#1e2229',graphite:'#262729',light:'#ffffff'}[theme];
  assert.ok(colorContrast(p.accent,p.onAccent)>=4.5,theme+' '+accent+' button');
  assert.ok(colorContrast(p.hover,p.onAccent)>=4.5,theme+' '+accent+' hover');
  assert.ok(colorContrast(p.accentText,panel)>=4.5,theme+' '+accent+' text');
  assert.equal(p.accent,accent);
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
 assert.deepEqual(JSON.parse(data.get(APPEARANCE_KEY)),{theme:'graphite',accent:null,style:'soft',density:'comfortable'});
 const restored=createAppearance({storage});assert.deepEqual(restored.get(),controller.get());
 controller.dispose();assert.equal(removed,changed);
});

test('existing color-only preferences migrate without losing their palette',()=>{
 const old={theme:'light',accent:'#336699'};
 const storage={getItem:()=>JSON.stringify(old)};
 const controller=createAppearance({storage});assert.deepEqual(controller.get(),{...old,style:'standard',density:'compact'});
 const original=controller.get();controller.preview({...original,style:'minimal',density:'comfortable'});assert.deepEqual(controller.palette(),appearancePalette(old));
 controller.preview(original);assert.deepEqual(controller.get(),original);
});

test('saved original styling stays original while fresh profiles use a distinct refined preset',()=>{
 const old={theme:'classic',accent:'#dfae72',style:'standard',density:'comfortable'};
 const restored=createAppearance({storage:{getItem:()=>JSON.stringify(old)}});
 assert.deepEqual(restored.get(),old);
 assert.equal(normalizeAppearance({theme:'classic'}).style,'standard');
 assert.equal(normalizeAppearance(null).style,'refined');
 restored.preview({...old,style:'refined'});assert.equal(restored.get().style,'refined');
 restored.preview(old);assert.deepEqual(restored.get(),old);
});
