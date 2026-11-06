const listeners=new Set();
export const onLibraryChange=listener=>{listeners.add(listener);return ()=>listeners.delete(listener);};
export function libraryChanged(){for(const listener of listeners)listener();}
