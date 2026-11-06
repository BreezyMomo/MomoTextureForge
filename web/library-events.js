const listeners=new Set();
export const onLibraryChange=listener=>{listeners.add(listener);return ()=>listeners.delete(listener);};
const notify=()=>{for(const listener of listeners)listener();};
// Each tab reads the shared binding and folder again. Messages contain no
// resources or handles and received notifications are never rebroadcast.
let channel;
if(globalThis.window){
 try{channel=new BroadcastChannel('momo-texture-library-changes');channel.onmessage=notify;}catch{}
 const key='momo-texture-library:changed';
 if(!channel)window.addEventListener('storage',event=>{if(event.key===key)notify();});
 window.addEventListener('focus',notify);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')notify();});
}
export function libraryChanged(){
 notify();
 if(channel)channel.postMessage(null);
 else if(globalThis.window)try{localStorage.setItem('momo-texture-library:changed',crypto.randomUUID());}catch{}
}
