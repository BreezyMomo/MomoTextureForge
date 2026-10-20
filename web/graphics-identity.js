// Display-only grouping. Every action still receives one original storage entry.
export const graphicVariantKey=item=>(item.remote?'remote:'+item.sourceId:item.builtin?'builtin':'local')+':'+item.resourceId+'@'+item.versionId;
const digest=item=>item.sha256??item.hash;
export function groupGraphics(items){
 const groups=new Map();
 for(const item of items){const id=item.resourceId.toLowerCase();if(!groups.has(id))groups.set(id,[]);const variants=groups.get(id);if(!variants.some(v=>graphicVariantKey(v)===graphicVariantKey(item)))variants.push(item);}
 return [...groups].map(([resourceId,variants])=>{
  const local=variants.find(v=>!v.remote&&!v.builtin),remote=variants.filter(v=>v.remote),versions=new Map();let conflict=false,unknown=false;
  for(const v of variants){const peers=versions.get(v.versionId)??[];for(const p of peers){if(digest(p)&&digest(v)){if(digest(p)!==digest(v))conflict=true;}else unknown=true;}peers.push(v);versions.set(v.versionId,peers);}
  const newestRemote=remote.length?Math.max(...remote.map(v=>v.versionId)):0;
  let status=conflict?'内容冲突：同 ID、同版本内容不同':local&&newestRemote>local.versionId?'远程有新版':local&&newestRemote&&local.versionId>newestRemote?'本地版本较新':local&&remote.length?(unknown?'本地已有 · 内容待核对':'本地已有 · 内容一致'):variants.length>1?(unknown?'多个来源 · 内容待核对':'多个来源'):'';
  if(!conflict&&new Set(variants.map(v=>v.versionId)).size>1&&status==='多个来源')status='多个来源 · 版本不同';
  if(status==='本地已有 · 内容一致'&&remote.some(v=>v.versionId!==local.versionId))status='本地已有 · 部分来源版本较旧';
  return {resourceId,variants,status,conflict};
 });
}
export function preferredGraphic(variants,selectedKey){
 return variants.find(v=>graphicVariantKey(v)===selectedKey)??variants.find(v=>!v.remote&&!v.builtin)??variants.find(v=>v.builtin)??[...variants].sort((a,b)=>b.versionId-a.versionId||graphicVariantKey(a).localeCompare(graphicVariantKey(b)))[0];
}
