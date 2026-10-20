import {node,project,cloneNode} from './tree-model.js';
function buildSamples(){
 const pulse=node('group');pulse.name='脉冲环';const ring=node('shape','Ring');ring.tracks['params.0']={mode:'multiply',ease:'smooth',keys:[[0,.6],[.5,1],[1,.6]]};pulse.children=[ring];
 const seal=node('group');seal.name='多圈法阵';const rings=node('group');rings.name='同心脉冲环组';rings.children=[.45,.7,1].map((size,i)=>{const r=cloneNode(pulse);r.name=['内圈','中圈','外圈'][i];r.transform.width=size;r.transform.height=size;r.timing.offset=i*.12;return r;});seal.children.push(rings);
 const glyph=node('shape','Star');glyph.params[5]=1;glyph.arrange[0]=8;glyph.arrange[33]=1;glyph.arrange[3]=12;glyph.arrange[4]=.12;glyph.arrange[5]=.38;glyph.tracks['transform.rotation']={mode:'absolute',ease:'linear',keys:[[0,0],[1,360]]};seal.children.push(glyph);
 const summon=node('group');summon.name='召唤特效';summon.children=[cloneNode(seal)];summon.color.mode='own';summon.color.high='#80dfff';const shock=node('shape','Ring');shock.name='外圈冲击波';shock.timing.start=.2;shock.timing.end=.8;shock.timing.outside='hide';shock.tracks['params.0']={mode:'absolute',ease:'linear',keys:[[0,.05],[1,.95]]};shock.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,1],[1,0]]};summon.children.push(shock);
 return [pulse,seal,summon].map(root=>({name:root.name,root}));
}
export function sampleProject(index=2){const p=project();p.root.children=[cloneNode(buildSamples()[index].root)];p.name=buildSamples()[index].name;return p;}

// Only the complete effect is exposed in the gallery. Simpler builds are test fixtures.
export function treeSamples(){return [buildSamples()[2]];}
