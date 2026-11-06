import {browserLegacyEntries,browserLegacySnapshot,clearBrowserLibrary} from './graphics-library.js';
import {remoteDownloads,legacyRemoteSnapshot,clearLegacyRemoteDownloads,remoteSources} from './remote-library-storage.js';

function remoteEntry(entry,sources){
 const source=sources.find(source=>source.id===entry.sourceId);
 return {resourceId:entry.resourceId,versionId:entry.versionId,personalRevision:0,name:entry.name,aliases:entry.aliases??{},kind:entry.kind,category:entry.category??'',description:entry.description??'',thumbnail:entry.thumbnail??'',hash:entry.sha256,
  ...(entry.generator?{generator:true}:{}),...(entry.imageMime?{imageMime:entry.imageMime}:{}),remoteOrigin:{sourceId:entry.sourceId,name:entry.sourceName??source?.name??entry.sourceId,url:entry.originURL??source?.url??'',file:entry.file??''}};
}
export async function legacyLibraryEntries(){const [personal,downloads,sources]=await Promise.all([browserLegacyEntries(),remoteDownloads(),remoteSources()]);return [...personal,...downloads.map(entry=>remoteEntry(entry,sources))].sort(order);}
const order=(a,b)=>a.resourceId.localeCompare(b.resourceId)||a.versionId-b.versionId||String(a.hash).localeCompare(String(b.hash));
export async function legacyLibrarySnapshot(){
 const [personal,remote,sources]=await Promise.all([browserLegacySnapshot(),legacyRemoteSnapshot(),remoteSources()]);
 const records=[...personal.records,...remote.records.map(record=>({entry:remoteEntry(record.entry,sources),bytes:record.bytes}))].sort((a,b)=>order(a.entry,b.entry));
 return {entries:records.map(record=>record.entry),records,personalEntries:personal.entries,remoteDownloads:remote.downloads};
}
export async function clearLegacyLibrary(snapshot){await clearBrowserLibrary(snapshot.personalEntries);await clearLegacyRemoteDownloads(snapshot.remoteDownloads);}
