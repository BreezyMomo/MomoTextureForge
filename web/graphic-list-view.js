import {graphicLabel} from './graphic-label.js';
import {graphicIsAnimated} from './graphic-list-filters.js';
import {interfaceLanguage} from './language.js';
import {uiText,uiFormat} from './ui-language.js';
import {animateUI} from './editor-motion.js';
import {builtinThumbnail,thumbnailVisualKey} from './thumbnail-source.js';

const text=(element,value)=>{if(element.textContent!==value)element.textContent=value;};
const attr=(element,key,value)=>{if(element.getAttribute(key)!==String(value))element.setAttribute(key,value);};
function actionIcon(path){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 const shape=document.createElementNS(svg.namespaceURI,'path');shape.setAttribute('d',path);svg.append(shape);return svg;
}

// Move only changed children: unchanged cards keep their images, focus and open details.
function reconcile(parent,children){
 let cursor=parent.firstChild;
 for(const child of children){if(child===cursor)cursor=cursor.nextSibling;else parent.insertBefore(child,cursor);}
 while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next;}
}
export function createGraphicListView({container,thumbnails,el,isFavorite,onBrowse,onInsert,onRename,onPublish,onRemove,onFavorite,onFavoriteRemoved,makeAnimationBadge,onGroupToggle,isGroupOpen}){
 const cards=new Map(),groups=new Map(),empty=el('p',{class:'tree-note'});let active=null;
 function closeMore(focus=false){
  if(!active)return;const record=active;active=null;
  if(record.panel.matches(':popover-open'))record.panel.hidePopover();record.more.open=false;
  if(focus&&record.summary.isConnected)record.summary.focus();
 }
 function positionMore(){
  if(!active)return;
  const anchor=active.summary.getBoundingClientRect(),panel=active.panel.getBoundingClientRect(),gap=6,edge=8;
  const left=Math.max(edge,Math.min(anchor.right-panel.width,window.innerWidth-panel.width-edge));
  const top=anchor.bottom+gap+panel.height<=window.innerHeight-edge?anchor.bottom+gap:Math.max(edge,anchor.top-gap-panel.height);
  Object.assign(active.panel.style,{left:left+'px',top:top+'px'});
 }
 document.addEventListener('pointerdown',event=>{if(active&&!active.more.contains(event.target))closeMore();});
 document.addEventListener('keydown',event=>{if(active&&event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMore(true);}},{capture:true});
 document.addEventListener('scroll',()=>closeMore(),{capture:true});window.addEventListener('resize',()=>closeMore());
 function card(entry){
  const image=el('img',{width:72,height:72}),name=el('span',{class:'tree-pattern-text'}),element=el('div',{class:'tree-pattern-card','data-entry-id':entry.id});
  const record={entry,image,name,element,revision:null,metadata:null,renderKey:null,animated:false,badge:null};
  const button=onclick=>el('button',{onclick});
  record.inspect=button(()=>onBrowse(record.entry));record.inspect.className='component-inspect';record.inspect.append(image,name);
  record.add=button(()=>onInsert(record.entry));record.add.className='component-add';
  record.version=el('div',{class:'tree-note'});record.personal=el('div',{class:'tree-note'});
  record.summary=el('summary');
  const action=(className,path,callback)=>{const control=button(()=>{closeMore(true);callback(record.entry);});control.className=className;control.append(actionIcon(path));return control;};
  record.rename=action('component-rename','M14 5l5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z',onRename);
  record.publish=action('component-publish','M3 9V5h7l2 2h9v13H3V9ZM12 17v-6M9 14l3-3 3 3',onPublish);
  record.remove=action('component-remove','M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',onRemove);
  record.panel=el('div',{class:'component-more-panel',popover:'manual',role:'group'},[el('div',{class:'component-more-meta'},[record.version,record.personal]),el('div',{class:'component-more-actions'},[record.rename,record.publish,record.remove])]);
  record.panel.addEventListener('keydown',event=>event.stopPropagation());
  record.more=el('details',{class:'component-more'},[record.summary,record.panel]);
  record.summary.onclick=event=>{event.preventDefault();if(active===record){closeMore();return;}closeMore();record.more.open=true;active=record;record.panel.showPopover();positionMore();};
  record.star=el('button',{type:'button',class:'graphic-favorite',onkeydown:event=>{if(event.key===' '||event.key==='Enter')event.stopPropagation();},onclick:()=>{onFavorite(record.entry);if(!record.star.isConnected)onFavoriteRemoved();}});
  record.star.append(actionIcon('M12 3l2.78 5.93 6.22.95-4.5 4.62L17.56 21 12 17.93 6.44 21l1.06-6.5L3 9.88l6.22-.95L12 3Z'));
  element.append(record.inspect,record.add,record.more,record.star);cards.set(entry.id,record);return record;
 }
 function updateCard(entry){
  const record=cards.get(entry.id)??card(entry);record.entry=entry;
  const revision=JSON.stringify([entry.resourceId,entry.versionId,entry.personalRevision]);let renderChanged=false;
  if(revision!==record.revision){
   const key=thumbnailVisualKey(entry.root);renderChanged=key!==record.renderKey;record.renderKey=key;record.revision=revision;record.animated=graphicIsAnimated(entry);
  }
  const name=graphicLabel(entry),metadata=JSON.stringify([interfaceLanguage(),name,entry.versionId,entry.personalRevision,record.animated]);
  if(metadata!==record.metadata){
   text(record.name,name);attr(record.name,'title',name);attr(record.inspect,'aria-label',uiText('library.viewPrefix')+name);text(record.add,uiText('library.addInstance'));attr(record.add,'aria-label',uiText('library.addPrefix')+name);
   record.image.alt=name+uiText('editor.preview');
   text(record.summary,uiText('editor.more'));attr(record.panel,'aria-label',name);text(record.version,uiText('editor.version')+entry.versionId);text(record.personal,uiText('editor.personalEdits')+entry.personalRevision);
   for(const [control,key]of [[record.rename,'editor.rename'],[record.publish,'editor.saveToGraphicsLibrary'],[record.remove,'editor.removeFromGraphicsList']]){attr(control,'title',uiText(key));attr(control,'aria-label',uiText(key));}
   attr(record.rename,'aria-label',uiText('library.renamePrefix')+name);
   if(record.animated){record.badge??=makeAnimationBadge();attr(record.badge,'aria-label',uiText('library.animatedBadge'));attr(record.badge,'title',uiText('library.animatedHint'));if(!record.badge.parentElement)record.element.append(record.badge);}
   else{record.badge?.remove();record.badge=null;}
   if(!renderChanged)thumbnails.localize(record.image);
   record.metadata=metadata;
  }
  const favorite=isFavorite(entry),label=uiFormat(favorite?'library.unfavoriteGraphic':'library.favoriteGraphic',name);
  attr(record.star,'aria-pressed',favorite);attr(record.star,'aria-label',label);attr(record.star,'title',label);
  if(renderChanged){thumbnails.invalidate('preset:'+entry.id);thumbnails.observe(record.image,'preset:'+entry.id,entry.root,{source:builtinThumbnail(entry),visualKey:record.renderKey});}
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
    group.element.open=isGroupOpen(key);
    text(group.summary,title);const records=members.map(updateCard);reconcile(group.body,records.map(record=>record.element));children.push(group.element);visible.push(...records);
   }
   container.className='tree-library-'+view;
   if(!children.length){text(empty,emptyMessage);children.push(empty);}
   reconcile(container,children);
   if(active){if(!container.contains(active.element))closeMore();else positionMore();}
   for(const record of visible){thumbnails.resume(record.image);if(!record.entered){record.entered=true;animateUI(record.element,[{opacity:.4},{opacity:1}],{duration:140});}}
  }
 };
}
