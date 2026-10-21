// Inspector presentation only: rendering continues to use the project's color contract.
export function colorContext(root,id,evaluate=n=>n){
 const path=[];function visit(n){path.push(n);if(n.id===id)return true;for(const child of [...n.children,...(n.mask?[n.mask]:[])])if(visit(child))return true;path.pop();return false;}
 if(!visit(root))return null;
 const nodes=path.map(evaluate),local=nodes.at(-1);let source=null,override=null;
 for(const n of nodes){if(['own','remap'].includes(n.color.mode))source=n;if(n.id!==id&&n.color.mode==='remap'&&!override)override=n;}
 const palette=source?.color??{fill:'gradient',low:'#000000',high:'#ffffff'};
 return {local,source,override,palette,children:local.kind==='group'&&local.color.mode==='preserve'};
}
export function colorBackground(color){
 if(color.fill==='solid')return color.high;
 const stops=color.stops?.length>=2?[...color.stops].sort((a,b)=>a.position-b.position):[{color:color.low,position:0},{color:color.high,position:1}];
 return 'linear-gradient(90deg,'+stops.map(s=>s.color+' '+s.position*100+'%').join(',')+')';
}
export function independentColor(context){return {...structuredClone(context.palette),mode:'own'};}
export function normalizeHex(value){const hex=value.trim().replace(/^#/,'');return /^[0-9a-f]{6}$/i.test(hex)?'#'+hex.toLowerCase():/^[0-9a-f]{3}$/i.test(hex)?'#'+[...hex].map(c=>c+c).join('').toLowerCase():null;}
