// Demonstration art and settings belong to the picker, never to the user's nodes.
export const EFFECT_PREVIEW_SIZE=[384,240];
const specimen=(art,values={},motion=false,transparency=false)=>({art,values,motion,transparency});
export const EFFECT_PREVIEWS={
 blur:specimen('detail',{radius:7}),bloom:specimen('light',{strength:1.5,radius:24,threshold:.48}),
 sharpen:specimen('detail',{strength:2.3}),chromatic:specimen('light',{distance:7,direction:0}),
 posterize:specimen('poster',{darkSteps:7,lightSteps:0}),pixelate:specimen('poster',{size:24}),
 vignette:specimen('poster',{strength:.65,range:1.4,color:'#122333'}),scanline:specimen('signal',{density:95,strength:.5,speed:.45},true),
 kaleidoscope:specimen('prism',{segments:7,rotation:18}),mirror:specimen('prism',{mirrorX:true,mirrorY:false}),
 swirl:specimen('grid',{strength:4,radius:.75}),edge:specimen('detail',{width:2,strength:1.6,color:'#95e1e4'}),
 tricolor:specimen('poster',{shadow:'#16243b',midtone:'#e97e79',highlight:'#ffe7bd'}),
 radialMask:specimen('poster',{radius:.43,feather:.22},false,true),unblack:specimen('matte',{strength:1},false,true),
 normal:specimen('relief',{strength:16,sampleStep:2}),
 sketch:specimen('heart',{fillStyle:3,fillColor:'#f18a83',strokeColor:'#ffe8d0',roughness:1,hatchGap:11,hatchWidth:1.8,strokeWidth:2.5}),
 halftone:specimen('poster',{dotSize:16,inkColor:'#1b3044',paperColor:'#ffe3bb'}),
 dither:specimen('poster',{paletteMode:3,cellSize:5,levels:4}),
 glitch:specimen('signal',{chance:.7,displacement:32,slices:18,rgbOffset:5},true),
 zoomBlur:specimen('light',{blurDistance:72,innerRadius:.12}),
 kuwahara:specimen('paint',{paintRadius:12,anisotropy:.6}),
 bevel:specimen('badge',{bevelWidth:9,relief:3,lightColor:'#ffdfb0',shadowColor:'#273c65'}),
 xdog:specimen('paint',{lineScale:2.2,inkColor:'#233349',paperColor:'#ffe7c6',lineThreshold:-.035}),
 crt:specimen('signal',{lineDensity:120,lineStrength:.25,curvature:.08,grain:.04,maskStrength:.12,edgeShade:.15},true),
 ascii:specimen('poster',{glyphSize:26,colored:false,inkColor:'#a3e7d4',paperOpacity:1,paperColor:'#122331'}),
 pixelSort:specimen('poster',{span:160,cellSize:2,lowThreshold:.12,highThreshold:.95}),
 noiseWarp:specimen('grid',{warpMode:1,warpX:12,warpY:8,warpScale:110,warpDetail:2,warpMotion:1,loopSeconds:3,motionSpeed:45},true),
 dissolve:specimen('heart',{progress:.3,dissolveScale:60,edgeWidth:.09,burnColor:'#ffc984'},true,true),
 shockwave:specimen('grid',{progress:.5,waveRadius:.92,waveWidth:72,displacement:38,waveDecay:.35},true),
 liquidFusion:specimen('drops',{fusionRadius:35,fusionThreshold:.27,fusionSoftness:.07},true)
};
export const effectPreviewSpec=id=>EFFECT_PREVIEWS[id]??specimen('detail');
const INK='#122333',TEAL='#86d7d1',CORAL='#f08c83',CREAM='#ffe6bd';
const fill=(ctx,color)=>{ctx.fillStyle=color;ctx.fillRect(0,0,384,240);};
function gradient(ctx,x0,y0,x1,y1,stops){const g=ctx.createLinearGradient(x0,y0,x1,y1);stops.forEach(([at,color])=>g.addColorStop(at,color));return g;}
function disc(ctx,x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function rounded(ctx,x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function heart(ctx){ctx.beginPath();ctx.moveTo(192,202);ctx.bezierCurveTo(174,185,104,139,104,95);ctx.bezierCurveTo(104,43,164,36,192,77);ctx.bezierCurveTo(220,36,280,43,280,95);ctx.bezierCurveTo(280,139,210,185,192,202);ctx.closePath();}
export function drawEffectSpecimen(document,art,seconds=null){
 const canvas=document.createElement('canvas');[canvas.width,canvas.height]=EFFECT_PREVIEW_SIZE;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.lineCap='round';ctx.lineJoin='round';
 if(!['heart','drops','relief','light','badge'].includes(art))fill(ctx,INK);
 if(art==='detail'){
  rounded(ctx,27,27,330,186,20,'#203a4c');ctx.fillStyle=CREAM;ctx.font='600 94px Georgia, serif';ctx.fillText('Aa',52,141);
  ctx.strokeStyle=TEAL;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(273,48);ctx.lineTo(329,110);ctx.lineTo(273,172);ctx.lineTo(217,110);ctx.closePath();ctx.stroke();
  for(let i=0;i<6;i++)rounded(ctx,55,168+i*5,122-i*12,1.5,1,i%2?TEAL:CORAL);
  ctx.filter='blur(.6px)';ctx.strokeStyle=CORAL;ctx.lineWidth=1.8;for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(240+i*9,82);ctx.lineTo(240+i*9,137);ctx.stroke();}ctx.filter='none';
 }
 if(art==='light'){
  ctx.save();ctx.translate(192,120);ctx.rotate(-.18);ctx.strokeStyle=TEAL;ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-97,-48,194,96,47);ctx.stroke();ctx.restore();
  ctx.fillStyle=CREAM;ctx.beginPath();ctx.moveTo(207,36);ctx.lineTo(152,126);ctx.lineTo(190,123);ctx.lineTo(175,202);ctx.lineTo(233,103);ctx.lineTo(194,108);ctx.closePath();ctx.fill();
  disc(ctx,90,68,4,CORAL);disc(ctx,289,169,3,TEAL);ctx.strokeStyle=CORAL;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(286,52);ctx.lineTo(286,68);ctx.moveTo(278,60);ctx.lineTo(294,60);ctx.stroke();
 }
 if(art==='grid'){
  fill(ctx,'#163044');ctx.lineWidth=1.4;ctx.strokeStyle='#4d8790';for(let x=0;x<=384;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,240);ctx.stroke();}for(let y=0;y<=240;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(384,y);ctx.stroke();}
  ctx.strokeStyle=CREAM;ctx.lineWidth=4;for(const r of [45,79]){ctx.beginPath();ctx.arc(192,120,r,0,Math.PI*2);ctx.stroke();}rounded(ctx,258,53,30,30,5,CORAL);disc(ctx,95,170,9,TEAL);
 }
 if(art==='prism'){
  ctx.save();ctx.translate(192,120);ctx.rotate(-.35);rounded(ctx,-118,-65,212,36,18,TEAL);rounded(ctx,-30,-22,155,31,15,CORAL);ctx.strokeStyle=CREAM;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-78,65);ctx.lineTo(0,-74);ctx.lineTo(78,65);ctx.closePath();ctx.stroke();ctx.restore();disc(ctx,281,58,13,CREAM);
 }
 if(art==='poster'||art==='paint'){
  fill(ctx,gradient(ctx,0,0,384,240,[[0,'#21394f'],[.55,'#85b8bd'],[1,'#f9cfaa']]));disc(ctx,257,79,43,CREAM);
  ctx.fillStyle='#4c777f';ctx.beginPath();ctx.moveTo(0,173);ctx.bezierCurveTo(69,127,82,61,163,121);ctx.bezierCurveTo(236,171,293,111,384,148);ctx.lineTo(384,240);ctx.lineTo(0,240);ctx.fill();
  ctx.fillStyle=gradient(ctx,0,155,350,240,[[0,'#eeaa9a'],[1,'#9c575f']]);ctx.beginPath();ctx.moveTo(0,204);ctx.bezierCurveTo(100,119,133,214,228,175);ctx.bezierCurveTo(307,137,340,151,384,179);ctx.lineTo(384,240);ctx.lineTo(0,240);ctx.fill();
  ctx.fillStyle='#233e50';ctx.beginPath();ctx.moveTo(0,227);ctx.bezierCurveTo(132,192,154,270,384,208);ctx.lineTo(384,240);ctx.lineTo(0,240);ctx.fill();
  if(art==='paint'){ctx.globalAlpha=.18;for(let i=0;i<240;i++){const x=(i*73.37)%384,y=(i*41.79)%240;ctx.fillStyle=i%3?CREAM:'#21394f';ctx.fillRect(x,y,3+(i%6),1.2);}ctx.globalAlpha=1;}
 }
 if(art==='signal'||art==='matte'){
  if(art==='matte')fill(ctx,'#000000');else{fill(ctx,'#163044');ctx.strokeStyle='#295064';ctx.lineWidth=1;for(let x=24;x<384;x+=24){ctx.beginPath();ctx.moveTo(x,24);ctx.lineTo(x,216);ctx.stroke();}}
  ctx.fillStyle=TEAL;ctx.font='900 116px sans-serif';ctx.textAlign='center';ctx.fillText('FX',192,160);rounded(ctx,70,183,80,5,2,CORAL);rounded(ctx,155,183,159,5,2,CREAM);rounded(ctx,72,48,65,4,2,CREAM);rounded(ctx,146,48,168,4,2,CORAL);
 }
 if(art==='heart'){ctx.fillStyle=gradient(ctx,100,50,280,210,[[0,'#ffc5a4'],[.6,CORAL],[1,'#b8516f']]);heart(ctx);ctx.fill();}
 if(art==='relief'){
  const g=ctx.createRadialGradient(130,81,6,161,115,68);g.addColorStop(0,CREAM);g.addColorStop(.55,'#c9aaa0');g.addColorStop(1,'#526573');disc(ctx,161,115,68,g);rounded(ctx,231,64,42,125,21,gradient(ctx,231,64,273,189,[[0,CREAM],[.5,CORAL],[1,'#567b82']]));
 }
 if(art==='badge'){disc(ctx,154,120,66,TEAL);ctx.globalCompositeOperation='destination-out';disc(ctx,154,120,34,'#000');ctx.globalCompositeOperation='source-over';rounded(ctx,245,57,34,126,17,CORAL);}
 if(art==='drops'){
  const motion=seconds===null?.5:(1-Math.cos(seconds/3*Math.PI*2))*.5,gap=motion*28,g=gradient(ctx,100,60,280,190,[[0,CREAM],[.3,TEAL],[1,'#338b9b']]);disc(ctx,192-40-gap/2,119,43,g);disc(ctx,192+40+gap/2,119,43,g);disc(ctx,194,190,14,CORAL);
 }
 return canvas;
}
