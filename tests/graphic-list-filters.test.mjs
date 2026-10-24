import test from 'node:test';
import assert from 'node:assert/strict';
import {filterGraphicList,graphicIsAnimated} from '../web/graphic-list-filters.js';
import {node} from '../web/tree-model.js';
const entries=[
 {id:'a',name:'Glow',aliases:{en:'Bloom'},kind:'formula',category:'Energy',root:node('shape','Spiral')},
 {id:'b',name:'Cloud image',kind:'image',category:'Noise',root:node()},
 {id:'c',name:'Frame',kind:'composition',category:'Energy',root:node('group')},
 {id:'d',name:'Noise',kind:'formula',category:'Noise',root:node()}
];
test('browse modes combine with category multiselect and multilingual search without resource type restrictions',()=>{
 const before=JSON.stringify(entries);
 assert.deepEqual(filterGraphicList(entries),entries);
 assert.deepEqual(filterGraphicList(entries,{mode:'favorites',favorites:new Set(['b','c'])}).map(e=>e.id),['b','c']);
 assert.deepEqual(filterGraphicList(entries,{mode:'favorites',favorites:new Set(['b','c']),categories:['Energy']}).map(e=>e.id),['c']);
 assert.deepEqual(filterGraphicList(entries,{categories:['Energy','Noise']}).map(e=>e.id),['a','b','c','d']);
 assert.deepEqual(filterGraphicList(entries,{categories:['Energy'],query:' BLOOM '}).map(e=>e.id),['a']);
 assert.deepEqual(filterGraphicList(entries,{mode:'animated'}).map(e=>e.id),['a']);
 assert.equal(JSON.stringify(entries),before);
});
test('recent graphics follow latest usage order, omit removed entries and deduplicate',()=>{
 const recent=['preset:c','preset:missing','preset:a','preset:c','preset:b'];
 assert.deepEqual(filterGraphicList(entries,{mode:'recent',recent}).map(e=>e.id),['c','a','b']);
 assert.deepEqual(filterGraphicList(entries,{mode:'recent',recent,categories:['Energy'],query:'Bloom'}).map(e=>e.id),['a']);
});
test('animated graphics include intrinsic time, active keys, UV motion, group children and masks',()=>{
 assert.equal(graphicIsAnimated(entries[0]),true);const root=node('shape','Spiral');root.shapeClock.follow=false;assert.equal(graphicIsAnimated({root}),false);root.shapeClock.follow=true;root.shapeClock.speed=0;assert.equal(graphicIsAnimated({root}),false);
 const group=node('group'),child=node();group.children=[child];assert.equal(graphicIsAnimated({root:group}),false);child.tracks.opacity={keys:[[0,0],[1,1]]};assert.equal(graphicIsAnimated({root:group}),true);child.tracks.opacity.muted=true;assert.equal(graphicIsAnimated({root:group}),false);child.tracks.opacity.muted=false;child.animationEnabled=false;assert.equal(graphicIsAnimated({root:group}),false);
 child.uv[4]=1;assert.equal(graphicIsAnimated({root:group}),true);child.uv[4]=0;group.mask=node('shape','Spiral');assert.equal(graphicIsAnimated({root:group}),true);
});

test('time-based post effects share animation detection with graphic and node badges',()=>{
 const root=node(),before=JSON.stringify(root);
 assert.equal(graphicIsAnimated({root}),false);assert.equal(JSON.stringify(root),before);
 root.postEffects.glitch.enabled=true;root.effectPresence.glitch=true;
 assert.equal(graphicIsAnimated({root}),true);
 root.postEffects.glitch.rate=0;assert.equal(graphicIsAnimated({root}),false);
 root.postEffects.glitch.rate=8;root.postEffects.glitch.enabled=false;assert.equal(graphicIsAnimated({root}),false);
 root.postEffects.glitch.enabled=true;root.effectPresence.glitch=false;assert.equal(graphicIsAnimated({root}),false);
 root.effectPresence.glitch=true;const group=node('group');group.children=[root];
 assert.equal(graphicIsAnimated({root:group}),true);
 root.postEffects.glitch.enabled=false;root.postEffects.bloom.enabled=true;root.effectPresence.bloom=true;
 assert.equal(graphicIsAnimated({root:group}),false,'a static enabled effect does not create a motion badge');
});
