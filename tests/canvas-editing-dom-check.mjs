import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const {Window}=await import(pathToFileURL(process.argv[2]).href);const win=new Window({url:'http://127.0.0.1:8806/'}),queue=[];
Object.assign(globalThis,{window:win,location:win.location,document:win.document,localStorage:win.localStorage,requestAnimationFrame:f=>queue.push(f)});
const gl=new Proxy({},{get:(_,key)=>key==='getExtension'?()=>({}):key==='getParameter'?()=>8192:()=>{}});
win.HTMLCanvasElement.prototype.getContext=kind=>kind==='webgl2'?gl:{clearRect(){},drawImage(){}};
const {TreeRenderer}=await import('../web/tree-renderer.js');let latest;
TreeRenderer.prototype.draw=function(p,w,h,{read}={}){this.canvas.width=w;this.canvas.height=h;this.lastMs=1;if(read)return new Float32Array(w*h*4).fill(1);latest=p;};
await import('../web/tree-app.js');const flush=()=>{for(const f of queue.splice(0))f(0);},$=id=>document.getElementById(id);flush();
const surface=$('tree-preview-surface');surface.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:1000});surface.setPointerCapture=()=>{};surface.hasPointerCapture=()=>false;
const click=(e,extra={})=>{e.dispatchEvent(new win.MouseEvent('click',{bubbles:true,...extra}));flush();},pointer=(target,type,x,y,extra={})=>{target.dispatchEvent(new win.PointerEvent(type,{bubbles:true,cancelable:true,pointerId:1,button:0,clientX:x,clientY:y,...extra}));flush();};
const names=()=>[...$('node-tree').querySelectorAll('button[aria-label^="选择 "]')],saved=()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1'));
click($('new-project'));click(names()[0]);click($('duplicate'));click(names()[0]);click(names()[1],{ctrlKey:true});assert.equal(document.querySelectorAll('#node-tree [aria-selected=true]').length,2);
click($('canvas-snap'));const ids=latest.root.children.map(n=>n.id);pointer($('tree-canvas'),'pointerdown',500,500);pointer(surface,'pointermove',570,460);pointer(surface,'pointerup',570,460);assert.deepEqual(saved().root.children.map(n=>[n.transform.x,n.transform.y]),[[.57,.54],[.57,.54]]);
click($('undo'));assert.deepEqual(latest.root.children.map(n=>n.transform.x),[.5,.5]);click($('redo'));assert.equal(latest.root.children[0].transform.x,.57);
pointer($('tree-canvas'),'pointerdown',570,460);pointer(surface,'pointermove',600,460);document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));flush();assert.equal(latest.root.children[0].transform.x,.57);
click($('group-selected'));assert.equal(latest.root.children.length,1);assert.deepEqual(latest.root.children[0].children.map(n=>n.id),ids);click($('undo'));assert.equal(latest.root.children.length,2);
click(names()[0]);click($('canvas-pivot'));const handle=document.querySelector('[data-action=pivot]');pointer(handle,'pointerdown',570,460);pointer(surface,'pointermove',650,400);pointer(surface,'pointerup',650,400);const t=saved().root.children[0].transform;assert.ok(Math.abs((t.x-t.pivotX)-.07)<1e-8);assert.ok(Math.abs((t.y-t.pivotY)-.04)<1e-8);
click($('canvas-transform'));const before=structuredClone(latest.root.children[0].transform),corner=document.querySelector('[data-action=resize][data-handle="4"]');pointer(corner,'pointerdown',1070,-40);pointer(surface,'pointermove',870,160);pointer(surface,'pointerup',870,160);assert.ok(Math.abs(saved().root.children[0].transform.width-.8)<1e-8);click($('undo'));assert.deepEqual(latest.root.children[0].transform,before);
// Batch failure is atomic, even if an earlier node has no track.
click(names()[0]);[...$('inspector-tabs').querySelectorAll('button')].find(b=>b.textContent==='变换/排列').click();document.querySelector('[aria-label="位置 X关键帧"]').click();flush();const beforeLocked=JSON.stringify(saved());click(names()[1],{ctrlKey:true});pointer($('tree-canvas'),'pointerdown',600,450);pointer(surface,'pointermove',620,450);pointer(surface,'pointerup',620,450);assert.equal(JSON.stringify(saved()),beforeLocked);assert.match($('tree-toast').textContent,/动画控制/);
// Record modifies keys, not the underlying transforms, and one undo removes the gesture.
const record=[...$('inspector').querySelectorAll('button')].find(b=>b.textContent==='● 录制');click(record);const base=latest.root.children.map(n=>n.transform.x);pointer($('tree-canvas'),'pointerdown',600,450);pointer(surface,'pointermove',640,450);pointer(surface,'pointerup',640,450);assert.deepEqual(saved().root.children.map(n=>n.transform.x),base);assert.ok(saved().root.children.every(n=>n.tracks['transform.x']));click($('undo'));assert.equal(JSON.stringify(saved()),beforeLocked);
// Trial selection belongs to its own session.
document.querySelector('[aria-label="查看 脉冲环"]').click();flush();assert.equal(document.querySelectorAll('#node-tree [aria-selected=true]').length,1);click($('return-work'));
console.log('Canvas DOM PASS: multi-selection, move/undo/redo/cancel, group, pivot, resize, atomic animation guard, recording, trial selection. Renderer mocked.');
