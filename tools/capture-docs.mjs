import {mkdir,writeFile,readFile,mkdtemp} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {main as buildLibrary} from '../build-remote-library.mjs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {chromium} from 'playwright';
import {project,node,walk} from '../web/tree-model.js';
import {treeSamples} from '../web/tree-samples.js';
import {markScreenshot,syncScreenshotCaptions} from './docs-annotations.mjs';
import {GENERATOR_EXAMPLE} from '../web/generator-authoring.js';

// Capture real application UI in a disposable browser profile, never the user's draft.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),port=Number(process.env.DOCS_PORT??8823),url='http://127.0.0.1:'+port+'/';
const output=resolve(root,'docs/images');await mkdir(output,{recursive:true});await mkdir(resolve(root,'docs/examples'),{recursive:true});
const only=new Set(process.argv.slice(2));
const server=spawn(process.execPath,['serve.mjs','--port',String(port)],{cwd:root,stdio:'ignore',windowsHide:true});
let browser;
const cleanIds=p=>{let i=0;walk(p.root,n=>n.id='docs-node-'+(++i));return p;};
const spell=project();spell.name='召唤法阵';const group=node('group');group.name='召唤法阵';group.color={mode:'own',fill:'gradient',low:'#000000',high:'#80dfff'};
for(const [name,size]of [['外环',.88],['中环',.60],['内环',.32]]){const n=node('shape','Ring');n.name=name;n.transform.width=n.transform.height=size;n.params[0]=.8;n.params[1]=.018;group.children.push(n);}
const stars=node('shape','Star');stars.name='环形星光';stars.arrange[0]=8;stars.arrange[3]=12;stars.arrange[4]=.12;stars.arrange[5]=.43;stars.arrange[33]=1;stars.params[0]=.7;stars.tracks['transform.rotation']={mode:'absolute',ease:'linear',keys:[[0,0],[1,360]]};group.children.push(stars);spell.root.children=[group];cleanIds(spell);
const animated=project();animated.name='呼吸星形';const star=node('shape','Star');star.name='呼吸星形';star.color={mode:'own',fill:'solid',low:'#80dfff',high:'#80dfff'};star.transform.width=star.transform.height=.65;animated.root.children=[star];cleanIds(animated);
const water=project();water.name='动态焦散材质';water.root.children=[node('shape','WaterCaustics')];cleanIds(water);
const fire=project();fire.name='火焰序列';fire.root.children=[node('shape','Bonfire')];cleanIds(fire);
for(const [name,p]of [['summoning-circle',spell],['animation-star',animated],['water-caustics',water],['fire-sequence',fire]])await writeFile(resolve(root,'docs/examples/'+name+'.json'),JSON.stringify(p,null,2)+'\n');
try{
 for(let i=0;i<60;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({channel:process.env.DOCS_BROWSER??'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1600,height:1050},deviceScaleFactor:1,locale:'zh-CN',colorScheme:'dark'});
 let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const ready=async()=>{await page.locator('#render-status').waitFor();await page.waitForFunction(()=>{const s=document.querySelector('#render-status');return !s||!s.textContent.includes('加载');});};
 const load=async p=>{await page.goto(url+'#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.reload();await ready();};
 const shot=async(name,locator=null,clip=null)=>{await page.mouse.move(3,3);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));if(await page.locator('#preview-error').isVisible().catch(()=>false))throw Error(await page.locator('#preview-error').innerText());const dialog=page.locator('dialog[open]').last(),modal=page.locator('#global-panel > section');const target=locator??(await dialog.isVisible()?dialog:await modal.isVisible()?modal:null);const clear=await markScreenshot(page,name,clip??(target?await target.boundingBox():null));try{await (target??page).screenshot({path:resolve(output,name+'.png'),animations:'disabled',caret:'hide',...(clip?{clip}:{})});}finally{await clear();}console.log('captured '+name);};
 const run=async(name,fn)=>{if(!only.size||only.has(name)){console.log('section '+name);await fn();}};
 const changeNumber=async(label,value,scope=page)=>{const input=scope.getByRole('spinbutton',{name:label,exact:true});await input.fill(String(value));await input.press('Tab');};
 const library=async()=>{await page.locator('#open-graphics-library').click();await page.getByPlaceholder('搜索名称、分类或标签').waitFor();};
 const editorReady=async()=>{const d=page.locator('dialog').last();await d.getByRole('status').filter({hasText:'预览成功'}).first().waitFor();return d;};
 await run('examples',async()=>{
  for(const [file,p]of [['summoning-circle',spell],['animation-star',animated],['water-caustics',water],['fire-sequence',fire]]){
   await page.goto(url);await ready();await page.locator('#project-file').setInputFiles(resolve(root,'docs/examples/'+file+'.json'));
   await page.waitForFunction(name=>document.querySelector('#project-name').value===name,p.name);await ready();
   if(await page.locator('#preview-error').isVisible())throw Error('Example failed to render: '+file);
   console.log('opened example '+file);
  }
 });
 await run('combinations',async()=>{
  await page.setViewportSize({width:1400,height:7000});await page.goto(url+'examples.html');
  await page.waitForFunction(count=>document.querySelector('#status')?.textContent.includes(count+' 种组合示例已生成'),treeSamples().length,{timeout:180000});
  await page.locator('#samples img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await shot('composition-examples');await page.getByRole('combobox',{name:'示例分类',exact:true}).selectOption('arrangement');await page.setViewportSize({width:1400,height:2200});await shot('arrangement-examples');await page.setViewportSize({width:1600,height:1050});
 });
 await run('workspace',async()=>{
  await load(spell);await page.getByRole('button',{name:'选择 环形星光',exact:true}).click();await shot('workspace');
  await page.getByRole('button',{name:'变换/排列',exact:true}).click();await shot('transform-region');await page.getByLabel('排列方式',{exact:true}).scrollIntoViewIfNeeded();await shot('arrangement');
  await page.getByRole('button',{name:'选择 外环',exact:true}).click();await page.getByRole('button',{name:'合成',exact:true}).click();await page.getByText('后处理：亮度、色阶与反相',{exact:true}).click();await changeNumber('Bloom 强度',.35);await page.getByLabel('Bloom 强度',{exact:true}).evaluate(e=>e.scrollIntoView({block:'center'}));await shot('compositing');
  await page.locator('details.header-dropdown > summary').filter({hasText:'文件'}).click();await shot('project-files',null,{x:620,y:0,width:420,height:310});
 });
 await run('library',async()=>{
  await load(spell);await library();await page.getByPlaceholder('搜索名称、分类或标签').fill('特效素材');await page.waitForFunction(()=>document.querySelectorAll('.graphics-card').length===14);await shot('graphics-library');
  await page.getByPlaceholder('搜索名称、分类或标签').fill('湍流火焰');await page.getByRole('button',{name:'添加到图形列表',exact:true}).click();await page.getByRole('button',{name:'编辑 湍流火焰',exact:true}).click();const d=await editorReady();await d.getByRole('slider',{name:'预览时间（秒）',exact:true}).fill('1.3');await editorReady();await shot('generator-parameters');await d.locator('header .graphics-close').click();
  await page.locator('dialog').last().locator('header .graphics-close').click();await shot('graphics-list');
 });
 await run('resources',async()=>{
  await load(spell);await library();await page.getByRole('button',{name:'创建资源',exact:true}).click();const d=page.locator('dialog.resource-create-dialog');
  const png=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=c.height=384;const x=c.getContext('2d');x.fillStyle='#ffffff';x.fillRect(0,0,384,384);x.translate(192,192);for(let i=0;i<6;i++){x.rotate(Math.PI/3);x.fillStyle=i%2?'#6d55c8':'#9f8ee0';x.beginPath();x.ellipse(0,-66,33,76,0,0,Math.PI*2);x.fill();}x.fillStyle='#f2be67';x.beginPath();x.arc(0,0,35,0,Math.PI*2);x.fill();return c.toDataURL().split(',')[1];});
  await d.getByRole('textbox',{name:'资源名称',exact:true}).fill('六瓣花图片');await d.getByLabel('图片文件',{exact:true}).setInputFiles({name:'flower.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await editorReady();await shot('image-import');
  await d.getByRole('combobox',{name:'处理方式',exact:true}).selectOption('color');await d.getByLabel('背景颜色',{exact:true}).fill('#ffffff');await editorReady();await shot('image-background');
  await d.getByRole('tab',{name:'公式',exact:true}).click();await editorReady();await d.getByRole('textbox',{name:'资源名称',exact:true}).fill('自定义圆形');await shot('formula-editor');await d.getByRole('button',{name:'验证并预览',exact:true}).scrollIntoViewIfNeeded();await shot('formula-validate');
  await d.getByRole('tab',{name:'生成器',exact:true}).click();await editorReady();await d.getByRole('textbox',{name:'生成器JSON',exact:true}).fill(JSON.stringify(GENERATOR_EXAMPLE,null,2));await d.getByRole('button',{name:'验证并预览',exact:true}).click();await editorReady();await d.getByRole('textbox',{name:'生成器JSON',exact:true}).evaluate(e=>e.scrollTop=0);await d.getByRole('textbox',{name:'生成器JSON',exact:true}).scrollIntoViewIfNeeded();await shot('generator-editor');await d.getByRole('button',{name:'验证并预览',exact:true}).scrollIntoViewIfNeeded();await shot('generator-validate');
  await d.getByRole('tab',{name:'导入文件',exact:true}).click();await shot('resource-import');await d.locator('header .graphics-close').click();
 });
 await run('animation',async()=>{
  await load(animated);await page.getByRole('button',{name:'选择 呼吸星形',exact:true}).click();await page.getByRole('button',{name:'变换/排列',exact:true}).click();await page.locator('#animation-panel > summary').click();
  await page.getByRole('button',{name:'参数模式 ● 录制',exact:true}).click();await changeNumber('区域宽',.35);await page.getByRole('slider',{name:'当前范围滑动进度',exact:true}).fill('0.5');await changeNumber('区域宽',.8);await page.getByRole('slider',{name:'当前范围滑动进度',exact:true}).fill('1');await changeNumber('区域宽',.35);await page.getByRole('button',{name:'参数模式 ● 录制',exact:true}).click();await shot('animation-keyframes');
  await page.locator('#node-animation-editor').getByRole('button',{name:'曲线',exact:true}).click();await shot('animation-curves');
 });
 await run('normal',async()=>{
  await load(water);await page.getByRole('combobox',{name:'预览贴图类型',exact:true}).selectOption('height');await shot('height-preview');
  await page.getByRole('combobox',{name:'预览贴图类型',exact:true}).selectOption('normal');await changeNumber('法线强度',6,page.locator('#normal-preview-settings'));await shot('normal-preview');
  await page.getByRole('combobox',{name:'预览模式',exact:true}).selectOption('material');await page.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('材质采样'));await shot('material-preview');
 });
 await run('export',async()=>{
  await load(spell);await page.locator('#export-now').click();await shot('export-png');await page.locator('#close-global').click();
  await load(fire);await page.locator('#export-now').click();await page.getByRole('combobox',{name:'导出类型',exact:true}).selectOption('atlas');await changeNumber('像素宽',128,page.locator('#global-panel'));await changeNumber('播放秒数',1,page.locator('#global-panel'));await changeNumber('每秒帧数（FPS）',16,page.locator('#global-panel'));await changeNumber('图集列数',4,page.locator('#global-panel'));await shot('export-atlas');
  await page.getByRole('combobox',{name:'导出类型',exact:true}).selectOption('atlas-preview');await page.locator('#confirm-export').click();await page.getByRole('img',{name:'完整画布图集预览'}).waitFor({state:'visible'});await shot('atlas-preview',page.getByRole('img',{name:'完整画布图集预览'}));await page.locator('#close-global').click();
  await load(spell);await page.locator('#export-now').click();await page.getByRole('combobox',{name:'导出类型',exact:true}).selectOption('svg');await shot('export-vector');await page.locator('#close-global').click();
 });
 await run('remote-ai',async()=>{
  await load(spell);await library();await page.getByRole('button',{name:'远程图库',exact:true}).click();await shot('remote-libraries');
  await page.locator('dialog').last().locator('header .graphics-close').click();await page.getByPlaceholder('搜索名称、分类或标签').fill('星形');await page.getByRole('button',{name:'导出 AI 图形目录',exact:true}).click();await page.getByRole('button',{name:'生成目录',exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('dialog textarea')].some(e=>e.value.includes('schema')));await shot('ai-catalog');
  await load(spell);await page.locator('.header-help > summary').click();await shot('help-menu',null,{x:1050,y:0,width:550,height:340});
 });
 await run('manager',async()=>{
  await load(water);
  const fixture=await page.evaluate(async()=>{
   const {encodeResourcePack}=await import('./resource-pack.js'),{TreeRenderer}=await import('./tree-renderer.js'),{project,node,PRESET_SCHEMA}=await import('./tree-model.js');
   const result=[],renderer=new TreeRenderer(document.createElement('canvas'));
   try{for(const [type,name,category]of [['Star','装饰星形','基础图形'],['Ring','细线圆环','基础图形'],['Circle','实心圆形','基础图形']]){const p=project();p.root.children=[node('shape',type)];renderer.draw(p,128,128);const c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(renderer.canvas,0,0);const thumbnail=c.toDataURL(),bytes=await encodeResourcePack({schema:PRESET_SCHEMA,name,root:p.root.children[0],graphicResource:{resourceId:crypto.randomUUID(),versionId:1,personalRevision:0,name,category,description:'图文手册演示资源',kind:'formula',thumbnail}});let b='';for(let i=0;i<bytes.length;i+=8192)b+=String.fromCharCode(...bytes.subarray(i,i+8192));result.push({name:type,bytes:btoa(b)});}return result;}finally{renderer.destroy();}
  });
  await mkdir(resolve(root,'test-results/docs-library'),{recursive:true});const temp=await mkdtemp(resolve(root,'test-results/docs-library/capture-')),args=[];
  for(const f of fixture){const path=resolve(temp,f.name+'.zip');await writeFile(path,Buffer.from(f.bytes,'base64'));args.push('--input',path);}
  const target=resolve(temp,'library');await buildLibrary([...args,'--out',target,'--name','示例图形库']);
  const index=JSON.parse(await readFile(resolve(target,'index.json'),'utf8')),paths=['index.json',...index.entries.flatMap(e=>[e.file,e.thumbnail])],files=await Promise.all(paths.map(async path=>({path,data:(await readFile(resolve(target,path))).toString('base64')}))),html=await readFile(resolve(target,'library-manager.html'));
  const managerServer=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});await new Promise(r=>managerServer.listen(0,'127.0.0.1',r));
  const manager=await context.newPage();try{
   await manager.addInitScript(()=>{window.showDirectoryPicker=async()=> (await navigator.storage.getDirectory()).getDirectoryHandle('docs-example-library');});
   await manager.goto('http://127.0.0.1:'+managerServer.address().port);await manager.evaluate(async files=>{const dir=await (await navigator.storage.getDirectory()).getDirectoryHandle('docs-example-library',{create:true});for(const {path,data}of files){const parts=path.split('/');let current=dir;for(const part of parts.slice(0,-1))current=await current.getDirectoryHandle(part,{create:true});const file=await current.getFileHandle(parts.at(-1),{create:true}),writer=await file.createWritable();await writer.write(Uint8Array.from(atob(data),c=>c.charCodeAt(0)));await writer.close();}},files);
   await manager.getByRole('button',{name:'选择本地图库目录',exact:true}).click();await manager.locator('#workspace').waitFor({state:'visible'});await manager.waitForFunction(()=>document.querySelectorAll('#grid article').length===3);let clear=await markScreenshot(manager,'library-manager');try{await manager.screenshot({path:resolve(output,'library-manager.png'),animations:'disabled'});}finally{await clear();}console.log('captured library-manager');
   await manager.locator('#grid article').first().getByRole('button',{name:'编辑信息',exact:true}).click();await manager.locator('#edit-dialog').waitFor({state:'visible'});clear=await markScreenshot(manager,'library-manager-edit');try{await manager.screenshot({path:resolve(output,'library-manager-edit.png'),animations:'disabled'});}finally{await clear();}console.log('captured library-manager-edit');
  }finally{await manager.close();await new Promise(r=>managerServer.close(r));}
 });
 if(errors.length)throw Error(errors.join('\n'));await syncScreenshotCaptions(root);console.log('Documentation captures complete');
}catch(error){console.error(error);if(browser){const p=browser.contexts()[0]?.pages()[0];if(p){await p.screenshot({path:resolve(root,'test-results/docs-capture-error.png')}).catch(()=>{});await writeFile(resolve(root,'test-results/docs-capture-error.txt'),await p.locator('body').innerText()).catch(()=>{});}}process.exitCode=1;}finally{await browser?.close();server.kill();}
