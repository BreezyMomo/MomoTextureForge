// Append-only IDs preserve saved processing order and animation paths.
const n=(key,min,max,value,step=.01)=>({key,label:'fx.param.'+key,min,max,default:value,step});
const b=(key,value=false)=>({key,label:'fx.param.'+key,type:'boolean',default:value});
const c=(key,value)=>({key,label:'fx.param.'+key,type:'color',default:value});
const select=(key,options,value=0)=>({...n(key,0,options.length-1,value,1),options});
const quality=()=>select('quality',['qualityLow','qualityMedium','qualityHigh'],1);
const mix=()=>n('mix',0,1,1);
export const CREATIVE_EFFECTS=[
 {id:'halftone',parameters:[select('dotShape',['roundDot','squareDot','lineDot']),n('dotSize',2,64,8,0.5),n('angle',-180,180,45,1),select('inkMode',['monoInk','rgbInk']),c('inkColor','#202020'),c('paperColor','#ffffff'),n('scatter',0,1,0),n('seed',1,65535,1,1),mix()]},
 {id:'dither',parameters:[select('ditherPattern',['bayer4','bayer8','noiseDither']),select('paletteMode',['rgbPalette','grayPalette','twoColorPalette','handheldPalette']),n('levels',2,16,4,1),n('cellSize',1,24,2,0.5),n('ditherStrength',0,1,1),c('inkColor','#163821'),c('paperColor','#d6efac'),n('seed',1,65535,1,1),mix()]},
 {id:'glitch',parameters:[n('slices',2,128,24,1),n('displacement',0,128,24,0.5),n('chance',0,1,0.35),select('sliceAxis',['horizontalSlices','verticalSlices']),n('rgbOffset',0,32,3,0.1),n('rate',0,30,6,0.1),n('phase',0,1,0),n('seed',1,65535,1,1),mix()]},
 {id:'zoomBlur',parameters:[n('centerX',0,1,0.5),n('centerY',0,1,0.5),n('blurDistance',0,256,40,0.5),n('innerRadius',0,2,0),n('outerRadius',0.01,3,1.5),select('zoomDirection',['outward','inward','bothDirections']),quality(),mix()]},
 {id:'kuwahara',parameters:[select('paintMode',['quadrantPaint','directionalPaint'],1),n('paintRadius',1,24,8,0.5),n('edgeSharpness',1,16,8,0.5),n('anisotropy',0,0.95,0.6),quality(),mix()]},
 {id:'bevel',parameters:[select('bevelSource',['alphaRelief','heightRelief']),n('bevelWidth',0.5,32,4,0.5),n('lightAngle',-180,180,45,1),n('elevation',1,89,45,1),n('relief',0,8,2,0.1),c('lightColor','#ffffff'),c('shadowColor','#202030'),mix()]},
 {id:'xdog',parameters:[n('lineScale',0.5,12,2,0.1),n('scaleRatio',1.1,3,1.6,0.1),n('edgeWeight',0.5,2,1.05),n('lineThreshold',-0.5,0.5,-0.04),n('lineSoftness',0.001,0.5,0.04,0.001),c('inkColor','#202020'),c('paperColor','#fff6e2'),b('retainColor'),mix()]},
 {id:'crt',parameters:[n('curvature',0,1,0.15),n('lineDensity',1,512,180,1),n('lineStrength',0,1,0.3),n('maskStrength',0,1,0.2),n('grain',0,1,0.12),n('flicker',0,1,0.05),n('rate',0,60,12,0.1),n('phase',0,1,0),n('seed',1,65535,1,1),n('edgeShade',0,1,0.25),mix()]},
 {id:'ascii',parameters:[select('characterSet',['asciiSet','blocksSet','binarySet']),n('glyphSize',6,64,12,1),b('colored',true),b('invert'),c('inkColor','#b0ff8f'),c('paperColor','#101820'),n('paperOpacity',0,1,0),mix()]},
 {id:'pixelSort',parameters:[select('sortAxis',['sortHorizontal','sortVertical']),select('sortBy',['sortLuminance','sortHue','sortSaturation']),b('descending'),n('lowThreshold',0,1,0.15),n('highThreshold',0,1,0.9),n('alphaThreshold',0,1,0.2),n('span',2,256,64,1),n('cellSize',1,24,2,0.5),mix()]}
];
