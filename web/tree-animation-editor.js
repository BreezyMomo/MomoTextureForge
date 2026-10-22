import {uiText} from './ui-language.js';
import {keyValue,pathGet} from './tree-model.js';
export function moveAnimationKey(track,index,time,value=track.keys[index]?.[1]){
 if(!track.keys[index]||!Number.isFinite(time)||!Number.isFinite(value))return;
 time=Math.round(Math.max(0,Math.min(1,time))*1000)/1000;
 track.keys=track.keys.filter((k,i)=>i!==index&&Math.abs(k[0]-time)>.0001);
 track.keys.push([time,value]);track.keys.sort((a,b)=>a[0]-b[0]);return time;
}
export function createAnimationEditor(host,{getNode,getProgress,seek,change,label,returnWork,isLocal}){
 let signature='',selection=null,dragging=false;
 const el=(tag,attrs={},text='')=>{const e=document.createElement(tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);e.textContent=text;return e;};
 const button=(text,title,fn)=>{const b=el('button',{'aria-label':title,title},text);b.onclick=fn;return b;};
 const selectedKey=()=>{const n=getNode(),t=n.tracks[selection?.path];return t?{n,t,index:t.keys.findIndex(k=>Math.abs(k[0]-selection.time)<.0001)}:null;};
 const remove=()=>{const s=selectedKey();if(!s||s.index<0)return;change(()=>{s.t.keys.splice(s.index,1);if(!s.t.keys.length)delete s.n.tracks[selection.path];});selection=null;update(true);};
 function update(force=false){
  const n=getNode(),tracks=Object.entries(n.tracks),sig=JSON.stringify([n.id,n.name,n.tracks,selection,isLocal()]);
  if(!dragging&&(force||signature!==sig)){
   signature=sig;host.replaceChildren();host.className='animation-dopesheet';
   const toolbar=el('div',{class:'animation-tools'});toolbar.append(el('strong',{},'节点动画 · '+n.name),el('span',{},isLocal()?'局部预览（不写入项目）':'跟随画布播放'));
   const cursor=el('input',{type:'number',min:0,max:1,step:.001,'aria-label':uiText("animation.nodeAnimationProgress")});cursor.value=getProgress();cursor.onchange=()=>seek(Math.max(0,Math.min(1,+cursor.value||0)));toolbar.append(cursor,button(uiText("timeline.returnToCanvasTime"),'返回画布时间',returnWork));host.append(toolbar);
   const grid=el('div',{class:'animation-tracks'});host.append(grid);
   function row(title,keys,path=null){
    const r=el('div',{class:'animation-track'}),name=el('div',{class:'animation-track-name'},title),lane=el('div',{class:'animation-lane','aria-label':(title + uiText("animation.tracks"))});r.append(name,lane);grid.append(r);
    if(path)name.append(button('＋','在当前进度添加 '+title,()=>{change(()=>{const track=n.tracks[path],t=Math.round(getProgress()*1000)/1000,v=keyValue(track,t)??pathGet(n,path);track.keys=track.keys.filter(k=>Math.abs(k[0]-t)>.0001);track.keys.push([t,v]);track.keys.sort((a,b)=>a[0]-b[0]);selection={path,time:t};});}));
    const head=el('div',{class:'animation-playhead'});lane.append(head);
    if(path===null)for(let i=0;i<=10;i++){const tick=el('span',{class:'animation-tick'},(i/10).toFixed(1));tick.style.left=(i*10)+'%';lane.append(tick);}
    const at=e=>Math.max(0,Math.min(1,(e.clientX-lane.getBoundingClientRect().left)/Math.max(1,lane.getBoundingClientRect().width)));
    lane.onpointerdown=e=>{if(e.target!==lane)return;dragging=true;lane.setPointerCapture(e.pointerId);seek(at(e));};lane.onpointermove=e=>{if(lane.hasPointerCapture?.(e.pointerId))seek(at(e));};lane.onpointerup=e=>{dragging=false;if(lane.hasPointerCapture?.(e.pointerId))lane.releasePointerCapture(e.pointerId);update(true);};lane.onpointercancel=()=>{dragging=false;update(true);};
    keys.forEach((key,index)=>{const t=key[0],k=button('◆',title+' 关键帧 '+t.toFixed(3)+(path?' 值 '+key[1]:''),()=>{if(path)selection={path,time:t};seek(t);update(true);});k.className='animation-key';k.style.left=(t*100)+'%';k.setAttribute('aria-pressed',String(!!path&&selection?.path===path&&selection.time===t));lane.append(k);
     if(!path)return;
     k.onpointerdown=e=>{e.stopPropagation();dragging=true;let moved=false,target=t;const x=e.clientX;k.setPointerCapture(e.pointerId);k.onpointermove=e=>{if(Math.abs(e.clientX-x)>3)moved=true;if(moved){target=Math.round(at(e)*1000)/1000;k.style.left=(target*100)+'%';}};
      const finish=e=>{k.onpointermove=null;k.onpointerup=null;k.onpointercancel=null;dragging=false;if(k.hasPointerCapture?.(e.pointerId))k.releasePointerCapture(e.pointerId);if(moved){k.onclick=null;change(()=>{moveAnimationKey(n.tracks[path],index,target);selection={path,time:target};});seek(target);}else{selection={path,time:t};seek(t);}update(true);};k.onpointerup=finish;k.onpointercancel=()=>{dragging=false;update(true);};};
    });
   }
   row(uiText("animation.allParameters"),[...new Set(tracks.flatMap(([,t])=>t.keys.map(k=>k[0])))].sort((a,b)=>a-b).map(t=>[t,0]));
   for(const [path,t]of tracks)row(label(path),t.keys,path);
   if(!tracks.length)host.append(el('p',{class:'tree-note'},'在右侧参数旁点击 ◇ 添加关键帧，参数会显示为独立轨道。'));
   const s=selectedKey();if(s&&s.index>=0){const panel=el('div',{class:'animation-tools'});panel.append(el('span',{},label(selection.path)));
    for(const [j,title]of [[0,"timeline.keyframeTime"],[1,"timeline.keyframeValue"]]){const input=el('input',{type:'number',step:.001,'aria-label':uiText(title),title:uiText(title)});if(j===0){input.min=0;input.max=1;}input.value=s.t.keys[s.index][j];input.onchange=()=>{const value=+input.value;if(!Number.isFinite(value))return;change(()=>{const key=s.t.keys[s.index],t=moveAnimationKey(s.t,s.index,j===0?value:key[0],j===1?value:key[1]);selection.time=t;});};panel.append(input);}
    for(const [field,title,options]of [['ease',"animation.trackInterpolation",[['linear',"editor.linear"],['smooth',"editor.smooth"],['hold',"editor.hold"]]],['mode',"timeline.trackOperation",[['absolute',"timeline.absolute"],['add',"timeline.addToBaseValue"],['multiply',"timeline.multiplyBaseValue"]]]]){const select=el('select',{'aria-label':uiText(title)});for(const [v,text]of options)select.append(el('option',{value:v},text));select.value=s.t[field];select.onchange=()=>change(()=>s.t[field]=select.value);panel.append(select);}
    panel.append(button(uiText("timeline.deleteKeyframe"),'删除选中关键帧',remove));host.append(panel);
   }
   host.onkeydown=e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}};
  }
  host.querySelectorAll('.animation-playhead').forEach(e=>e.style.left=(getProgress()*100)+'%');const cursor=host.querySelector('[aria-label="节点动画进度"]');if(cursor&&document.activeElement!==cursor)cursor.value=getProgress().toFixed(3);
 }
 return {update,reset(){selection=null;signature='';}};
}
