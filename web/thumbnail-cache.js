const DATABASE='momo-texture-thumbnails-v1',LIMIT=256,MAX_IMAGE_LENGTH=65536;
const valid=src=>typeof src==='string'&&src.length<=MAX_IMAGE_LENGTH&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(src);
export function createThumbnailCache(indexedDB=globalThis.indexedDB){
 let opening;
 function open(){
  if(!indexedDB)return Promise.resolve(null);
  return opening??=new Promise(resolve=>{
   let settled=false;const finish=db=>{if(settled){db?.close();return;}settled=true;resolve(db);};
   try{const request=indexedDB.open(DATABASE,1);request.onupgradeneeded=()=>{const store=request.result.createObjectStore('images',{keyPath:'key'});store.createIndex('used','used');};request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null;};finish(db);};request.onerror=()=>finish(null);request.onblocked=()=>finish(null);}catch{finish(null);}
  });
 }
 async function transaction(run){
  const db=await open();if(!db)return;
  return new Promise(resolve=>{try{const tx=db.transaction('images','readwrite'),store=tx.objectStore('images');let result;tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>resolve(undefined);run(store,value=>result=value);}catch{resolve(undefined);}});
 }
 return {
  get(key){return transaction((store,done)=>{const request=store.get(key);request.onsuccess=()=>{const item=request.result;if(!item)return;if(!valid(item.src)){store.delete(key);return;}done(item.src);store.put({...item,used:Date.now()});};});},
  put(key,src){if(!key||!valid(src))return Promise.resolve();return transaction(store=>{store.put({key,src,used:Date.now()});const count=store.count();count.onsuccess=()=>{let excess=count.result-LIMIT;if(excess<=0)return;const oldest=store.index('used').openCursor();oldest.onsuccess=()=>{const cursor=oldest.result;if(!cursor||excess--<=0)return;cursor.delete();cursor.continue();};};});},
  remove(key){return key?transaction(store=>store.delete(key)):Promise.resolve();},
  close(){const old=opening;opening=null;void old?.then(db=>db?.close());}
 };
}
