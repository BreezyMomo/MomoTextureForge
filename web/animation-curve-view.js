import {uiText} from './ui-language.js';
import {keyValue,animationType} from './tree-model.js';
import {timeKey} from './animation-values.js';
import {editKeys,roundTime} from './animation-editing.js';
// Curves always use the owner's local normalized time, independent of parent loops.
export function animationCurveView(host,{node,path,selectedTime,onSelect,change,begin,preview,end,cancel,getRoot,notify}){
 const track=node.tracks[path];if(!track)return;
 const note=document.createElement('p');note.className='tree-note';note.textContent=uiText("ui.parameterCurveLocalTimeDragCirclesToChangeTimeValueSelect");host.append(note);
 if(animationType(node,path)!=='number'){note.textContent=uiText("ui.editColorsAndSwitchOptionValuesInTheKeyframeControlsBelow");return;}
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 800 220');svg.setAttribute('aria-label',uiText("ui.parameterCurve"));svg.classList.add('animation-curve');host.append(svg);
 const values=track.keys.map(k=>k[1]);for(let i=0;i<=100;i++)values.push(keyValue(track,i/100));
 let lo=Math.min(...values),hi=Math.max(...values),span=hi-lo||Math.max(1,Math.abs(lo)*.2);lo-=span*.15;hi+=span*.15;span=hi-lo;
 const x=t=>30+t*740,y=v=>195-(v-lo)/span*175,point=e=>{const r=svg.getBoundingClientRect();return [(e.clientX-r.left)*800/Math.max(1,r.width),(e.clientY-r.top)*220/Math.max(1,r.height)];};
 const value=e=>{const [px,py]=point(e);return [roundTime((px-30)/740),lo+(195-py)/175*span];};
 const add=(tag,attrs,text='')=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));e.textContent=text;svg.append(e);return e;};
 for(let i=0;i<=5;i++){const yy=20+i*35;add('line',{x1:30,y1:yy,x2:770,y2:yy,stroke:'#344151'});add('text',{x:32,y:yy-3,fill:'#9caebe','font-size':10},(hi-i*span/5).toFixed(2));}
 for(let i=0;i<=10;i++){add('line',{x1:x(i/10),y1:20,x2:x(i/10),y2:195,stroke:'#293543'});add('text',{x:x(i/10),y:214,fill:'#9caebe','font-size':10},String(i/10));}
 const line=add('path',{fill:'none',stroke:'#8cdef1','stroke-width':2});const plot=()=>line.setAttribute('d',Array.from({length:241},(_,i)=>(i?'L':'M')+x(i/240)+','+y(keyValue(node.tracks[path],i/240))).join(' '));plot();
 const drag=(handle,update)=>{handle.onpointerdown=e=>{e.stopPropagation();handle.setPointerCapture?.(e.pointerId);begin();let valid=true;handle.onpointermove=e=>{try{update(e);plot();valid=true;}catch(error){valid=false;notify(error.message);}};handle.onpointerup=e=>{handle.releasePointerCapture?.(e.pointerId);handle.onpointermove=null;handle.onpointerup=null;valid?end():cancel();};handle.onpointercancel=()=>{handle.onpointermove=null;cancel();};};};
 track.keys.forEach(([t,v],i)=>{const c=add('circle',{cx:x(t),cy:y(v),r:5,fill:Math.abs(t-selectedTime)<1e-6?'#ffca75':'#8cdef1',tabindex:0,'aria-label':(uiText("ui.curveKeyframe") + t)});c.onclick=()=>onSelect(t);let current=t;
 drag(c,e=>{const [nt,nv]=value(e);preview(()=>{editKeys(getRoot(),[{id:node.id,path,from:current,to:nt,value:nv}]);current=nt;});c.setAttribute('cx',x(nt));c.setAttribute('cy',y(nv));onSelect(nt,false);});const down=c.onpointerdown;c.onpointerdown=e=>{onSelect(t,false);down(e);};
 if(Math.abs(t-selectedTime)>1e-6||i===track.keys.length-1)return;
 const b=track.keys[i+1],dt=(b[0]-t)/3;if(dt<=0)return;const seg=track.segments?.[timeKey(t)]??{},slope=(b[1]-v)/(b[0]-t);
 for(const kind of ['out','in']){const anchor=kind==='out'?[t,v]:b,direction=kind==='out'?1:-1,xx=anchor[0]+dt*direction,vv=anchor[1]+(seg[kind]??slope)*dt*direction;
 const guide=add('line',{x1:x(anchor[0]),y1:y(anchor[1]),x2:x(xx),y2:y(vv),stroke:'#d7ae72','stroke-dasharray':'3 3'}),h=add('rect',{x:x(xx)-4,y:y(vv)-4,width:8,height:8,fill:'#d7ae72',tabindex:0,'aria-label':(kind==='out' ? uiText("ui.outgoingTangent") : uiText("ui.incomingTangent"))});
 drag(h,e=>{const [px,py]=point(e),vx=lo+(195-py)/175*span,s=Math.max(-1e6,Math.min(1e6,(vx-anchor[1])/(dt*direction)));preview(()=>{track.segments??={};track.segments[timeKey(t)]={...track.segments[timeKey(t)],ease:'cubic',[kind]:s};});h.setAttribute('y',py-4);guide.setAttribute('y2',py);});
 }
 });
 svg.ondblclick=e=>{if(e.target.tagName==='circle'||e.target.tagName==='rect')return;const [t,v]=value(e);change(()=>editKeys(getRoot(),[{id:node.id,path,to:t,value:v}]));onSelect(t);};
}
