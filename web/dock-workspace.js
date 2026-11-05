import {mountDockMenu} from './generated/editor-react.js';
import {createDockWorkspace as createWorkbenchDockWorkspace} from './vendor/momo-workbench/dock-workspace.js';
import {layoutModel} from './dock-layout.js';
import {onLanguageChange} from './language.js';
import {uiText,uiFormat} from './ui-language.js';
import {editorMotion} from './editor-motion.js';
const element=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text)e.textContent=uiText(text);return e;};
const menuPresets=[
 {id:'default',title:'layout.restoreDefaultLayout'},
 {id:'browse',title:'workspace.browseLayout'},
 {id:'animation',title:'layout.animationLayout'},
 {id:'focus',title:'layout.focusCanvas'},
];
export function createDockWorkspace(options){
 return createWorkbenchDockWorkspace({...options,renderMenu:mountDockMenu,idPrefix:'',model:layoutModel,ui:{text:uiText,format:uiFormat,onLanguageChange},motion:editorMotion,menuPresets});
}
export function installEditorDocking({panels,onChange,onMessage}){
 const host=document.querySelector('.tree-workspace');
 const {nodes,library,canvas:preview,inspector,timeline}=panels;
 const summary=timeline.querySelector('summary');summary.hidden=true;
 const controls=document.getElementById('node-animation-editor');controls.classList.add('dock-animation-content');
 const timelineButton=document.getElementById('open-docked-timeline');
 let manager;manager=createDockWorkspace({host,menuHost:document.getElementById('workspace-layout-slot'),panels:{nodes,library,canvas:preview,inspector,timeline},onChange,onMessage,onVisibility:(id,visible)=>{if(id==='timeline'){timeline.open=visible;timelineButton.setAttribute('aria-expanded',String(visible));}}});
 new MutationObserver(()=>{if(timeline.open&&!manager.isRestoring()&&!manager.active('timeline'))manager.show('timeline');}).observe(timeline,{attributes:true,attributeFilter:['open']});
 return manager;
}
