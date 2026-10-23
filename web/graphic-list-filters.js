import {BY_ID} from './catalog.js';
import {graphicCategory,graphicCategoryGroups,graphicCategorySearchText} from './graphic-categories.js';
import {graphicSearchText} from './graphic-name.js';
import {uiText,uiFormat} from './ui-language.js';

export function graphicIsAnimated(entry){
 function animated(n){
  if(!n)return false;
  const tracks=n.animationEnabled!==false&&!n.timing?.frozen&&Object.values(n.tracks??{}).some(track=>!track.muted&&track.keys?.length>1);
  return tracks||!!n.uv?.[4]||n.kind==='shape'&&n.shapeClock?.follow!==false&&(n.shapeClock?.speed??1)!==0&&BY_ID.get(n.type)?.usesTime||n.children?.some(animated)||!!n.mask&&animated(n.mask);
 }
 return !!animated(entry.root);
}
export function filterGraphicList(entries,{mode='all',favorites=new Set(),recent=[],categories=[],query=''}={}){
 const groups=new Set(categories),search=query.trim().toLowerCase(),byId=new Map(entries.map(entry=>['preset:'+entry.id,entry]));
 const candidates=mode==='recent'?[...new Set(recent)].map(id=>byId.get(id)).filter(Boolean):entries;
 return candidates.filter(entry=>(mode!=='favorites'||favorites.has(entry.id))&&(mode!=='animated'||graphicIsAnimated(entry))&&(!groups.size||groups.has(graphicCategory(entry)))&&(graphicSearchText(entry)+' '+graphicCategorySearchText(entry)).includes(search));
}

function toggleGroup(host,onChange){
 const selected=new Set(),buttons=new Map();let options=[];
 function update(values){
  options=values;const available=new Set(options.map(option=>option.value));for(const value of selected)if(!available.has(value))selected.delete(value);
  const rows=[{value:'',label:uiText('library.all')},...options],next=[];
  host.title=uiText('library.multiFilterHint');
  for(const option of rows){
   let button=buttons.get(option.value);
   if(!button){button=document.createElement('button');button.type='button';button.dataset.value=option.value;buttons.set(option.value,button);
    // Keep the editor's Space-to-play shortcut from consuming native button activation.
    button.onkeydown=event=>{if(event.key===' '||event.key==='Enter')event.stopPropagation();};
    button.onclick=()=>{
    if(!option.value)selected.clear();else if(selected.has(option.value))selected.delete(option.value);else selected.add(option.value);
    update(options);onChange();
   };}
   button.textContent=option.label;button.title=option.label;button.setAttribute('aria-pressed',String(option.value?selected.has(option.value):!selected.size));next.push(button);
  }
  const previous=[...host.children];if(previous.length!==next.length||previous.some((button,i)=>button!==next[i]))host.replaceChildren(...next);
  for(const [value]of buttons)if(value&&!available.has(value))buttons.delete(value);
 }
 return {selected,update};
}

export function createGraphicListFilters(modeHost,categoryHost,onChange){
 const categories=toggleGroup(categoryHost,onChange),buttons=new Map();let mode='all';
 function updateModes(count){
  for(const [value,key]of [['all','library.all'],['favorites','library.favorites'],['recent','library.recent'],['animated','library.animated']]){
   let button=buttons.get(value);
   if(!button){button=document.createElement('button');button.type='button';button.dataset.value=value;button.onkeydown=event=>{if(event.key===' '||event.key==='Enter')event.stopPropagation();};button.onclick=()=>{mode=value;onChange();};buttons.set(value,button);modeHost.append(button);}
   button.textContent=value==='favorites'?uiFormat('library.favoritesCount',count):uiText(key);button.title=value==='animated'?uiText('library.animatedHint'):button.textContent;button.setAttribute('aria-pressed',String(mode===value));
  }
 }
 return {
  get mode(){return mode;},
  update(entries,{favorites=new Set()}={}){
   updateModes(entries.filter(entry=>favorites.has(entry.id)).length);
   categories.update(graphicCategoryGroups(entries).map(group=>({value:group.key,label:group.title})));
  },
  filter(entries,query,context={}){return filterGraphicList(entries,{...context,mode,categories:categories.selected,query});}
 };
}
