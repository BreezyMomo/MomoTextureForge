import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bindFormulaParameters} from './web/formula-parameters.js';
import {AUTHORING_LIMIT} from './web/ai-authoring.js';
import {parseCreationAuthoring,assetFromCreationAuthoring} from './web/creation-authoring.js';
const root=dirname(fileURLToPath(import.meta.url));
export function renderOptions(command,args){
 const options={size:512,times:command==='check'?[0,.25,.5,1,2]:[0],output:command==='check'?'previews':'preview.png',timeout:60000};
 const allowed=new Set(command==='check'?['--times','--output','--size','--timeout']:['--time','--output','--size','--timeout']);
 for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!allowed.has(key)||!value||value.startsWith('--'))throw Error('无效选项：'+key);
  if(key==='--time'||key==='--times')options.times=value.split(',').map(v=>v.trim()?Number(v):NaN);else if(key==='--output')options.output=value;else options[key.slice(2)]=Number(value);
 }
 if(!Number.isInteger(options.size)||options.size<16||options.size>2048)throw Error('size 必须为16～2048整数');
 if(!Number.isInteger(options.timeout)||options.timeout<1000||options.timeout>300000)throw Error('timeout 必须为1000～300000毫秒');
 if(!options.times.length||options.times.length>16||options.times.some(t=>!Number.isFinite(t)||t<0)||command==='render'&&options.times.length!==1)throw Error('时间必须为非负有限数，check最多16帧');
 if(command==='render'&&!options.output.toLowerCase().endsWith('.png'))throw Error('render 输出必须为.png');return options;
}
export async function renderFile(command,file,args){
 const options=renderOptions(command,args),output=resolve(options.output),reportPath=command==='check'?resolve(output,'report.json'):output.replace(/\.png$/i,'.report.json');
 await mkdir(dirname(reportPath),{recursive:true});
 const report={schema:'momo.graphic-render-report/v1',ok:false,input:resolve(file),size:options.size,times:options.times,renderer:'TreeRenderer/WebGL2/Chromium',visual:'not-reviewed',frames:[]};
 let server,browser,timer;
 try{
  const bytes=await readFile(file);if(bytes.length>AUTHORING_LIMIT)throw Error('创作文件超过2MB');const draft=parseCreationAuthoring(bytes.toString('utf8'));report.unusedParameters=draft.formula?bindFormulaParameters(draft.formula.source,assetFromCreationAuthoring(draft).definition.parameters,draft.formula.kind).unused:[];
  const {chromium}=await import('playwright');
  server=createServer(async(req,res)=>{try{
   const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+decodeURIComponent(url.pathname));
   if(!path.startsWith(resolve(root,'web')+sep)||!['.js','.html','.json','.glsl'].includes(extname(path))){res.writeHead(404).end();return;}
   const bytes=await readFile(path);res.setHeader('Content-Type',extname(path)==='.js'?'text/javascript':extname(path)==='.html'?'text/html':extname(path)==='.json'?'application/json':'text/plain');res.end(bytes);
  }catch{res.writeHead(404).end();}});
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
  browser=await chromium.launch({headless:true,timeout:options.timeout});
  const page=await browser.newPage();page.setDefaultTimeout(options.timeout);
  const run=async()=>{await page.goto('http://127.0.0.1:'+server.address().port+'/web/authoring-render.html');await page.waitForFunction(()=>typeof window.renderAuthoring==='function');return page.evaluate(options=>window.renderAuthoring(options),{draft,size:options.size,times:options.times});};
  const pageError=new Promise((_,reject)=>page.once('pageerror',reject));
  const result=await Promise.race([run(),pageError,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('渲染超时')),options.timeout);})]);
  if(!result.ok)throw Error(result.error);
  for(const [i,frame]of result.frames.entries()){
   const path=command==='check'?resolve(output,`frame-${String(i).padStart(2,'0')}.png`):output;
   await writeFile(path,Buffer.from(frame.png.split(',')[1],'base64'));report.frames.push({time:frame.time,path});
  }if(command==='check'){report.sheet=resolve(output,'contact-sheet.png');await writeFile(report.sheet,Buffer.from(result.sheet.split(',')[1],'base64'));}report.ok=true;
 }catch(e){report.error=e.message;}finally{clearTimeout(timer);if(browser)await browser.close();if(server)await new Promise(r=>{server.close(r);server.closeAllConnections();});}
 await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,reportPath},null,2));if(!report.ok)process.exitCode=1;return report;
}
