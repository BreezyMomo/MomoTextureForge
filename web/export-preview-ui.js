import {uiText,uiFormat} from './ui-language.js';
export function createExportPreview({data,stale,busy,generate,batchSize,onBatchSize}){
 const el=(tag,attributes={},children=[])=>{const node=document.createElement(tag);Object.assign(node,attributes);node.append(...children);return node;};
 let disposed=false,raf=0,url;
 const title=el('strong',{textContent:uiText('export.previewTitle')}),description=el('p',{className:'tree-note',textContent:uiText('export.previewHelp')});
 const button=el('button',{id:'generate-export-preview',textContent:uiText(data?'export.refreshPreview':'export.generateAtlasPreview'),disabled:busy,onclick:generate});
 const section=el('section',{className:'tree-export-preview'},[title,description]);
 if(batchSize){const select=el('select');select.setAttribute('aria-label',uiText('export.previewBatchSize'));for(const size of [64,128,256])select.append(el('option',{value:String(size),textContent:String(size)}));select.value=String(batchSize);select.disabled=busy;select.onchange=()=>onBatchSize(+select.value);section.append(el('label',{className:'tree-field'},[document.createTextNode(uiText('export.previewBatchSize')),select]));}
 section.append(button);
 section.dataset.stale=String(stale);section.setAttribute('aria-label',uiText('export.previewTitle'));
 if(data){
  const status=el('p',{className:'tree-note',textContent:stale?uiText('export.previewStale'):uiFormat('export.previewReady',data.frames,data.fps)});status.setAttribute('role','status');section.append(status);
  url=URL.createObjectURL(new Blob([data.bytes],{type:data.mime}));
  const image=el('img',{src:url,alt:uiText(data.mime==='image/gif'?'export.gifPreviewImage':'editor.fullCanvasAtlasPreview'),style:'display:block;width:100%;max-height:55vh;object-fit:contain'});
  if(data.mime==='image/gif'){
   const replay=el('button',{textContent:uiText('export.previewReplay'),disabled:busy,onclick:()=>{URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([data.bytes],{type:data.mime}));image.src=url;}});section.append(image,replay);
  }
  else{
   const canvas=el('canvas',{width:data.frameWidth,height:data.frameHeight,style:'display:block;width:100%;height:220px;object-fit:contain'});canvas.setAttribute('aria-label',uiText('export.animationPreviewImage'));
   const play=el('button',{textContent:uiText('playback.pause'),disabled:busy}),counter=el('output'),slider=el('input',{type:'range',min:'0',max:String(data.frames-1),step:'1',value:'0'});slider.setAttribute('aria-label',uiText('export.previewFrame'));
   const overview=el('details',{className:'export-preview-overview'},[el('summary',{textContent:uiText('export.previewAllFrames')}),image]);
   section.append(canvas,el('div',{className:'tree-toolbar'},[play,counter]),slider,overview);
   let playing=!stale&&!busy,start=performance.now(),frame=0,ready=false;
   counter.setAttribute('aria-live','off');
   const draw=index=>{frame=index;slider.value=String(index);counter.textContent=uiFormat('export.previewFrameCount',index+1,data.frames);slider.setAttribute('aria-valuetext',counter.textContent);if(ready){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,(index%data.columns)*data.frameWidth,Math.floor(index/data.columns)*data.frameHeight,data.frameWidth,data.frameHeight,0,0,canvas.width,canvas.height);}};
   const tick=now=>{if(disposed)return;if(playing)draw(Math.floor((now-start)/1000*data.fps)%data.frames);raf=requestAnimationFrame(tick);};
   play.textContent=uiText(playing?'playback.pause':'playback.play');play.onclick=()=>{playing=!playing;start=performance.now()-frame/data.fps*1000;play.textContent=uiText(playing?'playback.pause':'playback.play');};
   slider.oninput=()=>{playing=false;play.textContent=uiText('playback.play');draw(+slider.value);};
   image.onload=()=>{if(disposed)return;ready=true;draw(0);raf=requestAnimationFrame(tick);};
  }
 }
 return {element:section,dispose(){disposed=true;cancelAnimationFrame(raf);if(url)URL.revokeObjectURL(url);}};
}
