import {node,cloneNode} from './tree-model.js';
import {CREATIVE_EFFECTS} from './creative-effect-specs.js';
import {effectOrder} from './post-effect-specs.js';
function motif(){
 const g=node('group');g.name='彩色心形';
 const fill=node('shape','WaterCaustics');fill.name='彩色纹理';fill.shapeClock.follow=false;fill.color={mode:'own',fill:'gradient',low:'#273fbc',high:'#ffba74'};
 const star=node('shape','Star');star.name='高光星';Object.assign(star.transform,{width:.35,height:.35,x:.45,y:.58});star.color={mode:'own',fill:'solid',low:'#fff6df',high:'#fff6df'};
 const mask=node('shape','HeartLeafTeardrop');mask.name='心形遮罩';mask.transform.width=mask.transform.height=.9;g.mask=mask;g.children=[fill,star];return g;
}
const enable=(n,id,values={})=>Object.assign(n.postEffects[id],{enabled:true,...values});
export function creativeEffectSamples(){
 const chart=node('group');chart.name='后处理风格对照';const base=motif();
 for(const [i,id]of ['original',...CREATIVE_EFFECTS.map(s=>s.id)].entries()){
  const tile=cloneNode(base);tile.name=id;Object.assign(tile.transform,{width:.22,height:.22,x:(i%3+.5)/3,y:1-(Math.floor(i/3)+.5)/4});
  if(id!=='original')enable(tile,id);if(id==='halftone')tile.postEffects.halftone.dotSize=18;if(id==='dither')tile.postEffects.dither.cellSize=4;
  if(id==='ascii')tile.postEffects.ascii.glyphSize=28;chart.children.push(tile);
 }
 const comic=motif();comic.name='漫画印刷';enable(comic,'halftone',{dotSize:9,inkMode:1});enable(comic,'edge',{color:'#171726',strength:1.8});comic.effectOrder=effectOrder(['halftone','edge']);
 const handheld=motif();handheld.name='复古掌机';handheld.postEffects.pixelate.enabled=true;handheld.postEffects.pixelate.size=4;enable(handheld,'dither',{paletteMode:3,cellSize:4});handheld.effectOrder=effectOrder(['pixelate','dither']);
 const hologram=motif();hologram.name='全息故障';enable(hologram,'glitch',{chance:.55,displacement:16});enable(hologram,'scanline',{density:110,strength:.3});hologram.postFx[1]=.65;hologram.postEffects.bloom.enabled=true;hologram.effectOrder=effectOrder(['glitch','scanline','bloom']);
 return [
  {nameKey:'examples.creativeEffects.name',description:'examples.creativeEffects.description',root:chart,output:{alpha:false,background:'#e9e6de'}},
  {nameKey:'examples.comicPrint.name',description:'examples.comicPrint.description',root:comic},
  {nameKey:'examples.handheld.name',description:'examples.handheld.description',root:handheld},
  {nameKey:'examples.hologramGlitch.name',description:'examples.hologramGlitch.description',root:hologram,output:{seconds:2,frames:60,loopExport:false}}
 ].map(s=>({...s,category:'composition',tags:['modules.imageFilters']}));
}
