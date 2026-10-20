import {validateEntry} from './graphics-library.js';
export const REMOTE_SCHEMA='momo.texture-remote-library/v1';
export const REMOTE_LIMITS={sources:32,entries:2000,index:8*1024*1024,bundle:64*1024*1024,thumbnail:2*1024*1024,timeout:15000,interval:300000};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function remoteURL(value,base){const u=new URL(String(value).trim(),base);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.href.length>2048)throw Error('图库地址必须是无账号密码的HTTP(S)地址');u.hash='';return u.href;}
export function sourceConfig(input,existing={}){const name=String(input.name??'').trim(),raw=remoteURL(input.url);if(!name||name.length>80)throw Error('图库名称需要1～80个字符');const url=new URL(raw);if(url.pathname.endsWith('/'))url.pathname+='index.json';return {...existing,id:existing.id??crypto.randomUUID(),name,url:url.href,enabled:input.enabled!==false,autoCheck:input.autoCheck!==false,autoDownload:input.autoDownload===true};}
export function validateRemoteIndex(raw,base){
 if(raw?.schema!==REMOTE_SCHEMA||!uuid.test(raw.libraryId)||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>80||!Array.isArray(raw.entries)||raw.entries.length>REMOTE_LIMITS.entries)throw Error('远程图库目录格式无效');
 const seen=new Set(),entries=raw.entries.map(e=>{if(!e||typeof e!=='object'||['category','description'].some(k=>e[k]!==undefined&&typeof e[k]!=='string'))throw Error('远程资源说明无效');validateEntry({...e,personalRevision:0,thumbnail:''});if(!/^[0-9a-f]{64}$/i.test(e.sha256)||typeof e.file!=='string'||seen.has(e.resourceId))throw Error('远程资源ID重复或校验值无效');seen.add(e.resourceId);let thumbnail='';if(e.thumbnail){if(typeof e.thumbnail!=='string')throw Error('缩略图无效');if(e.thumbnail.startsWith('data:')){validateEntry({...e,personalRevision:0});thumbnail=e.thumbnail;}else thumbnail=remoteURL(e.thumbnail,base);}
 if(e.tags!==undefined&&(!Array.isArray(e.tags)||e.tags.length>32||e.tags.some(t=>typeof t!=='string'||t.length>80)))throw Error('远程资源标签无效');if(e.imageMime!==undefined&&!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(e.imageMime))throw Error('图片类型无效');
 return {resourceId:e.resourceId,versionId:e.versionId,personalRevision:0,name:e.name,kind:e.kind,category:e.category??'',description:e.description??'',file:remoteURL(e.file,base),sha256:e.sha256.toLowerCase(),thumbnail,tags:e.tags??[],...(e.imageMime?{imageMime:e.imageMime}:{})};});
 return {schema:REMOTE_SCHEMA,libraryId:raw.libraryId,name:raw.name,entries};
}
export const remoteBundleKey=item=>item.sourceId+':'+item.resourceId+'@'+item.versionId;
export function latestRemoteDownloads(records){const latest=new Map();for(const r of records){const key=r.sourceId+':'+r.resourceId;if((latest.get(key)?.versionId??0)<r.versionId)latest.set(key,r);}return [...latest.values()];}
export function assertRemoteIdentity(item,meta){validateEntry(meta);if(meta.resourceId!==item.resourceId||meta.versionId!==item.versionId||meta.kind!==item.kind)throw Error('下载资源的ID、版本或类型与目录不一致');}
export function assertRemoteConflict(item,records){if(records.some(r=>r.resourceId===item.resourceId&&r.versionId===item.versionId&&(r.sha256??r.hash)!==item.sha256))throw Error('相同资源ID和版本存在不同内容，已阻止覆盖；请核对远程图库或另存为独立资源');}
