export function gifSettings(value={}){
 return {colors:[16,32,64,128,256].includes(value?.colors)?value.colors:256,palette:value?.palette==='local'?'local':'global',dither:value?.dither===true,repeat:value?.repeat!==false,alphaThreshold:Number.isFinite(value?.alphaThreshold)?Math.max(0,Math.min(255,Math.round(value.alphaThreshold))):128};
}
