export const GRADIENT_STOP_LIMIT=8;
export function gradientStops(color){return color.stops?.length>=2?color.stops:[{position:0,color:color.low},{position:1,color:color.high}];}
export function gradientColorAt(stops,position){const sorted=[...stops].sort((a,b)=>a.position-b.position);if(position<=sorted[0].position)return sorted[0].color;for(let i=1;i<sorted.length;i++)if(position<=sorted[i].position){const a=sorted[i-1],b=sorted[i],t=Math.max(0,Math.min(1,(position-a.position)/Math.max(.00001,b.position-a.position)));return '#'+[1,3,5].map(j=>Math.round(parseInt(a.color.slice(j,j+2),16)*(1-t)+parseInt(b.color.slice(j,j+2),16)*t).toString(16).padStart(2,'0')).join('');}return sorted.at(-1).color;}
export const reverseGradient=stops=>stops.map(stop=>({...stop,position:1-stop.position}));
