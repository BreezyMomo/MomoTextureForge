import {graphicCategoryGroups} from './graphic-categories.js';
import {safeData} from './project-authoring-contract.js';
export function graphicListPreferences(current,changes,entries,views){
 safeData(changes);const allowed=['mode','categories','query','view','favorites','clearRecent','groups','restore'];
 if(!changes||typeof changes!=='object'||Array.isArray(changes)||Object.keys(changes).some(key=>!allowed.includes(key)))throw Error('Unknown graphics-list preference');
 if(changes.restore&&Object.keys(changes).length!==1)throw Error('Restore must be the only change');
 const next=structuredClone(changes.restore??current),categoryKeys=graphicCategoryGroups(entries).map(g=>g.key),strings=(v,max,count)=>Array.isArray(v)&&v.length<=count&&new Set(v).size===v.length&&v.every(x=>typeof x==='string'&&x.length<=max);
 if(changes.mode!==undefined)next.mode=changes.mode;if(changes.query!==undefined)next.query=changes.query;if(changes.view!==undefined)next.view=changes.view;
 if(changes.categories!==undefined){if(!strings(changes.categories,200,1000)||changes.categories.some(key=>!categoryKeys.includes(key)))throw Error('Unknown category');next.categories=[...changes.categories];}
 if(changes.clearRecent!==undefined){if(changes.clearRecent!==true)throw Error('clearRecent must be true');next.recent=[];}
 if(changes.favorites!==undefined){if(!Array.isArray(changes.favorites)||changes.favorites.length>1000)throw Error('Invalid favorite changes');const set=new Set(next.favorites);for(const item of changes.favorites){if(!entries.some(e=>e.id===item.id)||typeof item.favorite!=='boolean')throw Error('Unknown list entry or favorite value');item.favorite?set.add(item.id):set.delete(item.id);}next.favorites=[...set];}
 if(changes.groups!==undefined){if(!Array.isArray(changes.groups)||changes.groups.length>1000)throw Error('Invalid group changes');const set=new Set(next.closedGroups);for(const item of changes.groups){if(!categoryKeys.includes(item.category)||typeof item.open!=='boolean')throw Error('Unknown category group');item.open?set.delete('closed:'+item.category):set.add('closed:'+item.category);}next.closedGroups=[...set];}
 if(Object.keys(next).sort().join(',')!=='categories,closedGroups,favorites,mode,query,recent,view'||!['all','favorites','recent','animated'].includes(next.mode)||typeof next.query!=='string'||next.query.length>256||!views.includes(next.view)||!strings(next.categories,200,1000)||!strings(next.favorites,128,4096)||!strings(next.recent,256,24)||!strings(next.closedGroups,207,1000))throw Error('Invalid saved graphics-list settings');
 return next;
}
