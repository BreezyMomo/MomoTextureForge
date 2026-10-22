import {uiText} from './ui-language.js';
import {CURVE_CHANNELS,curveDefaults,identityCurve,curveTangents} from './channel-curves.js';
const channelKey=k=>'curves.'+k;
export function createChannelCurvesEditor({read,edit,begin,change,end,cancel,canEdit=()=>true,view={channel:'luminance',index:0}}){
 const el=(tag,props={})=>{const e=document.createElement(tag);for(const [k,v]of Object.entries(props))if(k==='text')e.textContent=v;else e.setAttribute(k,v);return e;};
 const host=el('section',{class:'channel-curves-editor'}),title=el('h3',{text:uiText('curves.title')}),enabled=el('input',{type:'checkbox','aria-label':uiText('curves.enable')}),label=el('label',{class:'tree-check channel-curves-toggle'});enabled.checked=read().enabled;label.append(enabled,document.createTextNode(uiText('curves.enable')));enabled.onchange=()=>edit(c=>c.enabled=enabled.checked);host.append(title,label);
 const controls=el('div',{class:'channel-curve-controls channel-curve-toolbar'}),select=el('select',{'aria-label':uiText('curves.channel')});
 for(const k of CURVE_CHANNELS)select.append(el('option',{value:k,text:uiText(channelKey(k))}));
 let channel=view.channel,index=view.index,drag=null;select.value=channel;
 const preset=el('select',{'aria-label':uiText('curves.preset')});for(const key of ['choose','linear','contrast','soft','brighten','invert'])preset.append(el('option',{value:key,text:uiText('curves.'+key)}));
 const reset=el('button',{type:'button',text:uiText('curves.resetChannel')}),resetAll=el('button',{type:'button',text:uiText('curves.resetAll')});controls.append(select,preset,reset,resetAll);host.append(controls);
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 260 180');svg.setAttribute('class','channel-curve-graph');svg.setAttribute('aria-label',uiText('curves.graph'));svg.setAttribute('role','group');svg.style.touchAction='none';host.append(svg);
 const make=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);return e;};
 for(let i=0;i<5;i++){make('line',{x1:10+i*60,y1:10,x2:10+i*60,y2:170,class:'curve-grid'});make('line',{x1:10,y1:10+i*40,x2:250,y2:10+i*40,class:'curve-grid'});}
 make('line',{x1:10,y1:170,x2:250,y2:10,class:'curve-guide'});const path=make('path',{class:'curve-path',fill:'none'}),handles=document.createElementNS(ns,'g');svg.append(handles);
 const inputs=el('div',{class:'channel-curve-controls'}),x=el('input',{type:'number',min:0,max:255,step:1,'aria-label':uiText('curves.input')}),y=el('input',{type:'number',min:0,max:255,step:1,'aria-label':uiText('curves.output')}),remove=el('button',{type:'button',text:uiText('curves.deletePoint')});
 for(const [key,input]of [['input',x],['output',y]]){const l=el('label',{text:uiText('curves.'+key)});l.append(input);inputs.append(l);}inputs.append(remove);host.append(inputs,el('p',{class:'tree-note',text:uiText('curves.hint')}));
 const points=()=>read()[channel];
 function refresh(){
  const c=read(),p=points(),slopes=curveTangents(p),xy=(x,y)=>`${10+x*240},${170-y*160}`;index=Math.min(index,p.length-1);view.channel=channel;view.index=index;enabled.checked=c.enabled;
  let d='M'+xy(...p[0]);for(let i=1;i<p.length;i++){const [a,b]=[p[i-1],p[i]],h=(b[0]-a[0])/3;d+=' C'+xy(a[0]+h,a[1]+slopes[i-1]*h)+' '+xy(b[0]-h,b[1]-slopes[i]*h)+' '+xy(...b);}path.setAttribute('d',d);handles.replaceChildren();
  p.forEach(([x,y],i)=>{const h=document.createElementNS(ns,'circle');for(const [k,v]of Object.entries({cx:10+x*240,cy:170-y*160,r:i===index?6:4,class:'curve-handle','data-index':i,tabindex:0,role:'button','aria-label':uiText('curves.point')+' '+(i+1)}))h.setAttribute(k,v);h.onkeydown=e=>{
   if(!canEdit())return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();index=i;remove.click();return;}
   const d={ArrowLeft:[-1/255,0],ArrowRight:[1/255,0],ArrowUp:[0,1/255],ArrowDown:[0,-1/255]}[e.key];if(!d)return;e.preventDefault();e.stopPropagation();index=i;edit(c=>{const p=c[channel];p[i]=[i===0?0:i===p.length-1?1:Math.max(p[i-1][0]+1/4096,Math.min(p[i+1][0]-1/4096,p[i][0]+d[0])),Math.max(0,Math.min(1,p[i][1]+d[1]))];c.enabled=true;});handles.children[index]?.focus();
  };handles.append(h);});
  x.value=Math.round(p[index][0]*255);y.value=Math.round(p[index][1]*255);x.disabled=index===0||index===p.length-1;remove.disabled=x.disabled;
 }
 const assign=(axis,input)=>{if(!Number.isFinite(input.valueAsNumber))return;edit(c=>{const p=c[channel];p[index][axis]=axis?Math.max(0,Math.min(1,input.valueAsNumber/255)):Math.max(p[index-1][0]+1/4096,Math.min(p[index+1][0]-1/4096,input.valueAsNumber/255));c.enabled=true;});};
 x.onchange=()=>assign(0,x);y.onchange=()=>assign(1,y);
 remove.onclick=()=>{if(index>0&&index<points().length-1)edit(c=>{c[channel].splice(index,1);c.enabled=true;});};
 reset.onclick=()=>edit(c=>c[channel]=identityCurve());resetAll.onclick=()=>edit(c=>Object.assign(c,curveDefaults()));
 select.onchange=()=>{channel=select.value;index=0;refresh();};
 preset.onchange=()=>{const shapes={linear:identityCurve(),contrast:[[0,0],[.25,.12],[.75,.88],[1,1]],soft:[[0,0],[.25,.38],[.75,.62],[1,1]],brighten:[[0,0],[.5,.7],[1,1]],invert:[[0,1],[1,0]]};if(shapes[preset.value]){const p=shapes[preset.value];edit(c=>{c[channel]=p;c.enabled=true;});}preset.value='choose';};
 const xy=e=>{const b=svg.getBoundingClientRect();return [Math.max(0,Math.min(1,((e.clientX-b.left)/b.width*260-10)/240)),Math.max(0,Math.min(1,(170-(e.clientY-b.top)/b.height*180)/160))];};
 svg.onpointerdown=e=>{
  if(e.button!==0||!canEdit())return;e.preventDefault();const hit=e.target.closest('[data-index]'),[px,py]=xy(e);
  if(!hit&&(points().length>=16||points().some(p=>Math.abs(p[0]-px)<1/4096)))return;
  begin();if(hit)index=+hit.getAttribute('data-index');else change(c=>{c[channel].push([px,py]);c[channel].sort((a,b)=>a[0]-b[0]);index=c[channel].findIndex(p=>p[0]===px);c.enabled=true;});
  drag={pointerId:e.pointerId};svg.setPointerCapture(e.pointerId);refresh();
 };
 svg.onpointermove=e=>{if(!drag)return;const [px,py]=xy(e);change(c=>{const p=c[channel];p[index]=[index===0?0:index===p.length-1?1:Math.max(p[index-1][0]+1/4096,Math.min(p[index+1][0]-1/4096,px)),py];c.enabled=true;});refresh();};
 const stop=()=>{if(!drag)return;drag=null;end();};svg.onpointerup=stop;svg.onlostpointercapture=stop;svg.onpointercancel=()=>{if(drag){drag=null;cancel();}};
 // Edits rebuild this widget; retain the selected channel and point within it.
 const run=edit;edit=fn=>{if(!canEdit())return;view.channel=channel;view.index=index;run(fn);refresh();};
 host.curveChannel=()=>channel;host.selectCurveChannel=k=>{if(CURVE_CHANNELS.includes(k)){channel=k;select.value=k;index=0;refresh();}};
 refresh();return host;
}
