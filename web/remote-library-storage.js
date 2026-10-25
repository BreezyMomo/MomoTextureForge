import {remoteBundleKey,assertRemoteConflict} from './remote-library-model.js';
const DB='momo-remote-graphics-v1';
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore('sources',{keyPath:'id'});r.result.createObjectStore('catalogs',{keyPath:'sourceId'});r.result.createObjectStore('downloads',{keyPath:'key'});r.result.createObjectStore('bundles');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function tx(stores,mode,run){const db=await open();try{return await new Promise((resolve,reject)=>{const t=db.transaction(stores,mode);let value,error;const done=v=>{value=v;},fail=e=>{error=e; t.abort();};t.oncomplete=()=>resolve(value);t.onabort=()=>reject(error??t.error??Error('远程图库保存失败'));t.onerror=()=>reject(error??t.error??Error('远程图库保存失败'));try{run(t,done,fail);}catch(e){fail(e);}});}finally{db.close();}}
const all=store=>tx([store],'readonly',(t,done)=>{const r=t.objectStore(store).getAll();r.onsuccess=()=>done(r.result);});
export const remoteSources=()=>all('sources');
export const remoteCatalogs=()=>all('catalogs');
export const remoteDownloads=()=>all('downloads');
export const remoteBundle=item=>tx(['bundles'],'readonly',(t,done)=>{const r=t.objectStore('bundles').get(remoteBundleKey(item));r.onsuccess=()=>done(r.result);});
// Generation markers are separate keys, never resource bundles or exported assets.
const epochKey=item=>'download-epoch:'+item.sourceId+':'+item.resourceId;
export const remoteDownloadEpoch=item=>tx(['bundles'],'readonly',(t,done)=>{const r=t.objectStore('bundles').get(epochKey(item));r.onsuccess=()=>done(r.result??0);});
export function deleteRemoteDownload(item,{expectedDownloads}={}){
 if(!item?.sourceId||!item?.resourceId)throw Error('请选择已下载的远程资源');
 return tx(['downloads','bundles'],'readwrite',(t,done,fail)=>{
  const bundles=t.objectStore('bundles'),epoch=bundles.get(epochKey(item));epoch.onsuccess=()=>bundles.put((epoch.result??0)+1,epochKey(item));
  const downloads=t.objectStore('downloads'),r=downloads.getAll();r.onsuccess=()=>{if(expectedDownloads&&JSON.stringify(r.result)!==JSON.stringify(expectedDownloads)){fail(Error('Remote downloads changed; query again'));return;}const matches=r.result.filter(d=>d.sourceId===item.sourceId&&d.resourceId===item.resourceId);for(const d of matches){downloads.delete(d.key);bundles.delete(d.key);}done(matches.length);};
 });
}
export async function saveRemoteSource(source,{expectedSources}={}){return tx(['sources','catalogs'],'readwrite',(t,done,fail)=>{const store=t.objectStore('sources'),request=store.getAll();request.onsuccess=()=>{if(expectedSources&&JSON.stringify(request.result)!==JSON.stringify(expectedSources)){fail(Error('Remote sources changed; query again'));return;}const others=request.result.filter(s=>s.id!==source.id),old=request.result.find(s=>s.id===source.id);if(others.some(s=>s.url===source.url)){fail(Error('这个远程图库地址已经添加'));return;}if(!old&&others.length>=32){fail(Error('最多订阅32个远程图库'));return;}let next={...old,...source};if(old&&old.url!==source.url){for(const k of ['libraryId','lastChecked','lastSuccess','error'])delete next[k];t.objectStore('catalogs').delete(source.id);}store.put(next);done(next);};});}
export const removeRemoteSource=(id,{expectedSources}={})=>tx(['sources','catalogs'],'readwrite',(t,done,fail)=>{const store=t.objectStore('sources'),r=store.getAll();r.onsuccess=()=>{if(expectedSources&&JSON.stringify(r.result)!==JSON.stringify(expectedSources)){fail(Error('Remote sources changed; query again'));return;}store.delete(id);t.objectStore('catalogs').delete(id);};});
// Config is re-read in the same transaction so late responses cannot resurrect a removed source.
export function saveRemoteResult(expected,{catalog,download,downloadEpoch=0,error}={}){
 return tx(['sources','catalogs','downloads','bundles'],'readwrite',(t,done,fail)=>{
  const store=t.objectStore('sources'),r=store.get(expected.id);
  r.onsuccess=()=>{
   const current=r.result;
   if(!current||!current.enabled||current.url!==expected.url){fail(Error('订阅已停用、移除或更改'));return;}
   if(catalog){
    const old=t.objectStore('catalogs').get(current.id);
    old.onsuccess=()=>{try{
     if(current.libraryId&&current.libraryId!==catalog.libraryId)throw Error('远程图库身份已改变');
     for(const item of catalog.entries){assertRemoteConflict(item,old.result?.entries??[]);if((old.result?.entries.find(e=>e.resourceId===item.resourceId)?.versionId??0)>item.versionId)throw Error('远程目录版本倒退，已保留本地目录');}
     t.objectStore('catalogs').put({sourceId:current.id,...catalog});
    }catch(e){fail(e);}};
   }
   if(download){
    const epoch=t.objectStore('bundles').get(epochKey(download));
    epoch.onsuccess=()=>{if((epoch.result??0)!==downloadEpoch){fail(Object.assign(Error('本地下载已删除，请重新下载'),{code:'REMOTE_CACHE_CLEARED'}));return;}
     const check=t.objectStore('downloads').getAll();
     check.onsuccess=()=>{try{assertRemoteConflict(download,check.result);const {bytes,...meta}=download,key=remoteBundleKey(download);t.objectStore('downloads').put({...meta,key});t.objectStore('bundles').put(bytes,key);}catch(e){fail(e);}};
    };
   }
   store.put({...current,...(catalog||error!==undefined?{lastChecked:Date.now()}:{}),...(catalog?{lastSuccess:Date.now(),libraryId:catalog.libraryId,error:null}:{}),...(error!==undefined?{error}: {})});done(current);
  };
 });
}
