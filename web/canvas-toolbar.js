import {uiText,uiFormat} from './ui-language.js';
import {onLanguageChange} from './language.js';

const paths={
 select:'m4 3 14 9-7 1-3 7Z',pivot:'M12 3v18M3 12h18M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
 uv:'M4 4h16v16H4ZM4 12h16M12 4v16',pan:'M9 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v8c0 4-3 7-7 7h-1c-2 0-3-1-4-2l-5-6a2 2 0 0 1 3-3l2 2',
 snap:'M5 4v9a7 7 0 0 0 14 0V4h-4v9a3 3 0 0 1-6 0V4ZM5 8h4m6 0h4',
 display:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 tile:'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',clear:'m6 6 12 12M6 18 18 6',edit:'m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15Z'
};
export function toolIcon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]);svg.append(path);return svg;}
export function canvasToolLabel(button,icon,key,shortKey=key){
 button.classList.add('canvas-tool');button.setAttribute('aria-label',uiText(key));button.title=uiText(key);
 const text=document.createElement('span');text.className='canvas-tool-label';text.textContent=uiText(shortKey);button.replaceChildren(toolIcon(icon),text);
}
export function fitCanvasPopup(panel){
 const pane=panel.closest('.tree-preview');if(!pane)return;
 panel.style.setProperty('--canvas-popup-shift','0px');
 const box=panel.getBoundingClientRect(),limit=pane.getBoundingClientRect(),shift=box.left<limit.left+8?limit.left+8-box.left:box.right>limit.right-8?limit.right-8-box.right:0;
 panel.style.setProperty('--canvas-popup-shift',shift+'px');
}
export function installCanvasToolbar({tiled,tileGrid}){
 const $=id=>document.getElementById(id),toolbar=$('preview-2d-toolbar');toolbar.classList.add('canvas-toolbar');
 const tools=document.createElement('div'),views=document.createElement('div');tools.className='canvas-tools';views.className='canvas-views';tools.setAttribute('role','group');
 tools.append($('canvas-transform'),$('canvas-pivot'),$('grab-uv'),$('pan-preview'),$('canvas-snap'));
 const zoom=$('zoom').closest('label');zoom.classList.add('canvas-zoom');zoom.firstElementChild.classList.add('canvas-visually-hidden');
 $('zoom').setAttribute('aria-label',uiText('editor.zoom'));
 function menu(id,icon,key){const details=document.createElement('details'),summary=document.createElement('summary'),panel=document.createElement('div');details.id=id;details.className='canvas-dropdown';panel.className='canvas-dropdown-panel';canvasToolLabel(summary,icon,key);details.append(summary,panel);return {details,summary,panel};}
 const display=menu('canvas-display-menu','display','canvas.display');
 display.panel.append($('background').closest('label'),$('show-guides').closest('label'),$('show-pivot').closest('label'),$('guide-note'));
 const tiles=document.createElement('div');tiles.className='canvas-tiles';
 const tileMenu=menu('canvas-tile-menu','tile','canvas.tileOptions');tileMenu.summary.replaceChildren(document.createTextNode('▾'));tileMenu.summary.classList.add('canvas-menu-arrow');
 const off=document.createElement('button');off.type='button';off.onclick=()=>{if(tiled())$('tile-preview').click();tileMenu.details.open=false;tileMenu.summary.focus();};
 tileMenu.panel.append($('tile-grid').closest('label'),off);tiles.append($('tile-preview'),tileMenu.details);
 views.append(zoom,display.details,tiles);toolbar.replaceChildren(tools,views);
 const menus=[display,tileMenu];
 for(const menu of menus)menu.summary.addEventListener('click',event=>{event.preventDefault();menu.details.open=!menu.details.open;if(menu.details.open){fitCanvasPopup(menu.panel);for(const other of menus)if(other!==menu)other.details.open=false;}});
 for(const menu of menus)menu.details.addEventListener('toggle',()=>{if(menu.details.open){fitCanvasPopup(menu.panel);for(const other of menus)if(other!==menu)other.details.open=false;}});
 toolbar.addEventListener('keydown',event=>{if([' ','Enter'].includes(event.key)&&event.target.closest('button,summary'))event.stopPropagation();});
 const pane=toolbar.closest('.tree-preview');
 if(globalThis.ResizeObserver)new ResizeObserver(()=>{for(const menu of menus)if(menu.details.open)fitCanvasPopup(menu.panel);for(const panel of pane.querySelectorAll('.canvas-aspect-custom:not([hidden])'))fitCanvasPopup(panel);}).observe(pane);
 document.addEventListener('click',event=>{for(const {details}of menus)if(!details.contains(event.target))details.open=false;});
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;for(const {details,summary}of menus)if(details.open){details.open=false;summary.focus();event.preventDefault();event.stopPropagation();}
 },true);
 function sync(){
  canvasToolLabel($('grab-uv'),'uv','editor.editUV','canvas.uvShort');canvasToolLabel($('pan-preview'),'pan','editor.panCanvas','canvas.panShort');
  canvasToolLabel(display.summary,'display','canvas.display');canvasToolLabel($('tile-preview'),'tile','editor.tilePreview');
  $('tile-preview').querySelector('span').textContent=tiled()?uiFormat('canvas.tileSize',tileGrid()):uiText('canvas.tileShort');
  tileMenu.summary.setAttribute('aria-label',uiText('canvas.tileOptions'));tileMenu.summary.title=uiText('canvas.tileOptions');off.textContent=uiText('canvas.tileOff');tools.setAttribute('aria-label',uiText('canvas.tools'));$('zoom').setAttribute('aria-label',uiText('editor.zoom'));
 }
 $('tile-preview').addEventListener('click',sync);$('tile-grid').addEventListener('change',()=>{sync();tileMenu.details.open=false;tileMenu.summary.focus();});onLanguageChange(sync);sync();return {sync};
}
export function installSearchClear(input,onClear){
 const wrapper=document.createElement('div');wrapper.className='graphic-search-field';input.before(wrapper);wrapper.append(input);
 const clear=document.createElement('button');clear.id='clear-shape-search';clear.type='button';clear.className='graphic-search-clear';clear.append(toolIcon('clear'));wrapper.append(clear);
 const sync=()=>{clear.hidden=!input.value;clear.title=uiText('canvas.clearSearch');clear.setAttribute('aria-label',uiText('canvas.clearSearch'));};
 clear.onclick=()=>{input.value='';onClear();sync();input.focus();};input.addEventListener('input',sync);onLanguageChange(sync);sync();
}
