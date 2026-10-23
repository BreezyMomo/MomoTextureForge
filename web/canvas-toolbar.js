import {editorIcon} from './editor-icons.js';
import {uiText,uiFormat} from './ui-language.js';
import {onLanguageChange} from './language.js';

export const toolIcon=name=>editorIcon(name);
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
 const stage=$('canvas-stage');stage.tabIndex=-1;
 tools.addEventListener('click',event=>{if(event.detail>0&&event.target.closest('button'))stage.focus({preventScroll:true});});
 const zoom=$('zoom').closest('label');zoom.classList.add('canvas-zoom');zoom.firstElementChild.classList.add('canvas-visually-hidden');
 $('zoom').setAttribute('aria-label',uiText('editor.zoom'));
 const reset=document.createElement('button');reset.id='reset-canvas-view';reset.type='button';reset.className='canvas-tool canvas-reset-view';reset.append(toolIcon('frame'));
 reset.addEventListener('click',event=>{if(event.detail>0)stage.focus({preventScroll:true});});
 const zoomControls=document.createElement('div');zoomControls.className='canvas-zoom-controls';zoomControls.append(zoom,reset);
 function menu(id,icon,key){const details=document.createElement('details'),summary=document.createElement('summary'),panel=document.createElement('div');details.id=id;details.className='canvas-dropdown';panel.className='canvas-dropdown-panel';canvasToolLabel(summary,icon,key);details.append(summary,panel);return {details,summary,panel};}
 const display=menu('canvas-display-menu','display','canvas.display');
 display.panel.append($('background').closest('label'),$('show-guides').closest('label'),$('show-pivot').closest('label'),$('guide-note'));
 const tiles=document.createElement('div');tiles.className='canvas-tiles';
 const tileMenu=menu('canvas-tile-menu','tile','canvas.tileOptions');tileMenu.summary.replaceChildren(document.createTextNode('▾'));tileMenu.summary.classList.add('canvas-menu-arrow');
 const off=document.createElement('button');off.type='button';off.onclick=()=>{if(tiled())$('tile-preview').click();tileMenu.details.open=false;tileMenu.summary.focus();};
 tileMenu.panel.append($('tile-grid').closest('label'),off);tiles.append($('tile-preview'),tileMenu.details);
 views.append(zoomControls,display.details,tiles);toolbar.replaceChildren(tools,views);
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
  reset.title=uiText('canvas.resetView');reset.setAttribute('aria-label',uiText('canvas.resetView'));
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
