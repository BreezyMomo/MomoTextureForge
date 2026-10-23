import {uiText,uiFormat} from './ui-language.js';
import {onLanguageChange} from './language.js';

// These are view-only arrangements of existing controls; their handlers and IDs stay intact.
export function installWorkspaceWorkflow({resetModules,getScope}){
 const $=id=>document.getElementById(id);
 const make=(tag,className,key)=>{const e=document.createElement(tag);if(className)e.className=className;if(key){e.dataset.i18n=key;e.textContent=uiText(key);}return e;};
 const menus=[];
 const nodeActions=$('add-shape').parentElement;nodeActions.classList.add('node-action-toolbar');
 for(const [className,ids]of [['node-create-actions',['add-shape','add-group']],['node-organize-actions',['wrap-top-level','group-selected']],['node-edit-actions',['duplicate','delete','node-count']]]){
  const row=make('div',className);for(const id of ids)row.append($(id));nodeActions.append(row);
 }
 $('add-shape').classList.add('ui-action-primary');$('add-group').classList.add('ui-action-secondary');
 for(const id of ['wrap-top-level','group-selected','duplicate','delete','solo'])$(id).classList.add('ui-action-quiet');
 $('delete').classList.add('ui-action-destructive');
 for(const button of document.querySelectorAll('.selection-tools>button'))button.classList.add('ui-action-quiet');
 function menu(key){
  const details=make('details','workspace-menu'),summary=make('summary','',key),panel=make('div','workspace-menu-panel');
  panel.setAttribute('popover','auto');details.append(summary,panel);
  function close(){if(panel.matches(':popover-open'))panel.hidePopover();details.open=false;}
  summary.onclick=event=>{
   event.preventDefault();if(panel.matches(':popover-open')){close();return;}
   for(const item of menus)item.close();details.open=true;panel.showPopover();
   const a=summary.getBoundingClientRect(),b=panel.getBoundingClientRect();
   panel.style.left=Math.max(8,Math.min(a.right-b.width,innerWidth-b.width-8))+'px';
   panel.style.top=(a.bottom+b.height+6<innerHeight?a.bottom+6:Math.max(8,a.top-b.height-6))+'px';
  };
  panel.addEventListener('toggle',event=>{details.open=event.newState==='open';});
  panel.addEventListener('click',event=>{if(event.target.closest('button'))close();});
  panel.addEventListener('keydown',event=>event.stopPropagation());
  menus.push({close,panel,summary});return {details,summary,panel};
 }
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;const active=menus.find(m=>m.panel.matches(':popover-open'));if(!active)return;
  event.preventDefault();event.stopPropagation();active.close();active.summary.focus();
 },true);
 window.addEventListener('resize',()=>menus.forEach(m=>m.close()));
 document.addEventListener('scroll',event=>{for(const m of menus)if(!m.panel.contains(event.target))m.close();},true);

 const library=document.querySelector('.dock-library-content'),search=document.querySelector('.tree-library-search');
 const libraryTools=menu('workspace.viewOptions');libraryTools.panel.append(document.querySelector('.tree-library-view'),$('collapse-library'));search.append(libraryTools.details);
 const categories=make('details','library-category-disclosure'),categorySummary=make('summary'),categoryText=make('span');
 categories.id='library-category-disclosure';categorySummary.append(categoryText);categories.append(categorySummary,$('library-categories'));
 document.querySelector('.tree-library-filters').append(categories);
 const libraryHeader=make('div','library-browse-header');library.prepend(libraryHeader);libraryHeader.append(search,document.querySelector('.tree-library-filters'));
 function updateCategories(){
  const selected=[...$('library-categories').querySelectorAll('button[aria-pressed=true]')].filter(b=>b.dataset.value).map(b=>b.textContent);
  const label=uiFormat('workspace.categorySelection',selected.length?selected.join(' · '):uiText('library.all'));
  categoryText.textContent=label;categorySummary.title=label;
 }
 new MutationObserver(updateCategories).observe($('library-categories'),{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed']});updateCategories();

 const actions=document.querySelector('.preview-actions'),resources=menu('workspace.saveResource');resources.details.id='resource-actions-menu';
 function group(key,ids){const section=make('section','workspace-action-group'),title=make('strong','',key);section.append(title);for(const id of ids)section.append($(id));resources.panel.append(section);}
 const saveScope=make('p','workspace-scope-note');resources.panel.append(saveScope);
 group('workspace.graphicsList',['save-project-resource','update-project-resource','preview-save']);
 group('workspace.graphicsLibrary',['save-selected-component','save-whole-library']);
 group('workspace.resourceSession',['preview-reset','preview-undo-update']);
 actions.insertBefore(resources.details,$('solo'));
 $('preview-update').classList.add('primary');
 const scopeNote=make('p','resource-editing-note','workspace.resourceEditingHint');scopeNote.hidden=true;document.querySelector('.preview-heading').after(scopeNote);

 const inspectorMenu=menu('workspace.parameterLayout');inspectorMenu.details.id='inspector-layout-menu';
 inspectorMenu.panel.append(make('p','workspace-scope-note','workspace.parameterLayoutHint'));
 const reset=make('button','','workspace.resetParameterOrder');reset.type='button';reset.id='reset-inspector-order';reset.onclick=resetModules;inspectorMenu.panel.append(reset);
 $('selected-path').after(inspectorMenu.details);

 // Keep Play and scrubbing one click away; disclose timing information on demand.
 const playback=document.querySelector('.tree-timeline'),timing=menu('workspace.playbackSettings');timing.details.id='playback-settings';
 timing.panel.append($('restart-play'),document.querySelector('.play-duration'),$('time-value').parentElement,$('local-time'));
 playback.append(timing.details);

 function update(){
  const scope=getScope();scopeNote.hidden=!scope.resource;
  document.querySelector('.tree-preview').classList.toggle('is-resource-editing',!!scope.resource);
  saveScope.textContent=scope.resource?uiFormat('workspace.savingResource',scope.resource):scope.node?uiFormat('workspace.savingSelection',scope.node):uiText('workspace.savingCanvas');
  inspectorMenu.details.hidden=!scope.node;
  for(const group of resources.panel.querySelectorAll('.workspace-action-group'))group.hidden=![...group.querySelectorAll('button')].some(b=>!b.hidden);
 }
 function localize(){for(const root of [libraryHeader,resources.details,scopeNote,inspectorMenu.details,timing.details])for(const e of [root,...root.querySelectorAll('[data-i18n]')])if(e.dataset.i18n)e.textContent=uiText(e.dataset.i18n);updateCategories();update();}
 onLanguageChange(localize);update();return {update};
}
