import {uiText,uiFormat} from './ui-language.js';
import {BEZIER_LIMIT,BEZIER_SEGMENTS,bezierCount,splitBezier,extendBezier,removeBezierAnchor,movedBezier} from './bezier-path.js';
const NS='http://www.w3.org/2000/svg';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createCurveEditor(read,options){
 const {begin,point,end,canEdit=()=>true,view={x:0,y:0,span:300,selected:0},onView=()=>{}}=options;
 view.x??=0;view.y??=0;view.span??=300;view.selected??=0;
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','curve-editor');svg.setAttribute('aria-label',uiText('ui.bZierControlPointEditor'));svg.setAttribute('tabindex','0');
 const make=(name,attrs,parent=svg)=>{const e=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;};
 const grid=make('g',{'aria-hidden':'true'}),domain=make('rect',{x:-100,y:-100,width:200,height:200,class:'curve-domain','aria-hidden':'true'}),guides=make('g',{'aria-hidden':'true'}),path=make('path',{class:'curve-path',fill:'none'}),handles=make('g',{});
 let drag=null;
 const coords=event=>{const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
 const write=(index,x,y)=>{const values=movedBezier(read(),index,x,y),before=read();if(options.changePoints){options.changePoints(values);return;}for(let i=0;i<values.length;i+=2)if(values[i]!==before[i]||values[i+1]!==before[i+1])point(i/2,values[i],values[i+1]);};
 function update(){
  const values=read(),count=values.length/2;view.selected=clamp(view.selected,0,count-1);view.span=clamp(view.span,30,4000);svg.setAttribute('viewBox',`${view.x-view.span/2} ${view.y-view.span/2} ${view.span} ${view.span}`);
  const scale=view.span/Math.max(1,Math.min(svg.clientWidth||300,svg.clientHeight||300)),target=view.span/6,power=10**Math.floor(Math.log10(target)),step=[1,2,5,10].map(v=>v*power).find(v=>v>=target);grid.replaceChildren();
  for(let v=Math.ceil((view.x-view.span/2)/step)*step;v<=view.x+view.span/2;v+=step)make('line',{x1:v,y1:view.y-view.span/2,x2:v,y2:view.y+view.span/2,class:'curve-grid'},grid);
  for(let v=Math.ceil((view.y-view.span/2)/step)*step;v<=view.y+view.span/2;v+=step)make('line',{x1:view.x-view.span/2,y1:v,x2:view.x+view.span/2,y2:v,class:'curve-grid'},grid);
  const xy=i=>[values[i*2]*100,-values[i*2+1]*100];let d='M'+xy(0);guides.replaceChildren();
  for(let i=0;i<count-1;i+=3){d+=' C'+xy(i+1)+' '+xy(i+2)+' '+xy(i+3);for(const [a,b]of [[i,i+1],[i+2,i+3]])make('line',{x1:xy(a)[0],y1:xy(a)[1],x2:xy(b)[0],y2:xy(b)[1],class:'curve-guide'},guides);}path.setAttribute('d',d);handles.replaceChildren();
  for(let i=0;i<count;i++){const anchor=i%3===0,h=make('g',{class:'curve-point','data-point':i,'aria-disabled':String(!canEdit(i)),tabindex:0,role:'button','aria-label':uiFormat(anchor?'bezier.anchor':'bezier.handle',anchor?i/3+1:i)},handles);
   make('circle',{cx:xy(i)[0],cy:xy(i)[1],r:11*scale,class:'curve-hit'},h);
   make('circle',{cx:xy(i)[0],cy:xy(i)[1],r:(anchor?6:5)*scale,class:'curve-handle'+(anchor?' curve-anchor':'')+(i===view.selected?' curve-selected':'')},h);
   h.onkeydown=event=>{const delta={ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,.01],ArrowDown:[0,-.01]}[event.key];if(!delta||!canEdit(i))return;event.preventDefault();event.stopPropagation();view.selected=i;begin();const p=read(),factor=event.shiftKey?10:1;write(i,clamp(p[i*2]+delta[0]*factor,-BEZIER_LIMIT,BEZIER_LIMIT),clamp(p[i*2+1]+delta[1]*factor,-BEZIER_LIMIT,BEZIER_LIMIT));end();update();handles.querySelector(`[data-point="${i}"]`)?.focus();};}
  onView();
 }
 function fit(){const p=read(),x=p.filter((_,i)=>i%2===0).map(v=>v*100),y=p.filter((_,i)=>i%2).map(v=>-v*100);view.x=(Math.min(...x)+Math.max(...x))/2;view.y=(Math.min(...y)+Math.max(...y))/2;view.span=clamp(Math.max(100,Math.max(...x)-Math.min(...x),Math.max(...y)-Math.min(...y))*1.3,30,4000);update();}
 function zoom(factor,event){const anchor=event?coords(event):{x:view.x,y:view.y},span=clamp(view.span*factor,30,4000),ratio=span/view.span;view.x=anchor.x+(view.x-anchor.x)*ratio;view.y=anchor.y+(view.y-anchor.y)*ratio;view.span=span;update();}
 svg.onwheel=event=>{event.preventDefault();event.stopPropagation();zoom(event.deltaY<0?1/1.2:1.2,event);};
 svg.onpointerdown=event=>{if(event.button!==0&&event.button!==1)return;const index=event.target.closest?.('[data-point]')?.getAttribute('data-point');if(index!==null&&index!==undefined&&!canEdit(+index))return;event.preventDefault();event.stopPropagation();if(index!==null&&index!==undefined){view.selected=+index;const position=coords(event),values=read();begin();drag={point:+index,dx:position.x-values[index*2]*100,dy:position.y+values[index*2+1]*100};svg.dataset.drag='point';update();}else{drag={x:event.clientX,y:event.clientY,cx:view.x,cy:view.y,scale:view.span/Math.max(1,Math.min(svg.clientWidth,svg.clientHeight))};svg.dataset.drag='pan';}svg.setPointerCapture(event.pointerId);};
 svg.onpointermove=event=>{if(!drag)return;if(drag.point===undefined){view.x=drag.cx-(event.clientX-drag.x)*drag.scale;view.y=drag.cy-(event.clientY-drag.y)*drag.scale;}else if(canEdit(drag.point)){const p=coords(event);write(drag.point,Math.round(clamp((p.x-drag.dx)/100,-BEZIER_LIMIT,BEZIER_LIMIT)*100)/100,Math.round(clamp(-(p.y-drag.dy)/100,-BEZIER_LIMIT,BEZIER_LIMIT)*100)/100);}update();};
 const stop=()=>{delete svg.dataset.drag;if(!drag)return;const editing=drag.point!==undefined;drag=null;if(editing)end();};svg.onpointerup=stop;svg.onlostpointercapture=stop;svg.onpointercancel=()=>{delete svg.dataset.drag;if(drag?.point!==undefined&&options.cancel){drag=null;options.cancel();}else stop();};
 svg.finishCurveDrag=stop;svg.refreshCurve=update;svg.fitCurve=fit;svg.zoomCurve=zoom;svg.resetCurveView=()=>{view.x=0;view.y=0;view.span=300;update();};svg.curveView=view;svg.writeCurvePoint=write;update();return svg;
}
export function createBezierPanel(read,options){
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;},view=options.view??{x:0,y:0,span:300,selected:0};
 function panel(large=false){
  const host=make('div','bezier-editor-panel'),toolbar=make('div','bezier-editor-toolbar'),status=make('span','bezier-editor-status'),fields=make('div','bezier-editor-coordinates'),actions=make('div','bezier-editor-actions'),hint=make('p','tree-note',uiText('bezier.navigation')),lock=make('p','tree-note');let svg;
  const button=(parent,key,run)=>{const b=make('button','',uiText(key));b.type='button';b.onclick=()=>{run();sync();};parent.append(b);return b;};
  const zoomOut=button(toolbar,'bezier.zoomOut',()=>svg.zoomCurve(1.25)),zoomIn=button(toolbar,'bezier.zoomIn',()=>svg.zoomCurve(.8));for(const [b,key]of [[zoomOut,'bezier.zoomOutLabel'],[zoomIn,'bezier.zoomInLabel']]){b.title=uiText(key);b.setAttribute('aria-label',uiText(key));}button(toolbar,'bezier.fit',()=>svg.fitCurve());button(toolbar,'bezier.resetView',()=>svg.resetCurveView());toolbar.append(status);
  if(!large)button(toolbar,'bezier.expand',()=>{const dialog=make('dialog','bezier-editor-dialog'),header=make('header'),title=make('strong','',uiText('bezier.title'));header.append(title);button(header,'bezier.close',()=>dialog.close());dialog.append(header,panel(true));dialog.addEventListener('close',()=>{dialog.querySelector('svg')?.finishCurveDrag?.();dialog.remove();options.onClose?.();});dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dialog.close();}});document.body.append(dialog);dialog.showModal();dialog.querySelector('svg').refreshCurve();});
  const inputs=[0,1].map(axis=>{const label=make('label','',axis?'Y':'X'),input=make('input');input.type='number';input.min=-BEZIER_LIMIT;input.max=BEZIER_LIMIT;input.step=.01;input.setAttribute('aria-label',uiText(axis?'bezier.selectedY':'bezier.selectedX'));label.append(input);fields.append(label);input.onchange=()=>{if(!options.canEdit(view.selected)||!Number.isFinite(input.valueAsNumber))return;const p=read(),at=view.selected*2;options.begin();svg.writeCurvePoint(view.selected,axis?p[at]:clamp(input.valueAsNumber,-BEZIER_LIMIT,BEZIER_LIMIT),axis?clamp(input.valueAsNumber,-BEZIER_LIMIT,BEZIER_LIMIT):p[at+1]);options.end();svg.refreshCurve();};return input;});
  let split,extend,remove;
  if(options.replace){
   split=button(actions,'bezier.addAnchor',()=>{if(!options.canRestructure()||bezierCount(read())>=BEZIER_SEGMENTS)return;const segment=clamp(Math.floor(Math.max(0,view.selected-1)/3),0,bezierCount(read())-1);options.replace(splitBezier(read(),segment));view.selected=segment*3+3;svg.refreshCurve();});
   extend=button(actions,'bezier.extend',()=>{if(!options.canRestructure()||bezierCount(read())>=BEZIER_SEGMENTS)return;options.replace(extendBezier(read()));view.selected=read().length/2-1;svg.refreshCurve();});
   remove=button(actions,'bezier.removeAnchor',()=>{if(!options.canRestructure()||view.selected%3||bezierCount(read())<=1)return;options.replace(removeBezierAnchor(read(),view.selected));view.selected=Math.min(view.selected,read().length/2-1);svg.refreshCurve();});
  }
  function sync(){if(!svg)return;const p=read(),count=bezierCount(p),allowed=options.canEdit(view.selected);status.textContent=uiFormat('bezier.status',count,Math.round(300/view.span*100));inputs.forEach((input,i)=>{if(document.activeElement!==input)input.value=Math.round(p[view.selected*2+i]*1e6)/1e6;input.disabled=!allowed;});if(split){const unlocked=options.canRestructure();split.disabled=extend.disabled=!unlocked||count>=BEZIER_SEGMENTS;remove.disabled=!unlocked||count<=1||view.selected%3!==0;lock.textContent=unlocked?uiFormat('bezier.limit',BEZIER_SEGMENTS):uiText('bezier.topologyLocked');}}
  svg=createCurveEditor(read,{...options,view,onView:sync});host.append(toolbar,svg,fields,actions,lock,hint);sync();return host;
 }
 return panel();
}
