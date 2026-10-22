import {language,captureSections,label,inLanguage,demoName,localizeFixture} from './docs-language.mjs';
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
const output=resolve(root,language==='en'?'docs/images/en':'docs/images');await mkdir(output,{recursive:true});await mkdir(resolve(root,'docs/examples'),{recursive:true});
const only=new Set(captureSections),captured=new Set();
const server=spawn(process.execPath,['serve.mjs','--port',String(port)],{cwd:root,stdio:'ignore',windowsHide:true});
let browser;
const cleanIds=p=>{let i=0;walk(p.root,n=>n.id='docs-node-'+(++i));return p;};
const spell=project();spell.name='召唤法阵';const group=node('group');group.name='召唤法阵';group.color={mode:'own',fill:'gradient',low:'#000000',high:'#80dfff'};
for(const [name,size]of [['外环',.88],['中环',.60],['内环',.32]]){const n=node('shape','Ring');n.name=name;n.transform.width=n.transform.height=size;n.params[0]=.8;n.params[1]=.018;group.children.push(n);}
const stars=node('shape','Star');stars.name='环形星光';stars.arrange[0]=8;stars.arrange[3]=12;stars.arrange[4]=.12;stars.arrange[5]=.43;stars.arrange[33]=1;stars.params[0]=.7;stars.tracks['transform.rotation']={mode:'absolute',ease:'linear',keys:[[0,0],[1,360]]};group.children.push(stars);spell.root.children=[group];cleanIds(spell);
const animated=project();animated.name='呼吸星形';const star=node('shape','Star');star.name='呼吸星形';star.color={mode:'own',fill:'solid',low:'#80dfff',high:'#80dfff'};star.transform.width=star.transform.height=.65;animated.root.children=[star];cleanIds(animated);
const water=project();water.name='动态焦散材质';water.root.children=[node('shape','WaterCaustics')];cleanIds(water);
const fire=project();fire.name='火焰序列';fire.root.children=[node('shape','Bonfire')];cleanIds(fire);
if(language==='zh-CN'&&(!only.size||only.has('examples')))for(const [name,p]of [['summoning-circle',spell],['animation-star',animated],['water-caustics',water],['fire-sequence',fire]])await writeFile(resolve(root,'docs/examples/'+name+'.json'),JSON.stringify(p,null,2)+'\n');
try{
 for(let i=0;i<60;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({channel:process.env.DOCS_BROWSER??'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1600,height:1050},deviceScaleFactor:1,locale:language,colorScheme:'dark'});
 await context.addInitScript(code=>{localStorage.setItem('momo-texture-language:v1',JSON.stringify([code,code==='en'?'zh-CN':'en']));for(const key of ['momo-texture-forge:workspace-layouts:v1','momo-texture-tree:inspector-sections:v1','momo-texture-tree:inspector-module-order:v1'])localStorage.removeItem(key);},language);
 let page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const ready=async()=>{await page.locator('#render-status').waitFor();await page.waitForFunction(()=>{const s=document.querySelector('#render-status');return document.documentElement.dataset.ready==='true'&&s?.textContent.trim()&&!s.textContent.includes('加载')&&!s.textContent.includes('Loading');},null,{timeout:120000});};
 const load=async p=>{p=localizeFixture(p);console.log('loading '+p.name);await page.goto(url+'#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.reload();await ready();};
 const shot=async(name,locator=null,clip=null,keepPointer=false)=>{if(!keepPointer)await page.mouse.move(3,3);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));if(await page.locator('#preview-error').isVisible().catch(()=>false))throw Error(await page.locator('#preview-error').innerText());const dialog=page.locator('dialog[open]').last(),modal=page.locator('#global-panel > section');const target=locator??(await dialog.isVisible()?dialog:await modal.isVisible()?modal:null);const clear=await markScreenshot(page,name,clip??(target?await target.boundingBox():null),language);try{await (target??page).screenshot({path:resolve(output,name+'.png'),animations:'disabled',caret:'hide',...(clip?{clip}:{})});}finally{await clear();}captured.add(name);console.log('captured '+name);};
 const run=async(name,fn)=>{if(!only.size||only.has(name)){console.log('section '+name);await fn();}};
 const showModules=async keys=>{for(const module of await page.locator('#inspector>details.inspector-module').all()){const open=keys.includes(await module.getAttribute('data-module'));if((await module.getAttribute('open')!==null)!==open)await module.locator(':scope>summary .inspector-module-title').click();}};
 const changeNumber=async(label,value,scope=page)=>{const input=scope.getByRole('spinbutton',{name:label,exact:true});await input.fill(String(value));await input.press('Tab');};
 const library=async()=>{await page.locator('#open-graphics-library').click();await page.getByPlaceholder(label('library.searchNamesCategoriesOrTags')).waitFor();};
 const editorReady=async()=>{const d=page.locator('dialog').last();await d.getByRole('status').filter({hasText:label('library.previewReady').trim()}).first().waitFor();return d;};
 await run('overflow',async()=>{
  await page.setViewportSize({width:1600,height:1300});const p=project();p.name='内容边界对照';p.root.children=[treeSamples().find(s=>s.name===p.name).root];await load(p);
  await page.getByRole('button',{name:label('editor.select')+demoName('右侧：允许超出'),exact:true}).click();await page.getByRole('button',{name:label('inspector.transformLayout'),exact:true}).click();await page.locator('#show-guides').check();await page.getByRole('combobox',{name:label('editor.boundary'),exact:true}).scrollIntoViewIfNeeded();await shot('content-overflow');const repeat=project();repeat.name='无缝光晕接续';repeat.root.children=[treeSamples().find(s=>s.name===repeat.name).root];await load(repeat);await page.getByRole('button',{name:label('editor.select')+demoName('无缝光晕接续'),exact:true}).click();await page.getByRole('button',{name:label('inspector.transformLayout'),exact:true}).click();await page.locator('#tile-preview').click();await page.locator('#tile-grid').selectOption('3');await page.getByRole('combobox',{name:label('editor.boundary'),exact:true}).scrollIntoViewIfNeeded();await shot('seamless-overflow');await page.setViewportSize({width:1600,height:1050});
 });
 await run('puzzle',async()=>{
  await page.setViewportSize({width:1600,height:1450});const p=project();p.name='单块拼图网格';p.root.children=[treeSamples().find(s=>s.name===p.name).root];await load(p);
  await page.getByRole('button',{name:label('editor.select')+demoName('单块拼图网格'),exact:true}).click();await page.getByRole('button',{name:label('inspector.shape'),exact:true}).click();await shot('puzzle-piece');
  await page.getByRole('button',{name:label('inspector.transformLayout'),exact:true}).click();await page.getByRole('spinbutton',{name:label('editor.gridRows'),exact:true}).evaluate(e=>e.scrollIntoView({block:'center'}));await shot('puzzle-grid');
  const styles=project();styles.name='拼图接口与圆角';styles.root.children=[treeSamples().find(s=>s.name===styles.name).root];await load(styles);await page.getByRole('button',{name:label('editor.select')+demoName('圆头凸耳'),exact:true}).click();await page.getByRole('button',{name:label('inspector.shape'),exact:true}).click();await page.getByText(label('editor.bodyCornersSquare'),{exact:true}).click();await shot('puzzle-corners');await page.setViewportSize({width:1600,height:1050});
 });
 await run('examples',async()=>{if(language==='en')return;
  for(const [file,p]of [['summoning-circle',spell],['animation-star',animated],['water-caustics',water],['fire-sequence',fire]]){
   await page.goto(url);await ready();await page.locator('#project-file').setInputFiles(resolve(root,'docs/examples/'+file+'.json'));
   await page.waitForFunction(name=>document.querySelector('#project-name').value===name,p.name);await ready();
   if(await page.locator('#preview-error').isVisible())throw Error('Example failed to render: '+file);
   console.log('opened example '+file);
  }
 });
 await run('combinations',async()=>{
  await page.setViewportSize({width:1400,height:7000});await page.goto(url+'examples.html');
  await page.waitForFunction(count=>document.querySelectorAll('#samples img').length===count,treeSamples().length,{timeout:180000});
  await page.locator('#samples img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await shot('composition-examples');await page.getByRole('combobox',{name:label('ui.exampleCategory'),exact:true}).selectOption('arrangement');await page.setViewportSize({width:1400,height:2200});await shot('arrangement-examples');await page.setViewportSize({width:1600,height:1050});
 });
 await run('presets',async()=>{await page.setViewportSize({width:1400,height:1100});await page.goto(url+'examples.html?category=presets');await page.waitForFunction(count=>document.querySelectorAll('#samples img').length===count,treeSamples().length,{timeout:180000});await page.locator('#samples article[data-category=presets] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));await shot('vfx-presets');await page.setViewportSize({width:1600,height:1050});});
 await run('workspace',async()=>{
  await load(spell);await page.getByRole('button',{name:label('editor.select')+demoName('环形星光'),exact:true}).click();await shot('workspace');
  await page.getByRole('button',{name:label('inspector.transformLayout'),exact:true}).click();await shot('transform-region');await page.getByLabel(label('editor.instanceSize'),{exact:true}).scrollIntoViewIfNeeded();await shot('arrangement');
  await page.getByRole('button',{name:label('editor.select')+demoName('外环'),exact:true}).click();await page.getByRole('button',{name:label('inspector.composite'),exact:true}).click();await page.getByText(label('modules.imageFilters'),{exact:true}).click();await changeNumber(label('ui.bloomIntensity'),.35);await page.getByLabel(label('ui.bloomIntensity'),{exact:true}).evaluate(e=>e.scrollIntoView({block:'center'}));await shot('compositing');
  await page.locator('details.header-dropdown > summary').filter({hasText:label('menu.file')}).click();await shot('project-files',null,{x:600,y:0,width:650,height:520});
 });
 await run('bezier-editor',async()=>{
  const p=project(),ribbon=node('shape','BezierRibbon');p.name=inLanguage('多段贝塞尔光带','Multisegment Bezier ribbon');ribbon.name=p.name;ribbon.params.splice(0,8,-.85,-.1,-.8,.9,-.1,.9,-.05,.2);ribbon.bezier.shape=[0,-.7,.75,-.75,.8,0];ribbon.color={mode:'own',fill:'solid',low:'#80dfff',high:'#80dfff'};p.root.children=[ribbon];await load(p);
  await page.getByRole('button',{name:label('editor.select')+p.name,exact:true}).click();await page.getByRole('button',{name:label('inspector.shape'),exact:true}).click();await page.getByRole('button',{name:label('bezier.expand'),exact:true}).click();await page.locator('.bezier-editor-dialog').getByRole('button',{name:label('bezier.fit'),exact:true}).click();await shot('bezier-editor');await page.locator('.bezier-editor-dialog').getByRole('button',{name:label('bezier.close'),exact:true}).click();
 });
 await run('inspector-modules',async()=>{
  const demo=structuredClone(animated),circle=node('shape','Circle');circle.name='呼吸圆形';circle.color=demo.root.children[0].color;circle.transform.width=circle.transform.height=.65;demo.name='呼吸圆形';demo.root.children=[circle];await load(demo);
  await page.getByRole('button',{name:label('editor.select')+demoName('呼吸圆形'),exact:true}).click();
  await page.locator('.dock-stack').filter({has:page.locator('[data-panel-tab="inspector"]')}).first().locator('.dock-stack-actions button').first().click();
  const floating=page.locator('.dock-floating').filter({has:page.locator('[data-panel-tab="inspector"]')}).first();await floating.evaluate(e=>{Object.assign(e.style,{left:'1160px',top:'80px',width:'420px',height:'950px'});});
  await page.locator('#inspector [data-module="modules.node"]>summary .inspector-module-title').click();await page.locator('#inspector [data-module="editor.shapeUV"]>summary .inspector-module-title').click();
  await showModules(['modules.shapeParameters']);await page.locator('#inspector [data-module="modules.shapeParameters"]>summary .inspector-module-help').click();await page.locator('#inspector [data-module="editor.nodeColors"]>summary .module-move-up').click();await page.locator('.tree-inspector').evaluate(e=>e.scrollTop=0);await shot('inspector-modules');
  await page.getByRole('button',{name:label('inspector.transformLayout'),exact:true}).click();await page.locator('#inspector [data-module="editor.nodeRegion"]>summary .inspector-module-title').click();
  await page.getByRole('combobox',{name:label('editor.arrangement'),exact:true}).selectOption('1');await changeNumber(label('editor.gridColumns'),5);await changeNumber(label('editor.gridRows'),4);
  await page.locator('#inspector [data-module="editor.contentArrangement"]>summary .inspector-module-help').click();await page.locator('.tree-inspector').evaluate(e=>e.scrollTop=0);await shot('inspector-layout-modules');
 });
 await run('library-filters',async()=>{
  await load(spell);
  await page.locator('.dock-stack').filter({has:page.locator('[data-panel-tab="library"]')}).first().locator('.dock-stack-actions button').first().click();
  const floating=page.locator('.dock-floating').filter({has:page.locator('[data-panel-tab="library"]')}).first();
  await floating.evaluate(e=>{e.style.left='18px';e.style.top='80px';e.style.width='360px';e.style.height='850px';});
  await page.locator('#library-filter button[data-value=all]').click();
  for(const type of ['形状','渐变'])await page.locator('#library-categories button[data-value="'+type+'"]').click();
  await page.waitForFunction(()=>document.querySelector('#shape-library img')?.dataset.ready==='true');
  await shot('graphics-list');
 });
 await run('library',async()=>{
  await load(spell);await library();await page.getByPlaceholder(label('library.searchNamesCategoriesOrTags')).fill(inLanguage('特效素材','VFX'));await page.waitForFunction(()=>document.querySelectorAll('.graphics-card').length===14);await shot('graphics-library');
  await page.getByPlaceholder(label('library.searchNamesCategoriesOrTags')).fill(inLanguage('湍流火焰','Turbulent Flame'));const fireCard=page.locator('.graphics-card').filter({has:page.locator('strong').getByText(inLanguage('湍流火焰','Turbulent Flame'),{exact:true})});if(!await fireCard.getByRole('button',{name:label('library.addToGraphicsList'),exact:true}).isDisabled())await fireCard.getByRole('button',{name:label('library.addToGraphicsList'),exact:true}).click();await fireCard.getByRole('button',{name:inLanguage('编辑 湍流火焰','Edit Turbulent Flame'),exact:true}).click();const d=await editorReady();await d.getByRole('slider',{name:label('library.previewTimeSeconds'),exact:true}).fill('1.3');await editorReady();await shot('generator-parameters');await d.locator('header .graphics-close').click();
  await page.locator('dialog').last().locator('header .graphics-close').click();await shot('graphics-list');
 });
 await run('parameter-states',async()=>{
  const p=project(),n=node('shape','Circle');n.name='呼吸圆形';n.tracks['params.0']={mode:'absolute',ease:'linear',keys:[[0,.3],[1,.8]]};p.root.children=[n];await load(p);await page.getByRole('button',{name:label('editor.select')+demoName('呼吸圆形'),exact:true}).click();await page.getByRole('button',{name:label('inspector.shape'),exact:true}).click();await shot('parameter-states',page.locator('.tree-inspector'));
 });
 await run('selection-editing',async()=>{
  await page.setViewportSize({width:1600,height:1650});const p=project();p.name='批量编辑与对齐';p.root.children=['星形装饰','圆形装饰','多边形装饰'].map((name,i)=>{const n=node('shape',['Star','Circle','Polygon'][i]);n.name=name;Object.assign(n.transform,{x:[.2,.44,.8][i],y:[.3,.65,.45][i],width:.18+i*.025,height:.18+i*.025});n.opacity=[.6,.8,1][i];return n;});await load(cleanIds(p));
  for(let i=0;i<p.root.children.length;i++)await page.getByRole('button',{name:label('editor.select')+demoName(p.root.children[i].name),exact:true}).click({modifiers:i?['Control']:[]});
  await page.locator('#inspector-tabs').getByRole('button',{name:label('inspector.shape'),exact:true}).click();await page.getByRole('combobox',{name:label('selection.batch')+label('editor.colorSource'),exact:true}).selectOption('own');await page.getByRole('radiogroup',{name:label('selection.batch')+label('editor.colorFill'),exact:true}).locator('input[value=solid]').check();const hex=page.getByRole('textbox',{name:label('selection.batch')+label('editor.fillColor')+' HEX',exact:true});await hex.fill('#80dfff');await hex.press('Tab');await showModules(['editor.opacity','editor.nodeColors']);await shot('selection-colors');
  await page.locator('#inspector-tabs').getByRole('button',{name:label('inspector.transformLayout'),exact:true}).click();await page.getByRole('button',{name:label('selection.alignTop'),exact:true}).click();await page.getByRole('button',{name:label('selection.distributeHorizontally'),exact:true}).click();await page.getByRole('spinbutton',{name:label('selection.batch')+label('editor.positionX'),exact:true}).scrollIntoViewIfNeeded();await page.locator('#inspector-tabs').scrollIntoViewIfNeeded();await shot('selection-editing');
  const q=project();q.name='同类图形批改';q.root.children=[.3,.7].map((radius,i)=>{const n=node('shape','Ring');n.name='圆环 '+(i+1);n.params[0]=radius;Object.assign(n.transform,{x:.3+i*.4,width:.4,height:.4});return n;});await load(cleanIds(q));for(let i=0;i<2;i++)await page.getByRole('button',{name:label('editor.select')+demoName(q.root.children[i].name),exact:true}).click({modifiers:i?['Control']:[]});await page.locator('#inspector-tabs').getByRole('button',{name:label('inspector.shape'),exact:true}).click();await shot('selection-shape');await page.setViewportSize({width:1600,height:1050});
 });
 await run('resources',async()=>{
  await load(spell);await library();await page.getByRole('button',{name:label('library.createResource'),exact:true}).click();const d=page.locator('dialog.resource-create-dialog');
  const png=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=c.height=384;const x=c.getContext('2d');x.fillStyle='#ffffff';x.fillRect(0,0,384,384);x.translate(192,192);for(let i=0;i<6;i++){x.rotate(Math.PI/3);x.fillStyle=i%2?'#6d55c8':'#9f8ee0';x.beginPath();x.ellipse(0,-66,33,76,0,0,Math.PI*2);x.fill();}x.fillStyle='#f2be67';x.beginPath();x.arc(0,0,35,0,Math.PI*2);x.fill();return c.toDataURL().split(',')[1];});
  await d.getByRole('textbox',{name:label('library.resourceName'),exact:true}).fill(inLanguage('六瓣花图片','Six-petal flower'));await d.getByLabel(label('library.imageFile'),{exact:true}).setInputFiles({name:'flower.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await editorReady();await shot('image-import');
  await d.getByRole('combobox',{name:label('library.processingMode'),exact:true}).selectOption('color');await d.getByLabel(label('editor.backgroundColor'),{exact:true}).fill('#ffffff');await editorReady();await shot('image-background');
  await d.getByRole('tab',{name:label('editor.formula'),exact:true}).click();await editorReady();await d.getByRole('textbox',{name:label('library.resourceName'),exact:true}).fill(inLanguage('自定义圆形','Custom circle'));await shot('formula-editor');await d.getByRole('button',{name:label('library.validatePreview'),exact:true}).scrollIntoViewIfNeeded();await shot('formula-validate');
  await d.getByRole('tab',{name:label('library.generator'),exact:true}).click();await editorReady();await d.getByRole('textbox',{name:label('generator.generatorJSON'),exact:true}).fill(JSON.stringify(language==='en'?{...GENERATOR_EXAMPLE,name:'Colored glow ring',category:'My graphics',description:'Shape, glow and compositing passes.',parameters:GENERATOR_EXAMPLE.parameters.map(p=>({...p,label:p.aliases.en,aliases:{en:p.aliases.en}}))}:GENERATOR_EXAMPLE,null,2));await d.getByRole('button',{name:label('library.validatePreview'),exact:true}).click();await editorReady();await d.getByRole('textbox',{name:label('generator.generatorJSON'),exact:true}).evaluate(e=>e.scrollTop=0);await d.getByRole('textbox',{name:label('generator.generatorJSON'),exact:true}).scrollIntoViewIfNeeded();await shot('generator-editor');await d.getByRole('button',{name:label('library.validatePreview'),exact:true}).scrollIntoViewIfNeeded();await shot('generator-validate');
  await d.getByRole('tab',{name:label('library.importFiles'),exact:true}).click();await shot('resource-import');await d.locator('header .graphics-close').click();
 });
 await run('animation',async()=>{
  await page.setViewportSize({width:1600,height:1350});await load(animated);await page.getByRole('button',{name:label('editor.select')+demoName('呼吸星形'),exact:true}).click();await page.getByRole('button',{name:label('inspector.transformLayout'),exact:true}).click();await page.locator('#workspace-layout-menu > summary').click();await page.getByRole('button',{name:label('layout.animationLayout'),exact:true}).click();
  const timelineSplit=page.locator('.dock-split-y').filter({has:page.locator('[data-panel-tab="timeline"]')}).locator(':scope > .dock-splitter'),splitBox=await timelineSplit.boundingBox();await page.mouse.move(splitBox.x+splitBox.width/2,splitBox.y+3);await page.mouse.down();await page.mouse.move(splitBox.x+splitBox.width/2,550,{steps:10});await page.mouse.up();
  await page.getByRole('button',{name:label('editor.parameterMode')+label('editor.record'),exact:true}).click();await changeNumber(label('editor.regionWidth'),.35);await page.getByRole('slider',{name:label('editor.scopeProgressSlider'),exact:true}).fill('0.5');await changeNumber(label('editor.regionWidth'),.8);await page.getByRole('slider',{name:label('editor.scopeProgressSlider'),exact:true}).fill('1');await changeNumber(label('editor.regionWidth'),.35);await page.getByRole('button',{name:label('editor.parameterMode')+label('editor.record'),exact:true}).click();await shot('animation-keyframes');
  await page.locator('#node-animation-editor').getByRole('button',{name:label('timeline.curves'),exact:true}).click();await shot('animation-curves');await page.locator('#workspace-layout-menu > summary').click();await page.getByRole('button',{name:label('layout.restoreDefaultLayout'),exact:true}).click();await page.setViewportSize({width:1600,height:1050});
 });
 await run('docking',async()=>{
  await load(spell);await page.getByRole('button',{name:label('editor.select')+demoName('环形星光'),exact:true}).click();await shot('workspace-docking');
  await page.getByRole('button',{name:inLanguage('悬浮参数面板','Float Inspector'),exact:true}).click();await shot('workspace-floating');
  await page.locator('#workspace-layout-menu > summary').click();await page.getByRole('textbox',{name:label('layout.layoutName'),exact:true}).fill(inLanguage('我的特效布局','My VFX layout'));await shot('workspace-layout-menu');
  await page.getByRole('button',{name:label('layout.restoreDefaultLayout'),exact:true}).click();
 });
 await run('colors',async()=>{
  await page.setViewportSize({width:1600,height:1250});await load(spell);await page.getByRole('button',{name:label('editor.select')+demoName('环形星光'),exact:true}).click();await page.getByRole('button',{name:label('inspector.shape'),exact:true}).click();await showModules([]);await shot('color-collapsed');await showModules(['editor.opacity','editor.nodeColors']);await shot('color-inheritance');
  await page.getByRole('button',{name:label('editor.useIndependentColors'),exact:true}).click();const ramp=page.locator('.gradient-track'),box=await ramp.boundingBox();await ramp.click({position:{x:box.width*.5,y:7}});await shot('color-gradient');
  await showModules(['modules.levels','modules.invert']);await shot('color-levels');await showModules(['editor.opacity','editor.nodeColors']);
  await page.getByRole('radiogroup',{name:label('editor.colorFill'),exact:true}).locator('input[value=solid]').check();await page.getByRole('textbox',{name:label('editor.fillColor')+' HEX',exact:true}).fill('#ff9b57');await page.getByRole('textbox',{name:label('editor.fillColor')+' HEX',exact:true}).press('Tab');await shot('color-solid');
  await page.getByRole('button',{name:label('editor.select')+demoName('外环'),exact:true}).click();await page.getByRole('button',{name:label('inspector.composite'),exact:true}).click();await showModules(['modules.imageFilters']);await changeNumber(label('ui.bloomIntensity'),.35);await shot('compositing');await page.setViewportSize({width:1600,height:1050});
 });
 await run('node-tree',async()=>{
  const p=project(),a=node('shape','Circle'),b=node('shape','Star');a.name=inLanguage('圆形装饰','Circle decoration');b.name=inLanguage('星形装饰','Star decoration');p.name=inLanguage('节点树编辑','Node tree editing');p.root.children=[a,b];await load(cleanIds(p));const rows=page.locator('#node-tree .tree-node'),nodes=page.locator('.dock-stack').filter({has:page.locator('[data-panel-tab="nodes"]')}).first();await rows.first().locator('.tree-node-name').dblclick();await shot('node-rename',nodes);await page.locator('.tree-node-rename').press('Escape');
  await page.evaluate(()=>{const rows=document.querySelectorAll('#node-tree .tree-node'),dataTransfer=new DataTransfer(),target=rows[1],box=target.getBoundingClientRect();rows[0].dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer}));target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer,clientX:box.x+box.width*.55,clientY:box.y+box.height*.5}));});await page.locator('.node-group-preview').waitFor({state:'visible'});await shot('node-auto-group',null,null,true);await page.evaluate(()=>document.querySelector('#node-tree .tree-node').dispatchEvent(new DragEvent('dragend',{bubbles:true})));
 });
 await run('normal',async()=>{
  await load(water);await page.getByRole('combobox',{name:label('editor.previewTextureChannel'),exact:true}).selectOption('height');await shot('height-preview');
  await page.getByRole('combobox',{name:label('editor.previewTextureChannel'),exact:true}).selectOption('normal');await changeNumber(label('editor.normalStrength'),6,page.locator('#normal-preview-settings'));await shot('normal-preview');
  await page.getByRole('combobox',{name:label('editor.previewMode'),exact:true}).selectOption('material');await page.waitForFunction(text=>document.querySelector('#render-status').textContent.includes(text),label('editor.dMaterial'));await shot('material-preview');
 });
 await run('effect',async()=>{
  const p=project();p.name='火焰特效混合对照';p.root.children=[node('shape','TurbulentFlame')];await load(p);await page.getByRole('combobox',{name:label('editor.previewMode'),exact:true}).selectOption('effect');await page.getByRole('combobox',{name:label('effect.effectBackground'),exact:true}).selectOption('compare');await page.getByRole('slider',{name:label('editor.scopeProgressSlider'),exact:true}).fill('0.45');await page.waitForFunction(text=>document.querySelector('#render-status').textContent.includes(text),label('editor.effectPreview'));await shot('effect-preview',page.locator('.tree-preview'));
 });
 await run('export',async()=>{
  await load(spell);await page.locator('#export-now').click();await shot('export-png');await page.locator('#close-global').click();
  await load(fire);await page.locator('#export-now').click();await page.getByRole('combobox',{name:label('editor.exportFormat'),exact:true}).selectOption('atlas');await changeNumber(label('editor.pixelWidth'),128,page.locator('#global-panel'));await changeNumber(label('editor.durationInSeconds'),1,page.locator('#global-panel'));await changeNumber(label('editor.framesPerSecondFPS'),16,page.locator('#global-panel'));await changeNumber(label('editor.atlasColumns'),4,page.locator('#global-panel'));await shot('export-atlas');
  await page.getByRole('combobox',{name:label('editor.exportFormat'),exact:true}).selectOption('atlas-preview');await page.locator('#confirm-export').click();await page.getByRole('img',{name:label('editor.fullCanvasAtlasPreview')}).waitFor({state:'visible'});await shot('atlas-preview',page.getByRole('img',{name:label('editor.fullCanvasAtlasPreview')}));await page.locator('#close-global').click();
  await load(spell);await page.locator('#export-now').click();await page.getByRole('combobox',{name:label('editor.exportFormat'),exact:true}).selectOption('svg');await shot('export-vector');await page.locator('#close-global').click();
 });
 await run('remote-ai',async()=>{
  await load(spell);await library();await page.getByRole('button',{name:label('library.remoteLibraries'),exact:true}).click();await shot('remote-libraries');
  await page.locator('dialog').last().locator('header .graphics-close').click();await page.getByPlaceholder(label('library.searchNamesCategoriesOrTags')).fill(inLanguage('星形','Star'));await page.getByRole('button',{name:label('library.exportAIGraphicsCatalog'),exact:true}).click();await page.getByRole('button',{name:label('library.generateCatalog'),exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('dialog textarea')].some(e=>e.value.includes('schema')));await shot('ai-catalog');
 });
 await run('help',async()=>{
  await load(spell);await page.locator('#startup-screen').waitFor({state:'detached'});
  await page.locator('#support-project').click();await page.getByRole('dialog',{name:label('menu.support'),exact:true}).waitFor();await page.getByRole('button',{name:label('ui.closeSupportDialog'),exact:true}).click();
  if(!await page.locator('#support-project').evaluate(e=>e===document.activeElement))throw Error('Support button focus not restored');
  await page.locator('.header-help > summary').click();await shot('help-menu',null,{x:950,y:0,width:650,height:400});
 });
 await run('manager',async()=>{
  await load(water);
  const fixture=await page.evaluate(async language=>{
   const {encodeResourcePack}=await import('./resource-pack.js'),{TreeRenderer}=await import('./tree-renderer.js'),{project,node,PRESET_SCHEMA}=await import('./tree-model.js');
   const result=[],renderer=new TreeRenderer(document.createElement('canvas'));
   try{for(const [type,name,category]of [['Star',language==='en'?'Decorative star':'装饰星形',language==='en'?'Basic shapes':'基础图形'],['Ring',language==='en'?'Thin ring':'细线圆环',language==='en'?'Basic shapes':'基础图形'],['Circle',language==='en'?'Solid circle':'实心圆形',language==='en'?'Basic shapes':'基础图形']]){const p=project();p.root.children=[node('shape',type)];renderer.draw(p,128,128);const c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(renderer.canvas,0,0);const thumbnail=c.toDataURL(),bytes=await encodeResourcePack({schema:PRESET_SCHEMA,name,root:p.root.children[0],graphicResource:{resourceId:crypto.randomUUID(),versionId:1,personalRevision:0,name,category,description:language==='en'?'Illustrated manual example resource':'图文手册演示资源',kind:'formula',thumbnail}});let b='';for(let i=0;i<bytes.length;i+=8192)b+=String.fromCharCode(...bytes.subarray(i,i+8192));result.push({name:type,bytes:btoa(b)});}return result;}finally{renderer.destroy();}
  },language);
  await mkdir(resolve(root,'test-results/docs-library'),{recursive:true});const temp=await mkdtemp(resolve(root,'test-results/docs-library/capture-')),args=[];
  for(const f of fixture){const path=resolve(temp,f.name+'.zip');await writeFile(path,Buffer.from(f.bytes,'base64'));args.push('--input',path);}
  const target=resolve(temp,'library');await buildLibrary([...args,'--out',target,'--name',inLanguage('示例图形库','Example graphics library')]);
  const index=JSON.parse(await readFile(resolve(target,'index.json'),'utf8')),paths=['index.json',...index.entries.flatMap(e=>[e.file,e.thumbnail])],files=await Promise.all(paths.map(async path=>({path,data:(await readFile(resolve(target,path))).toString('base64')}))),html=await readFile(resolve(target,'library-manager.html'));
  const managerServer=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});await new Promise(r=>managerServer.listen(0,'127.0.0.1',r));
  const manager=await context.newPage();try{
   await manager.addInitScript(()=>{window.showDirectoryPicker=async()=> (await navigator.storage.getDirectory()).getDirectoryHandle('docs-example-library');});
   await manager.goto('http://127.0.0.1:'+managerServer.address().port);await manager.evaluate(async files=>{const dir=await (await navigator.storage.getDirectory()).getDirectoryHandle('docs-example-library',{create:true});for(const {path,data}of files){const parts=path.split('/');let current=dir;for(const part of parts.slice(0,-1))current=await current.getDirectoryHandle(part,{create:true});const file=await current.getFileHandle(parts.at(-1),{create:true}),writer=await file.createWritable();await writer.write(Uint8Array.from(atob(data),c=>c.charCodeAt(0)));await writer.close();}},files);
   await manager.getByRole('button',{name:inLanguage('选择本地图库目录','Choose local library folder'),exact:true}).click();await manager.locator('#workspace').waitFor({state:'visible'});await manager.waitForFunction(()=>document.querySelectorAll('#grid article').length===3);let clear=await markScreenshot(manager,'library-manager',null,language);try{await manager.screenshot({path:resolve(output,'library-manager.png'),animations:'disabled'});}finally{await clear();}console.log('captured library-manager');
   await manager.locator('#grid article').first().getByRole('button',{name:inLanguage('编辑信息','Edit metadata'),exact:true}).click();await manager.locator('#edit-dialog').waitFor({state:'visible'});clear=await markScreenshot(manager,'library-manager-edit',null,language);try{await manager.screenshot({path:resolve(output,'library-manager-edit.png'),animations:'disabled'});}finally{await clear();}console.log('captured library-manager-edit');
  }finally{await manager.close();await new Promise(r=>managerServer.close(r));}
 });
 if(errors.length)throw Error(errors.join('\n'));await syncScreenshotCaptions(root,language,captured);console.log('Documentation captures complete');
}catch(error){console.error(error);if(browser){const p=browser.contexts()[0]?.pages()[0];if(p){await p.screenshot({path:resolve(root,'test-results/docs-capture-error.png'),timeout:5000}).catch(()=>{});await writeFile(resolve(root,'test-results/docs-capture-error.txt'),await p.locator('body').innerText()).catch(()=>{});}}process.exitCode=1;}finally{await browser?.close();server.kill();}
