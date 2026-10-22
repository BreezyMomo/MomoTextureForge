export const GRAPHIC_FAVORITES_KEY='momo-texture-tree:graphic-list-favorites:v1';
const legacyKey='momo-texture-forge:ui';
const ids=value=>new Set(Array.isArray(value)?value.filter(id=>typeof id==='string'):[]);

// Favorites belong to this browser's graphics list, not to exported projects.
export function createGraphicFavorites(storage){
 let saved=null;try{saved=storage.getItem(GRAPHIC_FAVORITES_KEY);}catch{}
 let favorites;try{favorites=ids(JSON.parse(saved));}catch{favorites=new Set();}
 let initialized=saved!==null;
 function save(next){storage.setItem(GRAPHIC_FAVORITES_KEY,JSON.stringify([...next]));favorites=next;initialized=true;}
 return {
  has:entry=>favorites.has(entry.id),
  count:entries=>entries.filter(entry=>favorites.has(entry.id)).length,
  toggle(entry){const next=new Set(favorites);if(next.has(entry.id))next.delete(entry.id);else next.add(entry.id);save(next);},
  migrate(entries){
   if(initialized)return;
   let legacy;try{legacy=JSON.parse(storage.getItem(legacyKey)||'{}');}catch{legacy={};}
   const old=ids(legacy?.favorites);save(new Set(entries.filter(entry=>old.has(entry.builtin)).map(entry=>entry.id)));
  }
 };
}
