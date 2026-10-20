import {runExportWorker} from './export-job.js';
import {project,node} from './tree-model.js';
import {exportContourSVG} from './contour-svg.js';
const output=document.querySelector('#result'),results=[];
function assert(ok,message){if(!ok)throw Error(message);results.push(message);output.textContent=results.join('\n');}
try{
 const p=project();p.root.children=[node('shape','Circle')];p.output.alpha=true;
 const render=(_p,w,h)=>{const pixels=new Float32Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,r=Math.hypot(x-w/2,y-h/2);pixels[i]=1;pixels[i+3]=r<w*.4&&r>w*.2?1:0;}return pixels;};
 const options={width:64,height:64,threshold:.5,smooth:true},stages=[];
 const expected=await exportContourSVG(p,{...options,render});
 const actual=await runExportWorker('svg',p,options,{render,stage:s=>stages.push(s)});
 assert(actual.svg===expected.svg,'PASS SVG 后台与原算法一致，含孔洞和平滑');
 assert(stages.some(s=>s.includes('简化'))&&stages.some(s=>s.includes('生成 SVG')),'PASS 真实阶段通知');
 for(const kind of ['psd-vector','psd']){const result=await runExportWorker(kind,p,options,{render});assert(new TextDecoder().decode(result.bytes.slice(0,4))==='8BPS','PASS '+kind+' 后台生成');}
 for(const kind of ['png','exr','zip']){const result=await runExportWorker('encode-'+kind,{pixels:render(p,32,32),width:32,height:32,depth:8,zip:true,entries:[{name:'test.txt',data:new Uint8Array([65])}]},{});assert(result.length>20,'PASS '+kind+' 后台编码');}
 const controller=new AbortController();let ticks=0;const timer=setInterval(()=>ticks++,5);let cancelled=false;
 try{await runExportWorker('svg',p,{width:1024,height:1024,threshold:.5,smooth:true},{signal:controller.signal,render,stage:s=>{if(s.includes('简化'))controller.abort();}});}catch(e){cancelled=e.message==='导出已取消';}finally{clearInterval(timer);}
 assert(cancelled&&ticks>0,'PASS 计算中取消且主线程保持响应');
 let failed=false;try{await runExportWorker('svg',p,{...options,threshold:2},{render});}catch(e){failed=e.message.includes('阈值');}assert(failed,'PASS 后台错误回传');
 const retry=await runExportWorker('svg',p,options,{render});assert(retry.svg===expected.svg,'PASS 取消/失败后可再次导出');
 output.textContent+='\n全部通过';
}catch(e){output.textContent+='\nFAIL '+e.stack;}
