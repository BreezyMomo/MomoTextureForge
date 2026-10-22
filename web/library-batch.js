// Prepare resources without repeatedly saving or rebuilding the editor. A canceled
// batch commits its completed prefix; only uncommitted packs are rolled back.
export async function addLibrarySelection({items,status,prepare,commit,onProgress=()=>{},signal,yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0))}){
 const prepared=[],skipped=[],failures=[];let done=0;
 const progress=(phase,item)=>onProgress({phase,item,done,total:items.length,ready:prepared.length,skipped:skipped.length,failed:failures.length});
 for(const item of items){
  if(signal?.aborted)break;
  progress('preparing',item);await yieldControl();
  if(signal?.aborted)break;
  try{
   const state=status(item);
   if(state==='added')skipped.push(item);
   else if(state==='update')failures.push({item,needsUpdate:true});
   else prepared.push({item,...await prepare(item,signal)});
  }catch(error){if(signal?.aborted)break;failures.push({item,error});}
  done++;progress('preparing',item);
 }
 const canceled=!!signal?.aborted;
 try{
  if(prepared.length){progress('saving');await yieldControl();await commit(prepared);}
 }catch(error){
  // Later packs may refer to dependencies registered by earlier packs.
  for(const entry of [...prepared].reverse())entry.rollback?.();
  throw error;
 }
 return {added:prepared.map(entry=>entry.item),skipped,failures,canceled,done,total:items.length};
}
