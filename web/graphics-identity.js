// Display-only grouping. Every action still receives one original storage entry.
export const graphicVariantKey=item=>(item.folderVariant?'local':item.remote?'remote:'+item.sourceId:item.builtin?'builtin':'local')+':'+item.resourceId+'@'+item.versionId;
const digest=item=>item.sha256??item.hash;
export function groupGraphics(items){
 const groups=new Map();
 for(const item of items){const id=item.resourceId.toLowerCase();if(!groups.has(id))groups.set(id,[]);const variants=groups.get(id);if(!variants.some(v=>graphicVariantKey(v)===graphicVariantKey(item)))variants.push(item);}
 return [...groups].map(([resourceId,variants])=>{
  const local=variants.find(v=>v.folderVariant||!v.remote&&!v.builtin),remote=variants.filter(v=>v.remote&&!v.folderVariant),versions=new Map();let conflict=false,unknown=false;
  for(const v of variants){const peers=versions.get(v.versionId)??[];for(const p of peers){if(digest(p)&&digest(v)){if(digest(p)!==digest(v))conflict=true;}else unknown=true;}peers.push(v);versions.set(v.versionId,peers);}
  const newestRemote=remote.length?Math.max(...remote.map(v=>v.versionId)):0;
  let status=conflict?'library.identityConflict':local&&newestRemote>local.versionId?'library.identityRemoteNewer':local&&newestRemote&&local.versionId>newestRemote?'library.identityLocalNewer':local&&remote.length?(unknown?'library.identityLocalNeedsComparison':'library.identityLocalIdentical'):variants.length>1?(unknown?'library.identityMultipleNeedsComparison':'library.identityMultipleSources'):'';
  if(!conflict&&new Set(variants.map(v=>v.versionId)).size>1&&status==='library.identityMultipleSources')status='library.identityMultipleVersions';
  if(status==='library.identityLocalIdentical'&&remote.some(v=>v.versionId!==local.versionId))status='library.identitySomeSourcesOlder';
  return {resourceId,variants,status,conflict};
 });
}
export function preferredGraphic(variants,selectedKey){
 return variants.find(v=>graphicVariantKey(v)===selectedKey)??variants.find(v=>v.folderVariant||!v.remote&&!v.builtin)??variants.find(v=>v.folder)??variants.find(v=>v.builtin)??[...variants].sort((a,b)=>b.versionId-a.versionId||graphicVariantKey(a).localeCompare(graphicVariantKey(b)))[0];
}
