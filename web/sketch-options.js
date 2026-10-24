// Stable fill indices 0–4 are retained for existing projects and keyframes.
export const SKETCH_FILL_STYLES=['original','solid','hachure','cross-hatch','none','zigzag','dots','dashed','zigzag-line','sunburst'];
export function normalizeDashPattern(value){
 if(typeof value!=='string'||value.length>512)return null;
 if(!value.trim())return '';
 const parts=value.trim().split(/[\s,，]+/);if(parts.length>32)return null;
 const numbers=parts.map(Number);if(numbers.some(n=>!Number.isFinite(n)||n<0||n>512)||!numbers.some(n=>n>0))return null;
 return numbers.join(' ');
}
export const dashArray=value=>{const text=normalizeDashPattern(value);return text?text.split(' ').map(Number):[];};
export const sketchColor=(hex,opacity=1)=>opacity===1?hex:`rgba(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(',')},${opacity})`;
export function sketchOptions(v,part='fill'){
 return {seed:v.seed,roughness:part==='stroke'?(v.strokeRoughness??v.roughness):v.roughness,bowing:v.bowing,maxRandomnessOffset:v.maxRandomnessOffset,
  stroke:sketchColor(v.strokeColor,v.strokeOpacity),strokeWidth:v.strokeWidth,disableMultiStroke:!v.doubleStroke,
  disableMultiStrokeFill:v.fillMultiStroke===0?!v.doubleStroke:v.fillMultiStroke===1,
  preserveVertices:v.preserveVertices,fill:sketchColor(v.fillColor,v.fillOpacity),fillWeight:v.hatchWidth,
  hachureAngle:v.hatchAngle,hachureGap:v.hatchGap,dashOffset:v.dashLength,dashGap:v.dashGap,zigzagOffset:v.zigzagOffset,
  strokeLineDash:dashArray(v.strokeDashPattern),strokeLineDashOffset:v.strokeDashOffset,
  fillLineDash:dashArray(v.fillDashPattern),fillLineDashOffset:v.fillDashOffset,
  curveStepCount:v.curveStepCount,curveFitting:v.curveFitting,curveTightness:v.curveTightness,
  simplification:v.pathSimplification,fillShapeRoughnessGain:v.fillShapeRoughnessGain,fixedDecimalPlaceDigits:v.fixedDecimalPlaceDigits};
}
// Bound generated geometry before calling synchronous Rough.js fillers.
export function sketchWorkEstimate(v,width,height){
 const angle=v.hatchAngle*Math.PI/180,span=width*Math.abs(Math.sin(angle))+height*Math.abs(Math.cos(angle)),length=Math.hypot(width,height),gap=Math.max(1,v.hatchGap);
 const strokes=v.fillMultiStroke===0?(v.doubleStroke?2:1):v.fillMultiStroke;
 if(v.fillStyle===6)return width*height/(gap*gap)*v.curveStepCount*strokes;
 if(v.fillStyle===7)return span/gap*length/Math.max(.2,v.dashLength+v.dashGap)*strokes;
 if(v.fillStyle===8)return span/(gap+v.zigzagOffset)*length/(2*v.zigzagOffset)*2*strokes;
 if(v.fillStyle===9)return v.sunburstRays*strokes;
 return [2,3,5].includes(v.fillStyle)?(span+(v.fillStyle===3?length:0))/gap*strokes:0;
}
export function sunburstPath(v,width,height){
 const cx=v.sunburstCenterX*width,cy=(1-v.sunburstCenterY)*height,radius=Math.hypot(width,height)*2;
 return Array.from({length:v.sunburstRays},(_,i)=>{const angle=(v.hatchAngle+i*360/v.sunburstRays)*Math.PI/180;return `M${cx} ${cy}L${cx+Math.cos(angle)*radius} ${cy+Math.sin(angle)*radius}`;}).join('');
}
