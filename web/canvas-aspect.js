import {uiText,uiFormat} from './ui-language.js';
import {onLanguageChange} from './language.js';
import {toolIcon,fitCanvasPopup} from './canvas-toolbar.js';

const presets=[[1,'1 : 1'],[4/3,'4 : 3'],[16/9,'16 : 9'],[2,'2 : 1'],[4,'4 : 1'],[8,'8 : 1'],[3/4,'3 : 4'],[9/16,'9 : 16'],[.5,'1 : 2'],[.25,'1 : 4'],[.125,'1 : 8']];
const presetFor=ratio=>presets.find(([value])=>Math.abs(value-ratio)<1e-8);
export function createCanvasAspect({ratio,onChange,compact=false}){
 const host=document.createElement('div');host.className='canvas-aspect'+(compact?' compact':'');
 const label=document.createElement('label'),caption=document.createElement('span'),select=document.createElement('select');
 label.append(caption,select);host.append(label);
 const option=(text,value)=>{const item=document.createElement('option');item.textContent=text;item.value=String(value);select.append(item);return item;};
 for(const [value,text]of presets)option(text,value);
 const customCurrent=option('', 'current-custom'),custom=option('', 'custom');
 customCurrent.hidden=true;customCurrent.disabled=true;
 const editButton=document.createElement('button');editButton.type='button';editButton.className='canvas-aspect-edit';editButton.append(toolIcon('edit'));if(compact)host.append(editButton);
 const editor=document.createElement('div');editor.className='canvas-aspect-custom';editor.hidden=true;host.append(editor);
 if(compact){editor.setAttribute('role','dialog');editor.setAttribute('aria-modal','false');}
 const inputs=[];
 for(const key of ['canvas.aspectWidth','canvas.aspectHeight']){
  const field=document.createElement('label'),name=document.createElement('span'),input=document.createElement('input');
  input.type='number';input.min='0.000001';input.step='any';input.inputMode='decimal';field.append(name,input);editor.append(field);inputs.push({key,name,input});
 }
 const error=document.createElement('p');error.className='canvas-aspect-error';error.setAttribute('role','alert');error.hidden=true;
 const hint=document.createElement('p');hint.className='tree-note';
 const actions=document.createElement('div');actions.className='canvas-aspect-actions';
 const apply=document.createElement('button');apply.type='button';actions.append(apply);
 const cancel=document.createElement('button');cancel.type='button';if(compact)actions.append(cancel);
 editor.append(hint,error,actions);
 let current=ratio;
 const selectCurrent=()=>{const preset=presetFor(current);customCurrent.textContent=uiFormat('canvas.currentCustomAspect',Number(current.toPrecision(6))+' : 1');select.value=String(preset?.[0]??'current-custom');};
 const resetFields=()=>{const preset=presetFor(current),parts=preset?preset[1].split(' : ').map(Number):current>=1?[current,1]:[1,1/current];inputs.forEach(({input},i)=>input.value=String(Number(parts[i].toPrecision(8))));error.hidden=true;};
 function localize(){
  caption.textContent=uiText(compact?'canvas.aspectShort':'editor.aspectPresets');select.setAttribute('aria-label',uiText('editor.canvasAspectRatio'));
  custom.textContent=uiText('canvas.customAspect');editor.setAttribute('aria-label',uiText('canvas.customAspect'));
  for(const {key,name}of inputs)name.textContent=uiText(key);
  hint.textContent=uiText('canvas.aspectHint');error.textContent=uiText('canvas.aspectInvalid');apply.textContent=uiText('canvas.applyAspect');cancel.textContent=uiText('common.cancel');
  editButton.title=uiText('canvas.editAspect');editButton.setAttribute('aria-label',uiText('canvas.editAspect'));
  selectCurrent();
 }
 function sync(value){const changed=Math.abs(current-value)>1e-8;current=value;if(changed)editor.hidden=true;selectCurrent();if(editor.hidden){resetFields();if(!compact)editor.hidden=!!presetFor(current);}editButton.hidden=!!presetFor(current);}
 const open=()=>{resetFields();editor.hidden=false;if(compact)fitCanvasPopup(editor);inputs[0].input.focus();inputs[0].input.select();};editButton.onclick=open;
 select.onchange=()=>{
  // Custom is an action, never the selected value. Selecting it again must
  // dispatch a real change even when the current ratio is already custom.
  if(select.value==='custom'){selectCurrent();open();}
  else if(select.value==='current-custom')open();
  else{editor.hidden=true;const actual=onChange(Number(select.value));if(typeof actual==='number')sync(actual);}
 };
 const close=()=>{editor.hidden=true;selectCurrent();select.focus();};
 cancel.onclick=close;
 apply.onclick=()=>{
  const [width,height]=inputs.map(({input})=>input.valueAsNumber),value=width/height;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||!Number.isFinite(value)||value<.125||value>8){error.hidden=false;return;}
  editor.hidden=true;const actual=onChange(value);sync(typeof actual==='number'?actual:value);if(compact)select.focus();
 };
 host.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!editor.hidden&&compact){event.preventDefault();event.stopPropagation();close();}
  else if(event.key==='Enter'&&inputs.some(({input})=>event.target===input)){event.preventDefault();event.stopPropagation();apply.click();}
  else if([' ','Enter'].includes(event.key)&&event.target.closest('button'))event.stopPropagation();
 });
 // This listener belongs only to the persistent preview control. Rebuilt settings
 // controls have no document listeners or language subscriptions.
 if(compact){document.addEventListener('pointerdown',event=>{if(!editor.hidden&&!host.contains(event.target)){editor.hidden=true;selectCurrent();}});onLanguageChange(localize);const Observer=globalThis.ResizeObserver;if(Observer)new Observer(()=>{if(!editor.hidden)fitCanvasPopup(editor);}).observe(host);}
 localize();sync(ratio);return {element:host,sync};
}
