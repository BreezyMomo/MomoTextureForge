import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {GENERATOR_EXAMPLE} from '../web/generator-authoring.js';
const url=process.argv[2]??'http://127.0.0.1:8799/';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('#open-graphics-library').click();await page.getByRole('button',{name:'创建资源',exact:true}).click();
 let dialog=page.locator('dialog.resource-create-dialog');await dialog.getByRole('tab',{name:'生成器',exact:true}).click();
 await dialog.getByRole('status').filter({hasText:'预览成功'}).waitFor();
 assert.equal(await dialog.getByRole('combobox').count(),0,'There is no template selector');
 const code=dialog.getByRole('textbox',{name:'生成器JSON',exact:true});await code.fill(JSON.stringify(GENERATOR_EXAMPLE,null,2));
 await dialog.getByRole('button',{name:'验证并预览',exact:true}).click();await dialog.getByRole('slider',{name:'半径滑动条'}).waitFor();
 await dialog.getByRole('textbox',{name:'资源名称',exact:true}).fill('自定义柔光环');
 const before=await dialog.locator('section:not([hidden]) .graphic-preview-panel canvas').evaluate(c=>c.toDataURL());await dialog.getByRole('slider',{name:'半径滑动条'}).press('End');
 await page.waitForFunction(before=>document.querySelector('dialog.resource-create-dialog section:not([hidden]) .graphic-preview-panel canvas')?.toDataURL()!==before,before);
 await dialog.getByRole('status').filter({hasText:'预览成功'}).waitFor();
 assert.equal(JSON.parse(await code.inputValue()).parameters[1].default,.8);
 // Invalid GLSL keeps the old preview and cannot create a library entry.
 const valid=await code.inputValue(),bad=JSON.parse(valid);bad.passes.at(-1).source='vec4 generate(vec2 uv){return missingFunction(uv);}';
 await code.fill(JSON.stringify(bad));await dialog.getByRole('button',{name:'验证并预览',exact:true}).click();
 await dialog.getByRole('status').filter({hasText:'编译失败'}).waitFor();
 await dialog.getByRole('button',{name:'导入图形库',exact:true}).click();assert.ok(await dialog.isVisible());
 await code.fill(valid);await dialog.getByRole('button',{name:'验证并预览',exact:true}).click();await dialog.getByRole('status').filter({hasText:'预览成功'}).waitFor();
 await mkdir('test-results/custom-generator',{recursive:true});await page.screenshot({path:'test-results/custom-generator/create.png'});
 const jsonDownload=page.waitForEvent('download');await dialog.getByRole('button',{name:'导出生成器JSON',exact:true}).click();const json=await jsonDownload;assert.equal(await json.failure(),null);
 await dialog.getByRole('button',{name:'导入图形库',exact:true}).click();await dialog.waitFor({state:'detached'});
 let card=page.locator('.graphics-card[data-origin="local"]').filter({hasText:'自定义柔光环'});await card.waitFor();assert.ok((await card.innerText()).includes('生成器'));
 await card.getByRole('button',{name:'编辑 自定义柔光环',exact:true}).click();dialog=page.locator('dialog.graphic-editor-dialog');await dialog.getByRole('status').filter({hasText:'预览成功'}).waitFor();
 assert.equal(JSON.parse(await dialog.getByRole('textbox',{name:'生成器JSON',exact:true}).inputValue()).passes.length,3);
 assert.equal(await dialog.getByRole('spinbutton',{name:'半径',exact:true}).inputValue(),'0.8');
 await dialog.locator('header .graphics-close').click();
 // Exported bundles carry all shaders; the existing import-file tab recognizes them.
 card=page.locator('.graphics-card[data-origin="local"]').filter({hasText:'自定义柔光环'});
 const zipDownload=page.waitForEvent('download');await card.getByRole('button',{name:'导出资源',exact:true}).click();const zip=await zipDownload;assert.equal(await zip.failure(),null);
 await page.getByRole('button',{name:'创建资源',exact:true}).click();dialog=page.locator('dialog.resource-create-dialog');await dialog.getByRole('tab',{name:'导入文件',exact:true}).click();
 await dialog.getByRole('textbox',{name:'创作JSON',exact:true}).fill(JSON.stringify(GENERATOR_EXAMPLE));await dialog.getByRole('button',{name:'解析JSON',exact:true}).click();
 await dialog.getByRole('status').filter({hasText:'预览成功'}).waitFor();assert.equal(await dialog.getByRole('textbox',{name:'生成器JSON',exact:true}).count(),1);
 await dialog.locator('header .graphics-close').click();
 // GPU graph: scaled intermediates, three inputs, extended bindings, custom helper and pass resolution.
 const gpu=await page.evaluate(async()=>{
  const {GENERATOR_EXAMPLE,assetFromGeneratorAuthoring}=await import('./generator-authoring.js'),{registerAsset,unregisterAsset}=await import('./resource-assets.js'),{TreeRenderer}=await import('./tree-renderer.js'),{project,node}=await import('./tree-model.js');
  const draft=structuredClone(GENERATOR_EXAMPLE);for(let i=3;i<18;i++)draft.parameters.push({variable:'extra'+i,label:'额外'+i,min:0,max:1,step:.01,default:.2});
  draft.passes.at(-1).inputs=['shape','glow','shape'];draft.passes.at(-1).source='vec4 generate(vec2 uv){vec4 a=texture(input0,uv),b=texture(input1,uv),c=texture(input2,uv);return vec4(extra17,generatorResolution.x/128.,c.b,max(a.a,b.a*.6));}';
  const id='asset_custom_gpu',asset=assetFromGeneratorAuthoring(draft),r=new TreeRenderer(document.createElement('canvas'));let registered=false;
  try{registerAsset(id,asset);registered=true;const p=project();p.root.children=[node('shape',id)];const draw=()=>r.draw(p,128,128,{read:true,quality:1});const a=draw(),passes=r.base.generators.drawCount;draw();if(passes!==r.base.generators.drawCount)throw Error('Generator cache missed');p.root.children[0].params[17]=.9;const b=draw();let difference=0,green=0;for(let i=0;i<a.length;i+=4){difference+=Math.abs(a[i]-b[i])*a[i+3];if(a[i+3]>.1)green=Math.max(green,a[i+1]);}if(r.gl.getError()||!a.every(Number.isFinite)||!b.every(Number.isFinite))throw Error('Invalid custom pipeline render');return {passes,difference,green};}finally{r.destroy();if(registered)unregisterAsset(id);}
 });
 assert.equal(gpu.passes,3);assert.ok(gpu.difference>10);assert.ok(gpu.green>.99);assert.deepEqual(errors,[]);
 await writeFile('test-results/custom-generator/report.json',JSON.stringify({create:true,liveParameters:true,compileErrorGate:true,libraryEdit:true,jsonExport:true,resourceExport:true,jsonImport:true,gpu,errors},null,2));console.log({gpu,errors});
}finally{await browser.close();}
