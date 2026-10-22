import {createAliasEditor} from './alias-editor.js';
export function createGraphicNameEditor(input,aliases,{onchange=()=>{}}={}){
 const host=input.ownerDocument.createElement('div');host.className='graphic-name-editor';let editor;
 const set=(value)=>{const open=editor?.element.open??false;editor=createAliasEditor({aliases:value},{doc:input.ownerDocument,kind:'graphic',defaultName:()=>input.value,onchange});editor.element.open=open;host.replaceChildren(editor.element);};
 set(aliases);input.addEventListener('input',()=>editor.refresh());return {element:host,read:()=>editor.read(),set};
}
