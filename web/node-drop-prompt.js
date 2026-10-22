import {uiText} from './ui-language.js';

// Preview overlays never receive pointer events or change the tree's drop geometry.
export function createNodeGroupPreview(){
 const host=document.createElement('div');host.className='node-group-preview';host.hidden=true;host.setAttribute('role','status');document.body.append(host);let target=null;
 function reset(){host.hidden=true;target=null;}
 function show(row,names){
  if(target!==row.dataset.nodeId||host.hidden){host.replaceChildren();const heading=document.createElement('div');heading.className='node-group-preview-heading';const title=document.createElement('strong');title.textContent='▣ '+uiText('nodeTree.newGroupName');const badge=document.createElement('span');badge.textContent=uiText('nodeTree.groupPreview');heading.append(title,badge);host.append(heading);const reason=document.createElement('p');reason.className='node-group-preview-reason';reason.textContent=uiText('nodeTree.groupDropReason');host.append(reason);
   for(const name of names){const child=document.createElement('div');child.className='node-group-preview-child';child.textContent=name;host.append(child);}
   const hint=document.createElement('p');hint.textContent=uiText('nodeTree.groupDropHint');host.append(hint);
  }
  target=row.dataset.nodeId;const box=row.getBoundingClientRect();host.style.left=box.left+'px';host.style.top=box.top+'px';host.style.width=box.width+'px';host.hidden=false;
 }
 document.addEventListener('dragover',event=>{if(target&&event.target.closest('[data-node-id]')?.dataset.nodeId!==target)reset();});
 for(const event of ['drop','dragend'])document.addEventListener(event,reset);
 document.addEventListener('keydown',event=>{if(event.key==='Escape')reset();},true);
 return {show,reset};
}
