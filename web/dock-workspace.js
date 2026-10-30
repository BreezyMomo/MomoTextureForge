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
 return createWorkbenchDockWorkspace({...options,idPrefix:'',model:layoutModel,ui:{text:uiText,format:uiFormat,onLanguageChange},motion:editorMotion,menuPresets});
}
export function installEditorDocking({onChange,onMessage}){
 const host=document.querySelector('.tree-workspace'),left=host.querySelector('.tree-left'),preview=host.querySelector('.tree-preview'),inspector=host.querySelector('.tree-inspector');
 const nodes=element('div','tree-left dock-nodes-content'),library=element('div','tree-left dock-library-content');let intoLibrary=false;
 for(const child of [...left.childNodes]){if(child.nodeType===1&&child.tagName==='HR'){intoLibrary=true;continue;}(intoLibrary?library:nodes).append(child);}left.remove();
 const timeline=document.getElementById('animation-panel'),summary=timeline.querySelector('summary');summary.hidden=true;
 const controls=document.getElementById('node-animation-editor');controls.classList.add('dock-animation-content');
 const timelineButton=element('button','dock-open-timeline',uiText("editor.animationEditorTimeline"));timelineButton.type='button';timelineButton.id='open-docked-timeline';timeline.before(timelineButton);timeline.remove();
 let manager;manager=createDockWorkspace({host,menuHost:document.querySelector('.tree-tool-actions'),panels:{nodes,library,canvas:preview,inspector,timeline},onChange,onMessage,onVisibility:(id,visible)=>{if(id==='timeline'){timeline.open=visible;timelineButton.setAttribute('aria-expanded',String(visible));}}});
 timelineButton.onclick=()=>manager.toggle('timeline');onLanguageChange(()=>timelineButton.textContent=uiText("editor.animationEditorTimeline"));
 new MutationObserver(()=>{if(timeline.open&&!manager.isRestoring()&&!manager.active('timeline'))manager.show('timeline');}).observe(timeline,{attributes:true,attributeFilter:['open']});
 return manager;
}
