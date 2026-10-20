// Execute the actual generated classic bundle, with network reads disabled.
// GPU is mocked; Chrome pixel checks are separate evidence.
import {readFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import assert from "node:assert/strict";
const {Window}=await import(pathToFileURL(process.argv[2]).href);
const html=await readFile(process.argv[3]??new URL("../dist/MomoTextureForge.html",import.meta.url),"utf8");
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);
assert.equal((html.match(/<script\b/g)||[]).length,1);
assert.ok(!/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html));
assert.ok(html.includes("connect-src https: http:"));
const gl=new Proxy({}, {get(_,name){
  if(name==='NO_ERROR')return 0;
  if(name==='MAX_TEXTURE_SIZE')return 3379;
  if(name==='FRAMEBUFFER_COMPLETE')return 36053;
  if(name==='getParameter')return ()=>8192;
  if(name==='getExtension')return ()=>({});
  if(name==='getShaderParameter'||name==='getProgramParameter')return ()=>true;
  if(name==='checkFramebufferStatus')return ()=>36053;
  if(name==='getError')return ()=>0;
  if(String(name).startsWith('create'))return ()=>({});
  if(name==='getUniformLocation')return ()=>null;
  if(String(name)===String(name).toUpperCase())return 1;
  return ()=>{};
}});
function setup(url){
  const window=new Window({url});
  Object.assign(window,{structuredClone,TextEncoder,TextDecoder,CompressionStream,DecompressionStream,Blob,Response});
  window.document.write(html.replace(/<script>[\s\S]*?<\/script>/,''));
  window.fetch=()=>{throw new Error('Network fetch forbidden in standalone');};
  window.HTMLCanvasElement.prototype.getContext=function(kind){return kind==='webgl2'?gl:{drawImage(){},putImageData(){}};};
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  window.IntersectionObserver=class{observe(){}disconnect(){}unobserve(){}};
  window.requestAnimationFrame=()=>0;
  window.URL.createObjectURL=blob=>{window.exports.push(blob);return 'blob:standalone-export';};
  window.URL.revokeObjectURL=()=>{};
  window.exports=[];
  Object.defineProperty(window.navigator,'clipboard',{value:{write(){throw new Error('Clipboard unavailable');}},configurable:true});
  window.eval(script);
  return window;
}
async function ready(window){
  for(let i=0;i<50&&window.document.documentElement.dataset.ready!=='true';i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(window.document.documentElement.dataset.ready,'true',window.document.getElementById('render-status')?.textContent);
}
const editor=setup('file:///C:/Shared/MomoTextureForge.html');await ready(editor);
assert.equal(editor.document.querySelectorAll('#shape-library [data-component^="shape:"]').length,299);
assert.equal(editor.document.querySelectorAll('[role="treeitem"]').length,2);
editor.document.getElementById('save-project').click();await new Promise(r=>setTimeout(r,20));
const project=JSON.parse(await editor.exports[0].text());assert.equal(project.schema,'momo.texture-tree/v1');
const select=editor.document.querySelector('[aria-label="基础图形"]');select.value='BezierRibbon';select.dispatchEvent(new editor.Event('change'));
assert.ok(editor.document.querySelector('[aria-label="贝塞尔控制点编辑器"]'));
const projectInput=editor.document.getElementById('project-file');Object.defineProperty(projectInput,'files',{value:[new editor.File([JSON.stringify(project)],'project.json',{type:'application/json'})],configurable:true});projectInput.dispatchEvent(new editor.Event('change'));await new Promise(r=>setTimeout(r,30));
assert.equal(editor.document.querySelectorAll('[role="treeitem"]').length,2);
assert.equal(editor.document.querySelectorAll('link[rel="stylesheet"]').length,0,'offline editor must not request CSS');
const gallery=setup('file:///C:/Shared/MomoTextureForge.html?view=examples');await ready(gallery);
assert.ok(gallery.document.getElementById('generate'));
assert.equal(gallery.document.querySelector('a').href,'file:///C:/Shared/MomoTextureForge.html');
const validation=setup('file:///C:/Shared/MomoTextureForge.html?view=validate');await ready(validation);
assert.ok(validation.document.getElementById('composite'));
assert.equal(validation.document.querySelector('a').href,'file:///C:/Shared/MomoTextureForge.html');
console.log('Standalone DOM PASS: actual bundle, no network, 299 selectable algorithms, node-tree project export/import, curve editor, no external CSS, examples and validation routing. GPU mocked.');
for(const window of [editor,gallery,validation])await window.happyDOM.abort();
