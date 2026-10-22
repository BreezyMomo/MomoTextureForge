import {BY_ID} from './catalog.js';
import {categoryLabel} from './graphic-label.js';
import {graphicSearchText} from './graphic-name.js';
import {uiText} from './ui-language.js';

const category=entry=>entry.category||'图形列表';
export function filterGraphicList(entries,{types=[],categories=[],query=''}={}){
 const kinds=new Set(types),groups=new Set(categories),search=query.trim().toLowerCase();
 return entries.filter(entry=>(!kinds.size||kinds.has(entry.kind))&&(!groups.size||groups.has(category(entry)))&&graphicSearchText(entry).includes(search));
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

export function createGraphicListFilters(typeHost,categoryHost,onChange){
 const types=toggleGroup(typeHost,onChange),categories=toggleGroup(categoryHost,onChange);
 return {
  update(entries){
   types.update([['formula','editor.formula'],['image','editor.image'],['composition','common.group']].map(([value,key])=>({value,label:uiText(key)})));
   const groups=new Map();for(const entry of entries){const key=category(entry);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry);}
   categories.update([...groups].map(([value,members])=>{const builtin=BY_ID.get(members[0].builtin);return {value,label:builtin&&members.every(entry=>BY_ID.get(entry.builtin)?.category===builtin.category)?categoryLabel(builtin.category):value};}));
  },
  filter(entries,query){return filterGraphicList(entries,{types:types.selected,categories:categories.selected,query});}
 };
}
