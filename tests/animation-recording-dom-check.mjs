import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {Window}=await import(pathToFileURL(process.argv[2]).href),win=new Window({url:'http://127.0.0.1:8806/'}),queue=[];
Object.assign(globalThis,{window:win,location:win.location,document:win.document,localStorage:win.localStorage,requestAnimationFrame:f=>queue.push(f)});
const gl=new Proxy({},{get:(_,key)=>key==='getExtension'?()=>({}):key==='getParameter'?()=>8192:()=>{}});
win.HTMLCanvasElement.prototype.getContext=kind=>kind==='webgl2'?gl:{clearRect(){},drawImage(){}};
const {TreeRenderer}=await import('../web/tree-renderer.js');let rendered;
TreeRenderer.prototype.draw=function(p,w,h){rendered=structuredClone(p);this.canvas.width=w;this.canvas.height=h;this.lastMs=1;};
await import('../web/tree-app.js');const flush=(now=0)=>{for(let i=0;i<4&&queue.length;i++)for(const f of queue.splice(0))f(now);};flush();
const by=(name)=>document.querySelector(`input[aria-label="${name}"],select[aria-label="${name}"]`)??document.querySelector(`[aria-label="${name}"]`),button=(text,scope=document)=>[...scope.querySelectorAll('button')].find(b=>b.textContent===text),change=(name,value)=>{const e=by(name);assert.ok(e,name);e.value=value;e.dispatchEvent(new win.Event('change'));flush();},click=(name)=>{assert.ok(by(name),name);by(name).click();flush();};
const stored=()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')),work=()=>document.getElementById('node-animation-editor');
assert.equal(document.getElementById('play-speed'),null);change('播放时长（秒）',5);assert.equal(stored().output.seconds,5);assert.equal(stored().output.frames,150);button('播放').click();flush(1000);assert.equal(+document.getElementById('tree-time').value,.2);button('暂停').click();flush(1000);document.getElementById('undo').click();flush();assert.equal(+by('播放时长（秒）').value,3);change('当前范围进度',0);
button('变换/排列').click();assert.equal(by('参数模式 普通'),null);assert.equal(button('普通编辑',work()),undefined);
const assertRecording=value=>{assert.equal(by('参数模式 ● 录制').getAttribute('aria-pressed'),String(value));assert.equal(button('● 录制',work()).getAttribute('aria-pressed'),String(value));};
assertRecording(false);button('● 录制',work()).click();flush();assertRecording(true);click('参数模式 基础值');assertRecording(false);assert.equal(by('参数模式 基础值').getAttribute('aria-pressed'),'true');click('参数模式 ● 录制');assertRecording(true);assert.equal(by('参数模式 基础值').getAttribute('aria-pressed'),'false');button('● 录制',work()).click();flush();assertRecording(false);click('参数模式 ● 录制');
change('区域宽',.3);change('当前范围进度',.5);
const slider=by('区域宽滑动条');slider.value='.65';slider.dispatchEvent(new win.Event('input'));flush();slider.value='.8';slider.dispatchEvent(new win.Event('input'));flush();assert.equal(stored().root.children[0].tracks['transform.width'].keys.length,1);slider.dispatchEvent(new win.Event('change'));flush();
assert.deepEqual(stored().root.children[0].tracks['transform.width'].keys,[[0,.3],[.5,.8]]);document.getElementById('undo').click();flush();assert.deepEqual(stored().root.children[0].tracks['transform.width'].keys,[[0,.3]]);document.getElementById('redo').click();flush();
change('当前范围进度',1);change('区域宽',.3);click('参数模式 ● 录制');assert.equal(by('区域宽').disabled,true);change('当前范围进度',.25);assert.equal(+by('区域宽').value,.55);
click('参数模式 基础值');change('区域宽',.9);assert.equal(rendered.root.children[0].animationEnabled,false);assert.equal(stored().root.children[0].animationEnabled,true);assert.equal(stored().root.children[0].transform.width,.9);click('参数模式 基础值');assert.equal(+by('区域宽').value,.55);
// A tree selection never changes the current timeline scope; entering is explicit.
button('进入选中节点',work()).click();flush();const scopeName=work().querySelector('.animation-tools').textContent;document.getElementById('add-group').click();flush();assert.equal(work().querySelector('.animation-tools').textContent,scopeName);click('选择 圆形');
// Multi-selection, copied offsets, deletion, and atomic collision rejection.
const key=t=>[...work().querySelectorAll('.animation-key')].find(k=>+k.dataset.time===t&&k.dataset.path==='transform.width');key(0).click();flush();key(.5).dispatchEvent(new win.MouseEvent('click',{shiftKey:true}));flush();assert.equal(work().querySelectorAll('.animation-key[aria-pressed=true]').length,2);
work().dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowRight'}));flush();assert.deepEqual(stored().root.children[0].tracks['transform.width'].keys.map(k=>k[0]),[.01,.51,1]);
button('复制',work()).click();flush();change('当前范围进度',.2);button('粘贴',work()).click();flush();assert.deepEqual(stored().root.children[0].tracks['transform.width'].keys.map(k=>k[0]),[.01,.2,.51,.7,1]);
button('删除关键帧',work()).click();flush();assert.deepEqual(stored().root.children[0].tracks['transform.width'].keys.map(k=>k[0]),[.01,.51,1]);
change('当前范围进度',.01);const before=localStorage.getItem('momo-texture-tree:draft:v1');button('粘贴',work()).click();flush();assert.equal(localStorage.getItem('momo-texture-tree:draft:v1'),before);assert.ok(document.getElementById('tree-toast').textContent.includes('已有关键帧'));
// Cubic segments and direct tangent dragging participate in the same undo system.
key(.01).click();flush();change('分段插值','cubic');button('曲线',work()).click();flush();assert.ok(by('参数曲线'));const tangent=by('出切线');assert.ok(tangent);const svg=by('参数曲线');svg.getBoundingClientRect=()=>({left:0,top:0,width:800,height:220});tangent.setPointerCapture=()=>{};tangent.releasePointerCapture=()=>{};
tangent.onpointerdown({pointerId:1,stopPropagation(){}});tangent.onpointermove({clientX:100,clientY:30});tangent.onpointerup({pointerId:1});flush();assert.ok(Number.isFinite(stored().root.children[0].tracks['transform.width'].segments['0.01'].out));
// Typed recording, disabling the visual node, and templates.
button('合成').click();flush();change('配色','own');click('参数模式 ● 录制');change('当前范围进度',0);const c=by('亮部');assert.ok(c);c.value='#ff0000';c.dispatchEvent(new win.Event('input'));c.dispatchEvent(new win.Event('change'));flush();change('当前范围进度',1);const c2=by('亮部');c2.value='#0000ff';c2.dispatchEvent(new win.Event('input'));c2.dispatchEvent(new win.Event('change'));flush();assert.deepEqual(stored().root.children[0].tracks['color.high'].keys,[[0,'#ff0000'],[1,'#0000ff']]);
change('混合方式','inverseMask');assert.equal(stored().root.children[0].tracks.blend.type,'discrete');
window.confirm=()=>true;change('动画模板','fade');button('应用模板',work()).click();flush();assert.equal(stored().root.children[0].tracks.opacity.keys.length,4);
document.getElementById('save-selected-component').click();flush();const preset=JSON.parse(localStorage.getItem('momo-texture-tree:presets:v1')).at(-1);assert.deepEqual(preset.root.tracks,stored().root.children[0].tracks);assert.equal(preset.root.timing.frozen,false);
// Reset buttons follow recording mode and never silently overwrite base UV values.
button('图形').click();flush();change('当前范围进度',.5);change('UV偏移X',.4);button('复位 UV').click();flush();assert.equal(stored().root.children[0].uv[2],0);assert.equal(stored().root.children[0].tracks['uv.2'].keys.find(k=>k[0]===.5)[1],0);document.getElementById('undo').click();flush();assert.equal(stored().root.children[0].tracks['uv.2'].keys.find(k=>k[0]===.5)[1],.4);
console.log('Animation recording DOM PASS: slider single-undo, evaluated values, base bypass, stable scope, multi-key move/copy/paste/collision/delete, cubic tangent, color/enum recording, templates and component persistence. Renderer mocked.');win.happyDOM.abort();
