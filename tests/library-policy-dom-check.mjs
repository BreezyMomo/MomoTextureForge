import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const {Window}=await import(pathToFileURL(process.argv[2]).href),win=new Window({url:'http://127.0.0.1:8806/'}),queue=[];
Object.assign(globalThis,{window:win,location:win.location,document:win.document,localStorage:win.localStorage,requestAnimationFrame:f=>queue.push(f)});
const gl=new Proxy({},{get:(_,key)=>key==='getExtension'?()=>({}):key==='getParameter'?()=>8192:()=>{}});
win.HTMLCanvasElement.prototype.getContext=kind=>kind==='webgl2'?gl:{clearRect(){},drawImage(){}};
const {TreeRenderer}=await import('../web/tree-renderer.js');let current,lastDraw;TreeRenderer.prototype.draw=function(p,w,h,options){current=p;lastDraw=options;this.canvas.width=w;this.canvas.height=h;this.lastMs=1;};
const {project,node}=await import('../web/tree-model.js'),p=project();p.root.children=[node('shape','Water')];localStorage.setItem('momo-texture-tree:draft:v1',JSON.stringify(p));
await import('../web/tree-app.js');const flush=()=>{for(const f of queue.splice(0))f(0);},$=id=>document.getElementById(id);flush();
assert.equal(document.querySelectorAll('[data-component^="shape:"]').length,298);
assert.equal(document.querySelectorAll('[data-component^="preset:"]').length,0);
document.querySelector('[aria-label="选择 水波"]').click();flush();assert.equal(document.querySelector('[aria-label="基础图形"]').value,'Water');assert.equal(current.root.children[0].type,'Water');
const search=value=>{$('shape-search').value=value;$('shape-search').dispatchEvent(new win.Event('input'));};search('水波');assert.ok(document.querySelector('[data-component="shape:Water"]'));assert.equal(document.querySelector('[data-component="shape:Flipbook"]'),null);
search('蜂巢网格');assert.ok(document.querySelector('[data-component="shape:HexGrid"]'));[...document.querySelectorAll('button')].find(b=>b.textContent==='试编辑：蜂巢网格预设').click();flush();assert.equal(current.root.children[0].type,'HexGrid');assert.deepEqual(current.root.children[0].params,(await import('../web/library-policy.js')).libraryVariantNode('honeycomb').params);
$('preview-add').click();flush();assert.equal(current.root.children[0].type,'Water');assert.equal(current.root.children[1].type,'HexGrid');assert.equal([...document.querySelector('[aria-label="基础图形"]').options].some(x=>x.value==='Flipbook'),false);
console.log('Library cleanup DOM PASS: 298 entries, current type editable, alias search, canonical preset preview/add, picker filtering. GPU mocked.');

const picker=document.querySelector('[aria-label="基础图形"]');picker.value='Gear';picker.dispatchEvent(new win.Event('change'));flush();
const gearMode=document.querySelector('[aria-label="齿形模式"]');assert.ok(gearMode);gearMode.value='1';gearMode.dispatchEvent(new win.Event('change'));flush();
assert.ok(document.querySelector('[data-animation-path="params.9"]'));assert.equal(document.querySelector('[data-animation-path="params.5"]'),null);
[...document.querySelectorAll('#inspector-tabs button')].find(b=>b.textContent==='合成').click();flush();
const contour=document.querySelector('[aria-label="轮廓方式"]');assert.ok(contour);contour.value='outline';contour.dispatchEvent(new win.Event('change'));flush();
assert.ok(document.querySelector('[data-animation-path="contour.radius"]'));assert.ok(current.root.children.some(n=>n.contour.mode==='outline'));
console.log('Curated mode selectors and contour inspector PASS.');

[...document.querySelectorAll('#inspector-tabs button')].find(b=>b.textContent==='图形').click();flush();
const clockPicker=document.querySelector('[aria-label="基础图形"]');clockPicker.value='Spiral';clockPicker.dispatchEvent(new win.Event('change'));flush();
const followClock=document.querySelector('[aria-label="自动播放"]');assert.ok(followClock.checked);assert.equal(document.querySelector('[data-animation-path="shapeClock.value"]'),null);
followClock.checked=false;followClock.dispatchEvent(new win.Event('change'));flush();assert.ok(document.querySelector('[data-animation-path="shapeClock.value"]'));assert.ok(document.querySelector('[aria-label="图形时间（秒）关键帧"]'));
console.log('Intrinsic shape clock inspector PASS.');

const animationPanel=$('animation-panel');animationPanel.open=false;
assert.equal($('play').closest('details'),null);assert.equal($('tree-time').closest('details'),null);assert.equal($('play-duration').closest('details'),null);
$('play').click();assert.equal($('play').textContent,'暂停');assert.equal(animationPanel.open,false);
animationPanel.open=true;animationPanel.open=false;animationPanel.dispatchEvent(new win.Event('toggle'));assert.equal($('play').textContent,'暂停');
$('play').click();assert.equal($('play').textContent,'播放');
document.dispatchEvent(new win.KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true}));assert.equal($('play').textContent,'暂停');assert.equal(animationPanel.open,false);$('play').click();
console.log('Always-visible playback and collapse/Space independence PASS.');

search('');$('play').click();assert.equal($('play').textContent,'暂停');
const browseShape=id=>{document.querySelector(`[data-component="shape:${id}"] .component-inspect`).click();flush();assert.equal(current.root.children[0].type,id);};
browseShape('Spiral');assert.equal($('play').textContent,'暂停');
browseShape('Fluid');assert.equal($('play').textContent,'暂停');
browseShape('Spiral');assert.equal($('play').textContent,'暂停');
for(const frame of queue.splice(0))frame(1000);for(const frame of queue.splice(0))frame(1100);const playbackTime=$('time-value').textContent;
for(const frame of queue.splice(0))frame(1200);for(const frame of queue.splice(0))frame(1300);assert.notEqual($('time-value').textContent,playbackTime);
$('return-work').click();flush();assert.equal($('play').textContent,'暂停');
const playingPicker=document.querySelector('[aria-label="基础图形"]');playingPicker.value='Water';playingPicker.dispatchEvent(new win.Event('change'));flush();assert.equal($('play').textContent,'暂停');
browseShape('Spiral');$('preview-add').click();flush();assert.equal($('play').textContent,'暂停');
$('play').click();browseShape('Fluid');assert.equal($('play').textContent,'播放');$('return-work').click();flush();assert.equal($('play').textContent,'播放');
console.log('Playback continuity across preview/type switches, return/add and paused browsing PASS.');

$('tree-time').value='.5';$('tree-time').dispatchEvent(new win.Event('input'));flush();assert.equal(lastDraw.formulaSeconds,.5*current.output.seconds);
const frozenSeconds=lastDraw.formulaSeconds;flush();assert.equal(lastDraw.formulaSeconds,frozenSeconds);
$('restart-play').click();assert.equal($('play').textContent,'暂停');flush();assert.equal(lastDraw.formulaSeconds,0);
for(const frame of queue.splice(0))frame(10000);for(const frame of queue.splice(0))frame(10100);assert.ok(lastDraw.formulaSeconds>current.output.seconds);assert.ok(lastDraw.time<1);
$('play').click();flush();const seconds=lastDraw.formulaSeconds;browseShape('Spiral');assert.equal(lastDraw.formulaSeconds,seconds);
console.log('Continuous seconds, deterministic seek, restart, loop and browsing PASS.');

search('');$('library-filter').value='dynamic';$('library-filter').dispatchEvent(new win.Event('change'));flush();
const dynamicIds=[...document.querySelectorAll('[data-component^="shape:"]')].map(c=>c.dataset.component.slice(6));
const {CATALOG}=await import('../web/catalog.js');assert.equal(dynamicIds.length,CATALOG.filter(p=>p.usesTime).length);assert.ok(dynamicIds.every(id=>CATALOG.find(p=>p.id===id).usesTime));
assert.ok(dynamicIds.includes('Spiral'));assert.ok(!dynamicIds.includes('DissolveNoise'));assert.ok(!dynamicIds.includes('ErosionMask'));
search('水波');assert.ok(document.querySelector('[data-component="shape:Water"]'));assert.ok(document.querySelectorAll('[data-component^="shape:"]').length<dynamicIds.length);
console.log('Dynamic library filter and combined search PASS.');
