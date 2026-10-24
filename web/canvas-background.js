import {uiText,uiFormat} from './ui-language.js';
import {onLanguageChange} from './language.js';

export const canvasBackground=output=>({alpha:output?.alpha!==false,background:/^#[0-9a-f]{6}$/i.test(output?.background)?output.background.toLowerCase():'#000000'});
export const sameCanvasBackground=(a,b)=>{const x=canvasBackground(a),y=canvasBackground(b);return x.alpha===y.alpha&&x.background===y.background;};
export const applyCanvasBackground=(p,value)=>Object.assign(p.output,canvasBackground(value));

export function installCanvasBackground({host,stage,getOutput,isBusy=()=>false,onChange,previewColor,commitColor,cancelColor}){
 const doc=host.ownerDocument,mode=host.querySelector('select'),caption=host.querySelector('label>span');
 for(const value of ['transparent','solid']){const option=doc.createElement('option');option.value=value;mode.append(option);}
 const colors=doc.createElement('div');colors.className='canvas-background-colors';
 const label=doc.createElement('label'),text=doc.createElement('span'),color=doc.createElement('input');color.type='color';color.id='canvas-background-color';label.append(text,color);colors.append(label);
 const presets=['#000000','#ffffff'].map(value=>{const b=doc.createElement('button');b.type='button';b.className='canvas-background-preset';b.style.setProperty('--background-swatch',value);b.onclick=()=>onChange({alpha:false,background:value});colors.append(b);return b;});
 const hint=doc.createElement('p');hint.className='tree-note canvas-background-hint';host.append(colors,hint);
 mode.onchange=()=>onChange({...canvasBackground(getOutput()),alpha:mode.value==='transparent'});
 color.oninput=()=>previewColor(color.value);color.onchange=()=>{previewColor(color.value);commitColor();};color.onblur=commitColor;
 color.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelColor();sync();}};
 function sync(){
  const value=canvasBackground(getOutput()),busy=isBusy();mode.disabled=color.disabled=busy;for(const b of presets)b.disabled=busy;mode.value=value.alpha?'transparent':'solid';if(color.value!==value.background)color.value=value.background;colors.hidden=value.alpha;
  stage.classList.remove('black','white');stage.classList.toggle('checker',value.alpha);stage.classList.toggle('solid',!value.alpha);stage.style.setProperty('--canvas-background-color',value.background);
  caption.textContent=uiText('canvas.background');mode.setAttribute('aria-label',uiText('canvas.background'));mode.options[0].textContent=uiText('canvas.backgroundTransparent');mode.options[1].textContent=uiText('canvas.backgroundSolid');
  text.textContent=uiText('canvas.backgroundColor');color.setAttribute('aria-label',uiText('editor.canvasBackgroundColor'));hint.textContent=uiText('canvas.backgroundHint');
  for(const [i,b]of presets.entries()){const title=uiFormat('canvas.backgroundPreset',uiText(i?'editor.white':'editor.black'));b.title=title;b.setAttribute('aria-label',title);b.setAttribute('aria-pressed',String(!value.alpha&&value.background===(i?'#ffffff':'#000000')));}
 }
 onLanguageChange(sync);sync();return {sync};
}
