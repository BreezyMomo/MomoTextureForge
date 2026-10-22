import {onLanguageChange} from './language.js';
import {uiText} from './ui-language.js';
const DEFAULTS={background:'dark',blend:'compare',size:.8,brightness:1,color:'#53647a'};
const element=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text)e.textContent=uiText(text);return e;};

// Composite one shared transparent frame over viewing backgrounds. These settings
// never touch the authored project, node blending or export alpha/background.
export function createEffectPreview(host,{controls}={}){
 const values={...DEFAULTS},frame=document.createElement('canvas'),frameContext=frame.getContext('2d');
 const bar=element('div','effect-preview-settings'),grid=element('div','effect-preview-grid');
 grid.setAttribute('role','group');grid.setAttribute('aria-label',uiText("effect.effectBlendingComparison"));host.append(grid);controls.append(bar);
 let tiles=[],sampled=false,disposed=false;
 function select(titleKey,labelKey,key,options){
  const row=element('label'),title=element('span','',uiText(titleKey)),input=element('select');input.setAttribute('aria-label',uiText(labelKey));
  for(const [value,text]of options)input.add(new Option(uiText(text),value));input.value=values[key];
  input.onchange=()=>{values[key]=input.value;build();draw();};row.append(title,input);bar.append(row);return input;
 }
 const background=select('editor.background','effect.effectBackground','background',[['dark',"effect.darkBackground"],['light',"effect.lightBackground"],['compare',"effect.darkLightComparison"],['custom',"effect.customBackground"]]);
 const blend=select('editor.blendMode','effect.effectBlending','blend',[['compare',"effect.alphaAdditiveComparison"],['alpha',"effect.alphaBlending"],['add',"effect.additiveBlending"]]);
 const custom=element('label','effect-custom-color'),color=element('input');color.type='color';color.value=values.color;color.setAttribute('aria-label',uiText("effect.effectPreviewBackgroundColor"));custom.append(element('span','',uiText("effect.backgroundColor")),color);bar.append(custom);
 color.oninput=()=>{values.color=color.value;build();draw();};
 const sliders={};
 for(const [key,label,min,max,step]of [['size',"effect.displaySize",.2,1,.01],['brightness',"effect.previewBrightness",0,3,.05]]){
  const row=element('label'),input=element('input'),output=element('output');Object.assign(input,{type:'range',min,max,step,value:values[key]});input.setAttribute('aria-label',uiText(label));
  const sync=()=>output.textContent=key==='size'?Math.round(values[key]*100)+'%':values[key].toFixed(2)+'×';
  input.oninput=()=>{values[key]=Number(input.value);sync();draw();};sync();row.append(element('span','',label),input,output);bar.append(row);sliders[key]={input,sync,row,label};
 }
 const reset=element('button','',uiText("effect.resetEffectPreview"));reset.type='button';reset.onclick=()=>{Object.assign(values,DEFAULTS);background.value=values.background;blend.value=values.blend;color.value=values.color;for(const [key,{input,sync}]of Object.entries(sliders)){input.value=values[key];sync();}build();draw();};bar.append(reset);
 const note=element('p','effect-preview-note',uiText("effect.playbackAndTheTimelineUpdateEveryViewTogetherPreviewSettingsDo"));bar.append(note);
 const languageDispose=onLanguageChange(()=>{if(disposed)return;grid.setAttribute('aria-label',uiText('effect.effectBlendingComparison'));for(const [input,label,options]of [[background,"editor.background",["effect.darkBackground","effect.lightBackground","effect.darkLightComparison","effect.customBackground"]],[blend,"editor.blendMode",["effect.alphaAdditiveComparison","effect.alphaBlending","effect.additiveBlending"]]]){input.parentElement.firstChild.textContent=uiText(label);input.setAttribute('aria-label',uiText(label));options.forEach((text,i)=>input.options[i].text=uiText(text));}custom.firstChild.textContent=uiText("effect.backgroundColor");color.setAttribute('aria-label',uiText("effect.effectPreviewBackgroundColor"));for(const {input,row,label}of Object.values(sliders)){row.firstChild.textContent=uiText(label);input.setAttribute('aria-label',uiText(label));}reset.textContent=uiText("effect.resetEffectPreview");note.textContent=uiText("effect.playbackAndTheTimelineUpdateEveryViewTogetherPreviewSettingsDo");build();draw();});
 function build(){
  custom.hidden=values.background!=='custom';grid.replaceChildren();tiles=[];
  const backgrounds=values.background==='compare'?['dark','light']:[values.background],blends=values.blend==='compare'?['alpha','add']:[values.blend];
  grid.dataset.columns=String(blends.length);grid.dataset.rows=String(backgrounds.length);
  for(const bg of backgrounds)for(const mode of blends){
   const title=uiText(bg==='dark'?"effect.darkBackground":bg==='light'?"effect.lightBackground":"effect.customBackground")+' · '+uiText(mode==='alpha'?"effect.alphaBlending":"effect.additiveBlending");
   const card=element('section','effect-preview-card'),head=element('div','effect-preview-heading'),canvas=element('canvas','effect-preview-canvas');
   card.dataset.background=bg;card.dataset.blend=mode;canvas.setAttribute('aria-label',(title + uiText("editor.preview")));head.append(element('strong','',title),element('span','',(mode==='alpha' ? uiText("effect.preservesAlphaOcclusion") : uiText("effect.addsBrightRegions"))));card.append(head,canvas);grid.append(card);tiles.push({canvas,context:canvas.getContext('2d'),bg,mode});
  }
 }
 function backdrop(context,w,h,bg){
  const light=bg==='light',gradient=context.createLinearGradient(0,0,0,h);
  if(bg==='custom'){gradient.addColorStop(0,values.color);gradient.addColorStop(1,values.color);}
  else{gradient.addColorStop(0,light?'#eef1f6':'#0e1420');gradient.addColorStop(1,light?'#bdcbdc':'#26364c');}
  context.fillStyle=gradient;context.fillRect(0,0,w,h);
  // A shared ground reference helps compare dark borders and fading edges.
  context.strokeStyle=light?'#52657b26':'#b0cee21c';context.lineWidth=1;context.beginPath();
  const horizon=h*.82;context.moveTo(0,horizon);context.lineTo(w,horizon);
  for(let i=-3;i<=3;i++){context.moveTo(w*.5+i*w*.1,horizon);context.lineTo(w*.5+i*w*.28,h);}
  context.moveTo(0,h*.9);context.lineTo(w,h*.9);context.stroke();
 }
 function draw(){
  if(disposed)return;const dpr=Math.min(2,window.devicePixelRatio||1);
  for(const {canvas,context,bg,mode}of tiles){
   const rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
   if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
   context.save();context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='source-over';context.filter='none';backdrop(context,w,h,bg);
   if(sampled){const scale=Math.min(w/frame.width,h/frame.height)*values.size,fw=frame.width*scale,fh=frame.height*scale;
    context.globalCompositeOperation=mode==='alpha'?'source-over':'lighter';context.filter='brightness('+values.brightness+')';context.drawImage(frame,(w-fw)/2,(h-fh)/2,fw,fh);
   }context.restore();
  }
 }
 build();
 return {
  sampleSize(ratio,quick=false){const side=quick?256:512;return {width:Math.max(1,Math.round(side*Math.min(1,ratio))),height:Math.max(1,Math.round(side/Math.max(1,ratio)))};},
  update(source){if(disposed)return;if(frame.width!==source.width)frame.width=source.width;if(frame.height!==source.height)frame.height=source.height;frameContext.clearRect(0,0,frame.width,frame.height);frameContext.drawImage(source,0,0);sampled=true;draw();},
  destroy(){disposed=true;languageDispose();grid.remove();bar.remove();frame.width=frame.height=1;tiles=[];}
 };
}
