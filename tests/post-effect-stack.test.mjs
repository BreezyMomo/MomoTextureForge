import test from 'node:test';
import assert from 'node:assert/strict';
import {node,project,pathSet,evaluateNode,sanitizeTree,cloneNode,expandInstances} from '../web/tree-model.js';
import {EFFECT_IDS,effectStack,effectPresent,effectEnabled,effectAddValues,effectRemoveValues,effectEnableValues,effectResetAllValues,reorderEffects,sanitizeEffectPresence} from '../web/post-effect-specs.js';
import {EFFECT_CATEGORIES,effectCategory,matchingEffects,compactEffectSummary} from '../web/post-effect-catalog.js';
import {effectMargins} from '../web/render-bounds.js';
const apply=(n,values)=>{for(const [path,value]of Object.entries(values))pathSet(n,path,value);return n;};
test('new nodes start with an empty visible stack; adding appends and bypassing retains the item',()=>{
 const n=node();assert.deepEqual(effectStack(n),[]);apply(n,effectAddValues(n,'noiseWarp'));assert.deepEqual(effectStack(n),['noiseWarp']);assert.ok(effectEnabled(n,'noiseWarp'));
 apply(n,effectEnableValues(n,'noiseWarp',false));assert.deepEqual(effectStack(n),['noiseWarp']);assert.equal(effectEnabled(n,'noiseWarp'),false);
 apply(n,effectAddValues(n,'blur'));assert.deepEqual(effectStack(n),['noiseWarp','blur']);assert.equal(n.postFx[0],4);assert.deepEqual(effectAddValues(n,'blur'),{});
});
test('legacy enabled effects, custom disabled settings and animated effects migrate without opening unused defaults',()=>{
 const n=node();delete n.effectPresence;n.postFx[0]=9;Object.assign(n.postEffects.glitch,{enabled:false,displacement:42});n.tracks['postEffects.dissolve.progress']={keys:[[0,0],[1,1]],ease:'linear'};
 assert.deepEqual(effectStack(n),['blur','glitch','dissolve']);assert.equal(effectPresent(n,'bloom'),false);assert.equal(effectEnabled(n,'glitch'),false);
 const p=project();p.root.children=[n];assert.deepEqual(effectStack(sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0]),effectStack(n));
});
test('removal suppresses an animated enable track without rewriting any settings or keyframes',()=>{
 const n=node();apply(n,effectAddValues(n,'noiseWarp'));n.postEffects.noiseWarp.warpX=38;n.tracks['postEffects.noiseWarp.enabled']={keys:[[0,false],[.4,true]],ease:'hold'};
 n.tracks['postEffects.noiseWarp.warpX']={keys:[[0,10],[1,38]],ease:'linear'};const before=structuredClone(n);
 apply(n,effectRemoveValues('noiseWarp'));assert.equal(effectPresent(n,'noiseWarp'),false);assert.equal(effectEnabled(evaluateNode(n,.6).node,'noiseWarp'),false);assert.deepEqual(effectMargins(evaluateNode(n,.6).node),[0,0]);assert.deepEqual(n.postEffects,before.postEffects);assert.deepEqual(n.tracks,before.tracks);
 apply(n,effectAddValues(n,'noiseWarp'));assert.deepEqual(n.postEffects,before.postEffects);assert.deepEqual(n.tracks,before.tracks);assert.equal(effectEnabled(evaluateNode(n,.6).node,'noiseWarp'),true);assert.equal(effectEnabled(evaluateNode(n,.1).node,'noiseWarp'),false);
});
test('removed zero-valued legacy effects restore exactly, and saved components preserve presence and ordering',()=>{
 const p=project(),g=node('group');g.children=[node()];p.root.children=[g];apply(g,effectAddValues(g,'bloom'));apply(g,effectAddValues(g,'dissolve'));g.postFx[1]=0;apply(g,effectRemoveValues('bloom'));apply(g,effectAddValues(g,'bloom'));assert.equal(g.postFx[1],0);assert.deepEqual(effectStack(g),['dissolve','bloom']);
 g.effectOrder=reorderEffects(g,['bloom','dissolve']);const restored=cloneNode(sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0]);assert.deepEqual(effectStack(restored),['bloom','dissolve']);assert.deepEqual(restored.effectPresence,g.effectPresence);
 g.arrange[0]=1;const expanded=expandInstances(p.root,g.id,0).children[0];assert.deepEqual(expanded.effectPresence,g.effectPresence);assert.ok(expanded.children.every(n=>!effectStack(n).length));
});
test('presence is validated and parameter reset retains stack membership without marking unused effects removed',()=>{
 assert.deepEqual(sanitizeEffectPresence(JSON.parse('{"__proto__":true,"missing":true,"blur":true,"bloom":false,"noiseWarp":"yes"}')),{blur:true,bloom:false});
 const n=node();apply(n,effectAddValues(n,'noiseWarp'));apply(n,effectAddValues(n,'dissolve'));apply(n,effectRemoveValues('dissolve'));apply(n,effectResetAllValues(n));
 assert.deepEqual(effectStack(n),['noiseWarp']);assert.equal(effectEnabled(n,'noiseWarp'),false);assert.equal(n.effectPresence.dissolve,false);assert.equal(n.effectPresence.bloom,undefined);
 apply(n,effectAddValues(n,'bloom'));assert.equal(effectEnabled(n,'bloom'),true);assert.equal(n.postFx[1],.6);
});
test('every effect has one discoverable category and bilingual search supports uses as well as IDs',()=>{
 assert.equal(EFFECT_IDS.length,31);for(const id of EFFECT_IDS)assert.ok(EFFECT_CATEGORIES.includes(effectCategory(id)));
 assert.deepEqual(matchingEffects('水波').map(s=>s.id),['noiseWarp','shockwave']);assert.deepEqual(matchingEffects('WATER').map(s=>s.id),['noiseWarp','shockwave']);assert.deepEqual(matchingEffects('noiseWarp').map(s=>s.id),['noiseWarp']);assert.ok(matchingEffects('手绘').some(s=>s.id==='sketch'));
 assert.ok(matchingEffects('', 'warp').every(s=>effectCategory(s.id)==='warp'));assert.equal(matchingEffects('^$[invalid').length,0);assert.equal(matchingEffects().length,31);
});
test('compact summaries report mixed values and do not mutate authored projects',()=>{
 const a=node(),b=node(),before=JSON.stringify(a);a.postEffects.noiseWarp.warpX=12;b.postEffects.noiseWarp.warpX=24;const snapshot=JSON.stringify([a,b]),summary=compactEffectSummary([a,b],'noiseWarp');assert.ok(summary.includes('12')===false&&summary.includes('24')===false);a.postEffects.noiseWarp.warpX=12;assert.ok(compactEffectSummary([a],'noiseWarp').includes('12'));assert.equal(JSON.stringify([a,b]),snapshot);assert.ok(JSON.parse(before).postEffects.noiseWarp.warpX===12);
});
