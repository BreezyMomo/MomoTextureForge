// Check rendered UI text and interactions, including the distributed static site.
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{let url=new URL(req.url,'http://localhost').pathname;if(built)url=url.replace(/^\/MomoTextureForge\//,'/');const file=path.resolve(root,'.'+(url==='/'?'/index.html':url));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,page;
const report={},errors=[];
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const context=await browser.newContext({viewport:{width:1400,height:1000}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const address=`http://127.0.0.1:${server.address().port}${built?'/MomoTextureForge/':'/'}`;
 const draft=project();if(process.argv.includes('--exports-only'))Object.assign(draft.output,{width:32,height:32,seconds:.3,exportSeconds:.6,fps:10});draft.name='文件';draft.root.name='画布';draft.root.children=[node('shape','Circle'),node('shape','Circle')];draft.root.children[0].name='颜色';draft.root.children[1].name='保存';
 draft.root.children[0].tracks['params.0']={mode:'absolute',ease:'linear',keys:[[0,.3],[1,.8]]};
 await page.goto(address+'#tree='+Buffer.from(JSON.stringify(draft)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('[role=treeitem]').first().click();
 const eye=page.locator('#node-tree .tree-visibility').first();
 assert.equal(await eye.locator('svg').count(),1);assert.equal(await eye.getAttribute('aria-pressed'),'true');assert.deepEqual(await eye.evaluate(e=>{const s=getComputedStyle(e);return [s.borderWidth,s.boxShadow,s.backgroundColor];}),['0px','none','rgba(0, 0, 0, 0)']);assert.equal(await eye.getAttribute('title'),'隐藏 颜色');
 await eye.click();assert.equal(await eye.getAttribute('aria-pressed'),'false');assert.equal(await eye.locator('svg path').count(),2);assert.equal(await eye.getAttribute('title'),'显示 颜色');
 await eye.click();assert.equal(await eye.getAttribute('aria-pressed'),'true');assert.equal(await eye.locator('svg path').count(),1);
 const initial=await page.evaluate(()=>({saved:localStorage.getItem('momo-texture-tree:draft:v1'),undo:document.querySelector('#undo').disabled,hash:location.hash}));
 async function language(first){if(process.argv.includes('--trace'))console.log('language',first,page.viewportSize().width,new URL(page.url()).pathname+new URL(page.url()).search);const select=page.locator('#language-settings');assert.deepEqual(await select.locator('option').evaluateAll(options=>options.map(o=>({code:o.value,name:o.textContent}))),[{code:'zh-CN',name:'简体中文'},{code:'en',name:'English'}]);await select.selectOption(first);assert.equal(await page.locator('#detailed-help').getAttribute('href'),'https://github.com/BreezyMomo/MomoTextureForge/blob/main/'+(first==='zh-CN'?'README.md':'README.en.md'));for(const [id,host]of [['github-repository','github.com'],['gitee-repository','gitee.com']])assert.equal(await page.locator('#'+id).getAttribute('href'),'https://'+host+'/BreezyMomo/MomoTextureForge'+(first==='zh-CN'?'':'/blob/main/README.en.md'));assert.equal(await page.locator('.language-dialog').count(),0);}
 await language('en');assert.equal(await page.locator('#project-name').inputValue(),'文件');assert.equal(await eye.getAttribute('title'),'Hide 颜色');assert.equal(await eye.getAttribute('aria-label'),'Node visibility: 颜色');assert.deepEqual(await page.locator('#node-tree .tree-node .tree-node-name').allTextContents(),['颜色','保存']);
 assert.deepEqual(await page.evaluate(()=>({saved:localStorage.getItem('momo-texture-tree:draft:v1'),undo:document.querySelector('#undo').disabled,hash:location.hash})),initial);
 async function english(label,scope='body'){
  const untranslated=await page.locator(scope).evaluate(root=>{const result=[],keyLeak=/\b(?:common|menu|editor|ui|library|selection|timeline|material|effect|parameter|categories|graphics|palettes|presets|help|workspace|layout|canvas|generator|subscription|errors|examples)\.[A-Za-z][A-Za-z0-9.]*/,dataText='#node-tree,#breadcrumbs,#selected-heading,#selected-path,.animation-track-name,.animation-interval,.animation-key-properties strong';
   const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walk.nextNode()){const n=walk.currentNode,p=n.parentElement;if(!p?.checkVisibility()||p.closest('script,style,textarea,code,pre:not([role=status]),svg'))continue;const text=n.nodeValue.trim();if((!/[\u3400-\u9fff]/.test(text)&&!keyLeak.test(text))||p.closest(dataText)||p.matches('.parameter-alias-row option[value="zh-CN"],#language-settings option[value="zh-CN"]')&&text==='简体中文')continue;result.push(text);}
   for(const p of root.querySelectorAll('[title],[aria-label],[placeholder],[alt]')){if(!p.checkVisibility()||p.closest('#node-tree,#breadcrumbs,.animation-track-name,.animation-interval,.animation-key-properties'))continue;for(const a of ['title','aria-label','placeholder','alt']){const text=p.getAttribute(a);if(text&&(/[\u3400-\u9fff]/.test(text)||keyLeak.test(text))&&!(a==='title'&&p.closest('#inspector-tabs')&&['颜色','保存'].includes(text)))result.push(a+': '+text);}}
   return [...new Set(result)];});report[label]=untranslated;assert.deepEqual(untranslated,[],label);
 }
 if(process.argv.includes('--exports-only')){
  await page.locator('#export-now').click();const format=page.locator('#global-controls select').first();
  assert.equal(await format.locator('option[value="atlas-preview"]').count(),0);
  for(const kind of ['gif','frames','atlas','atlas-exr','batch-atlas']){await format.selectOption(kind);assert.equal(await page.locator('.tree-export-preview').count(),1);await english('export-'+kind);}
  await format.selectOption('frames');await page.locator('#generate-export-preview').click();await page.waitForFunction(()=>!!document.querySelector('.tree-export-preview canvas'));await english('sequence-preview');
  const duration=page.getByRole('spinbutton',{name:'Export duration (seconds)',exact:true});await duration.fill('0.9');await duration.press('Tab');await english('stale-preview');
  await format.selectOption('gif');await page.locator('#generate-export-preview').click();await page.waitForFunction(()=>document.querySelector('.tree-export-preview img')?.naturalWidth>0);await english('gif-preview');
  const saved=await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1'));await language('zh-CN');await language('en');assert.equal(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),saved);await english('preview-language-switch');
  for(const width of [1600,1100,768]){await page.setViewportSize({width,height:1000});await english('preview-'+width);const box=await page.locator('#global-panel section').first().boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);}
 }else{
 await english('shape');
 for(let i=1;i<4;i++){await page.locator('#inspector-tabs button').nth(i).click();await english('inspector-'+i);}
 await page.locator('#inspector-tabs button').nth(1).click();const arrange=page.locator('#inspector select[aria-label="Arrangement"]');
 assert.equal(await arrange.count(),1);for(const value of ['1','7','8','13','15']){await arrange.selectOption(value);await english('arrangement-'+value);}
 // Multi-selection must translate shared enums and leave explicit node names intact.
 await page.locator('[role=treeitem]').nth(1).click({modifiers:['Control']});
 for(let i=0;i<4;i++){await page.locator('#inspector-tabs button').nth(i).click();await english('multi-'+i);}
 await page.locator('#inspector-tabs button').nth(0).click();await page.getByRole('combobox',{name:'Batch Color source',exact:true}).selectOption('own');for(const fill of ['solid','gradient']){await page.getByRole('radiogroup',{name:'Batch Color fill',exact:true}).locator('input[value='+fill+']').check();await english('multi-color-'+fill);}

 await page.locator('[role=treeitem]').first().click();await page.locator('#export-now').click();await english('export');await page.locator('#close-global').click();
 await page.locator('#preview-channel').selectOption('normal');await english('normal');
 await page.locator('#preview-mode').selectOption('material');await english('material');
 await page.locator('#preview-mode').selectOption('effect');await english('effect');
 await language('zh-CN');assert.equal(await page.locator('#open-graphics-library').innerText(),'图形库');assert.ok((await page.locator('#effect-preview-controls').innerText()).includes('预览亮度'));
 await language('en');await english('effect-after-language-switch');await page.locator('#preview-mode').selectOption('material');await english('material-after-language-switch');await page.locator('#preview-mode').selectOption('canvas');
 await page.locator('#workspace-layout-menu summary').click();await english('layout');await page.locator('#workspace-layout-menu summary').click();
 await page.locator('#open-graphics-library').click();await page.locator('.graphics-card').last().waitFor();await english('graphics-library');
 const library=page.locator('.graphics-library-dialog');const filter=library.locator('.graphics-browse-controls > select').first();await filter.selectOption('image');assert.equal(await filter.inputValue(),'image');await page.waitForFunction(()=>document.querySelectorAll('.graphics-library-dialog .graphics-card').length===0);await filter.selectOption('all');await page.waitForFunction(()=>document.querySelectorAll('.graphics-library-dialog .graphics-card').length>200);
 await library.locator('.graphics-management>summary').click();await library.getByRole('button',{name:'Create resource',exact:true}).click();const creator=page.locator('.resource-create-dialog');await english('create-image', '.resource-create-dialog');
 for(const [index,tab]of [[1,'file'],[2,'formula'],[3,'generator']]){await creator.getByRole('tab').nth(index).click();await page.waitForTimeout(350);await english('create-'+tab,'.resource-create-dialog');}
 await creator.locator('.graphics-close').click();await library.locator('.graphics-close').click();
 await page.locator('.header-help summary').click();await page.locator('#tool-help').click();for(const b of await page.locator('.user-help-dialog nav button').all()){await b.click();await english('help-'+await b.getAttribute('data-section'),'.user-help-dialog');}await page.locator('.user-help-dialog header button').last().click();
 await page.locator('#support-project').click();await english('support','.support-dialog');await page.locator('.support-dialog button').click();
 await mkdir(new URL('../test-results/languages/',import.meta.url),{recursive:true});
 // Dropdown labels must stay centered like adjacent buttons at either density.
 for(const locale of ['zh-CN','en']){
  await language(locale);
  for(const density of ['compact','comfortable']){
   await page.locator('#appearance-settings').click();await page.locator('#appearance-density').selectOption(density);await page.locator('.appearance-dialog [data-save]').click();
   for(const width of [1600,1100,768]){
    await page.setViewportSize({width,height:1000});
    async function alignedHeader(){
     const groups=await page.locator('.tree-canvas-actions,.tree-resource-actions,.tree-tool-actions').evaluateAll(groups=>groups.map(group=>Array.from(group.querySelectorAll(':scope > button,:scope > select,:scope > details > summary')).filter(e=>e.checkVisibility()).map(e=>{
      const box=e.getBoundingClientRect(),walk=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),centers=[];
      while(walk.nextNode()){const text=walk.currentNode;if(!text.textContent.trim()||text.parentElement.closest('svg,option'))continue;const range=document.createRange();range.selectNodeContents(text);const r=range.getBoundingClientRect();if(r.height)centers.push(r.y+r.height/2);}
      return {label:e.id||e.textContent.trim(),center:box.y+box.height/2,text:centers};
     })));
     for(const controls of groups){
      const centers=controls.map(c=>c.center),text=controls.flatMap(c=>c.text);
      assert.ok(Math.max(...centers)-Math.min(...centers)<1,`Control alignment: ${locale}/${density}/${width} ${JSON.stringify(controls)}`);
      assert.ok(Math.max(...text)-Math.min(...text)<1,`Text alignment: ${locale}/${density}/${width} ${JSON.stringify(controls)}`);
     }
    }
    await alignedHeader();
    for(const menu of await page.locator('.tree-header .header-dropdown').all())if(await menu.isVisible()){
     await menu.locator('summary').click();await alignedHeader();await menu.locator('summary').click();
    }
    if(locale==='zh-CN'&&width===1600&&!process.argv.includes('--no-screenshots')){
     const box=await page.locator('.tree-header').boundingBox();await page.screenshot({path:fileURLToPath(new URL(`../test-results/languages/${built?'built':'source'}-toolbar-${density}.png`,import.meta.url)),clip:box});
    }
   }
  }
 }
 await language('en');
 for(const width of [1600,1100,768]){await page.setViewportSize({width,height:1000});const boxes=await page.locator('.tree-brand,.tree-canvas-actions,.tree-tool-actions').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(Math.min(boxes[i].right,boxes[j].right)-Math.max(boxes[i].x,boxes[j].x)<1||Math.min(boxes[i].bottom,boxes[j].bottom)-Math.max(boxes[i].y,boxes[j].y)<1,'header overlap at '+width);assert.equal(await page.locator('#inspector-color-quick').count(),0);if(!process.argv.includes('--no-screenshots'))await page.screenshot({path:fileURLToPath(new URL(`../test-results/languages/${built?'built':'source'}-english-${width}.png`,import.meta.url))});}
 const examples=page;await examples.setViewportSize({width:1400,height:1000});await examples.goto(address+(built?'?view=examples':'examples.html'));await examples.waitForFunction(()=>document.querySelector('#samples')?.children.length>20&&/generated/.test(document.querySelector('#status').textContent),null,{timeout:180000});const texts=await examples.locator('body').innerText();assert.ok(!/[\u3400-\u9fff]/.test(texts),texts.slice(0,500));assert.ok(!/\b(?:examples|presets|ui|editor)\.[A-Za-z][A-Za-z0-9.]*/.test(texts),'Example message IDs must resolve');for(const title of await examples.locator('#samples h2').allTextContents())assert.ok(title.trim(),'Every example has a localized title');assert.ok(await examples.locator('#samples a').count()>20);await examples.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({built,pass:true,views:Object.keys(report),errors}));
}catch(error){
 const state=page&&!page.isClosed()?{url:page.url().split('#')[0],viewport:page.viewportSize(),body:await page.locator('body').innerText({timeout:3000}).then(text=>text.slice(0,2200)).catch(()=>null)}:null;
 await mkdir(new URL('../test-results/languages/',import.meta.url),{recursive:true});await writeFile(new URL('../test-results/languages/ui-coverage-failure.json',import.meta.url),JSON.stringify({built,report,error:String(error),page:state},null,2));throw error;
}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
