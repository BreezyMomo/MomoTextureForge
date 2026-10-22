import {graphicLabel} from './graphic-label.js';
import {graphicIsAnimated} from './graphic-list-filters.js';
import {interfaceLanguage} from './language.js';
import {uiText,uiFormat} from './ui-language.js';

const text=(element,value)=>{if(element.textContent!==value)element.textContent=value;};
const attr=(element,key,value)=>{if(element.getAttribute(key)!==String(value))element.setAttribute(key,value);};
const visualKey=root=>JSON.stringify(root,(key,value)=>['name','id','resourceRef'].includes(key)?undefined:value);

// Move only changed children: unchanged cards keep their images, focus and open details.
function reconcile(parent,children){
 let cursor=parent.firstChild;
 for(const child of children){if(child===cursor)cursor=cursor.nextSibling;else parent.insertBefore(child,cursor);}
 while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next;}
}
export function createGraphicListView({container,thumbnails,el,isFavorite,onBrowse,onInsert,onRename,onPublish,onRemove,onFavorite,onFavoriteRemoved,makeAnimationBadge,onGroupToggle,isGroupOpen}){
 const cards=new Map(),groups=new Map(),empty=el('p',{class:'tree-note'});
 function card(entry){
  const image=el('img',{width:72,height:72}),name=el('span',{class:'tree-pattern-text'}),element=el('div',{class:'tree-pattern-card','data-entry-id':entry.id});
  const record={entry,image,name,element,revision:null,metadata:null,renderKey:null,animated:false,badge:null};
  const button=onclick=>el('button',{onclick});
  record.inspect=button(()=>onBrowse(record.entry));record.inspect.className='component-inspect';record.inspect.append(image,name);
  record.add=button(()=>onInsert(record.entry));
  record.version=el('div',{class:'tree-note'});record.personal=el('div',{class:'tree-note'});
  record.summary=el('summary');record.rename=button(()=>onRename(record.entry));record.publish=button(()=>onPublish(record.entry));record.remove=button(()=>onRemove(record.entry));
  record.more=el('details',{class:'component-more'},[record.summary,record.version,record.personal,record.rename,record.publish,record.remove]);
  record.star=el('button',{type:'button',class:'graphic-favorite',onkeydown:event=>{if(event.key===' '||event.key==='Enter')event.stopPropagation();},onclick:()=>{onFavorite(record.entry);if(!record.star.isConnected)onFavoriteRemoved();}});
  element.append(record.inspect,record.add,record.more,record.star);cards.set(entry.id,record);return record;
 }
 function updateCard(entry){
  const record=cards.get(entry.id)??card(entry);record.entry=entry;
  const revision=JSON.stringify([entry.resourceId,entry.versionId,entry.personalRevision]);let renderChanged=false;
  if(revision!==record.revision){
   const key=visualKey(entry.root);renderChanged=key!==record.renderKey;record.renderKey=key;record.revision=revision;record.animated=graphicIsAnimated(entry);
  }
  const name=graphicLabel(entry),metadata=JSON.stringify([interfaceLanguage(),name,entry.versionId,entry.personalRevision,record.animated]);
  if(metadata!==record.metadata){
   text(record.name,name);attr(record.inspect,'aria-label',uiText('library.viewPrefix')+name);text(record.add,uiText('library.addInstance'));attr(record.add,'aria-label',uiText('library.addPrefix')+name);
   record.image.alt=name+uiText('editor.preview');
   text(record.summary,uiText('editor.more'));text(record.version,uiText('editor.version')+entry.versionId);text(record.personal,uiText('editor.personalEdits')+entry.personalRevision);
   text(record.rename,uiText('editor.rename'));attr(record.rename,'aria-label',uiText('library.renamePrefix')+name);text(record.publish,uiText('editor.saveToGraphicsLibrary'));text(record.remove,uiText('editor.removeFromGraphicsList'));
   if(record.animated){record.badge??=makeAnimationBadge();attr(record.badge,'aria-label',uiText('library.animatedBadge'));attr(record.badge,'title',uiText('library.animatedHint'));if(!record.badge.parentElement)record.element.append(record.badge);}
   else{record.badge?.remove();record.badge=null;}
   if(!renderChanged)thumbnails.localize(record.image);
   record.metadata=metadata;
  }
  const favorite=isFavorite(entry),label=uiFormat(favorite?'library.unfavoriteGraphic':'library.favoriteGraphic',name);
  text(record.star,favorite?'★':'☆');attr(record.star,'aria-pressed',favorite);attr(record.star,'aria-label',label);attr(record.star,'title',label);
  if(renderChanged){thumbnails.invalidate('preset:'+entry.id);thumbnails.observe(record.image,'preset:'+entry.id,entry.root);}
  return record;
 }
 return {
  update({entries,sections,view,emptyMessage}){
   const available=new Set(entries.map(entry=>entry.id));
   for(const [id,record]of cards)if(!available.has(id)){thumbnails.forget(record.image);record.element.remove();cards.delete(id);}
   const children=[],visible=[];
   for(const {key,title,members}of sections){
    if(!members.length)continue;
    let group=groups.get(key);
    if(!group){const element=el('details',{'data-category':key}),summary=el('summary'),body=el('div',{class:'tree-pattern-cards'});element.open=isGroupOpen(key);element.append(summary,body);element.ontoggle=()=>{if(element.isConnected)onGroupToggle(element);};group={element,summary,body};groups.set(key,group);}
    text(group.summary,title);const records=members.map(updateCard);reconcile(group.body,records.map(record=>record.element));children.push(group.element);visible.push(...records);
   }
   container.className='tree-library-'+view;
   if(!children.length){text(empty,emptyMessage);children.push(empty);}
   reconcile(container,children);
   for(const record of visible)thumbnails.resume(record.image);
  }
 };
}
