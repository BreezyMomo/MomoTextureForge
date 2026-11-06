// Isolated real OPFS library for browser checks, including strict-CSP builds.
// Call on the test origin before loading the application.
// waitForFunction treats an async predicate's Promise as truthy in this runtime.
// Evaluate and await the actual value when checking asynchronous storage state.
export async function waitForBrowserValue(page,predicate,arg,{timeout=30000}={}){
 const deadline=Date.now()+timeout;
 for(;;){if(await page.evaluate(predicate,arg))return;if(Date.now()>=deadline)throw Error('Timed out waiting for browser storage state');await new Promise(resolve=>setTimeout(resolve,50));}
}

export async function seedBrowserFolder(page,{name='test-library',records=[]}={}){
 return page.evaluate(async({name,records})=>{
  const handle=await(await navigator.storage.getDirectory()).getDirectoryHandle(name,{create:true}),directory=await handle.getDirectoryHandle('resources',{create:true}),entries=[];
  for(const {entry,bytes}of records){const data=new Uint8Array(bytes),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(b=>b.toString(16).padStart(2,'0')).join(''),file=entry.resourceId+'-v'+entry.versionId+'.zip',stream=await(await directory.getFileHandle(file,{create:true})).createWritable();await stream.write(data);await stream.close();entries.push({...entry,file:'resources/'+file,sha256:hash,tags:entry.tags??[]});}
  const libraryId=crypto.randomUUID(),index={schema:'momo.texture-remote-library/v1',libraryId,name,entries},stream=await(await handle.getFileHandle('index.json',{create:true})).createWritable();await stream.write(JSON.stringify(index));await stream.close();
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('momo-folder-library-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{await new Promise((resolve,reject)=>{const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put({token:crypto.randomUUID(),handle,libraryId,name,folderName:name,entries:[]},'active');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});}finally{db.close();}return libraryId;
 },{name,records:records.map(({entry,meta,bytes})=>({entry:entry??meta,bytes:[...bytes]}))});
}
