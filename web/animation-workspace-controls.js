import {find,fieldSpec} from './tree-model.js';
import {sameTime,affineClock} from './animation-editing.js';
import {safeData} from './project-authoring-contract.js';
export function animationWorkspaceSettings(current,changes,root){
 safeData(changes);const keys=['scope','view','filter','snap','zoom','start','selection','curvePath','folded','extraOpen'];
 if(!changes||typeof changes!=='object'||Array.isArray(changes)||Object.keys(changes).some(k=>![...keys,'restore'].includes(k)))throw Error('Unknown timeline setting');
 if(changes.restore&&Object.keys(changes).length!==1)throw Error('Restore must be the only change');
 const next=structuredClone(changes.restore??{...current,...changes});if(next.scope==='@root')next.scope=root.id;
 if(Object.keys(next).sort().join(',')!==[...keys].sort().join(',')||!find(root,next.scope)||!['keys','curves'].includes(next.view)||!['all','selected','animated'].includes(next.filter)||!['grid','keys','frames','off'].includes(next.snap)||!Number.isFinite(next.zoom)||next.zoom<1||next.zoom>20||!Number.isFinite(next.start)||next.start<0||next.start>1-1/next.zoom+1e-9||typeof next.extraOpen!=='boolean')throw Error('Invalid timeline settings');
 const track=ref=>{const n=find(root,ref?.id)?.node;return n&&typeof ref.path==='string'&&fieldSpec(n,ref.path)&&n.tracks[ref.path];};
 if(next.curvePath!==null&&!track(next.curvePath))throw Error('Unknown selected curve track');
 if(!Array.isArray(next.selection)||next.selection.length>2048||new Set(next.selection.map(k=>k.id+'|'+k.path+'|'+k.time)).size!==next.selection.length||next.selection.some(k=>!Number.isFinite(k.time)||!track(k)?.keys.some(key=>sameTime(key[0],k.time))))throw Error('Unknown or duplicate selected keyframe');
 if(!Array.isArray(next.folded)||next.folded.length>256||new Set(next.folded).size!==next.folded.length||next.folded.some(id=>!find(root,id)))throw Error('Unknown folded node');
 if(changes.scope!==undefined&&next.scope!==current.scope){if(changes.selection===undefined)next.selection=[];if(changes.zoom===undefined)next.zoom=1;if(changes.start===undefined)next.start=0;}
 if(changes.view==='curves'&&next.curvePath){next.scope=next.curvePath.id;next.selection=next.selection.filter(s=>s.id===next.scope);}
 for(const selected of next.selection){
  const scopeRoot=find(root,next.scope).node,chain=[];let item=find(scopeRoot,selected.id);if(!item)throw Error('Selected keys must belong to the current scope');
  while(item.parent){chain.unshift(item.node);item=find(scopeRoot,item.parent.id);}if(!affineClock(chain))throw Error('Enter node local time before selecting nonlinear mapped keys');
 }
 return next;
}
