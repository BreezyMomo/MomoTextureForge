import {withPagesAssets} from './helpers/pages-assets.mjs';
// Exercise real editor controls and WebGL; no third-party account/browser state.
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
const root=fileURLToPath(new URL('../web/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain','.svg':'image/svg+xml'};
const built=process.argv.includes('--built'),html=built?await readFile(new URL('../site/index.html',import.meta.url)):null;
const server=http.createServer(withPagesAssets(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;
 if(built){if(pathname!=='/MomoTextureForge/'&&pathname!=='/MomoTextureForge/index.html')throw Error('Not found');res.setHeader('Content-Type','text/html');res.end(html);return;}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root)||!types[path.extname(file)])throw Error('Not found');res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}}));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const draft=project();draft.name='保留的画布名称';draft.root.children=[node('shape','Circle')];draft.root.children[0].name='用户的圆形';
 const address=`http://127.0.0.1:${server.address().port}${built?'/MomoTextureForge/':'/'}`;
 await page.goto(address+'#tree='+Buffer.from(JSON.stringify(draft)).toString('base64'));
 await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('[role=treeitem]').first().click();
 await page.locator('[data-parameter-variable=radius]').waitFor();
 assert.equal(await page.locator('[data-parameter-variable=radius] label').innerText(),'半径');
 const initial=await page.evaluate(()=>({saved:localStorage.getItem('momo-texture-tree:draft:v1'),image:document.querySelector('#tree-canvas').toDataURL(),undo:document.querySelector('#undo').disabled}));
 await page.locator('#language-settings').selectOption('en');
 assert.equal(await page.locator('.language-dialog').count(),0);
 assert.equal(await page.locator('[data-parameter-variable=radius] label').innerText(),'Radius');
 assert.equal(await page.locator('[data-parameter-variable=radius]').getAttribute('title'),'radius');
 assert.equal(await page.locator('#project-name').inputValue(),'保留的画布名称');assert.ok((await page.locator('#node-tree').innerText()).includes('用户的圆形'));
 await page.waitForTimeout(100);
 assert.deepEqual(await page.evaluate(()=>({saved:localStorage.getItem('momo-texture-tree:draft:v1'),image:document.querySelector('#tree-canvas').toDataURL(),undo:document.querySelector('#undo').disabled})),initial);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('[role=treeitem]').first().click();assert.equal(await page.locator('[data-parameter-variable=radius] label').innerText(),'Radius');
 // The selector exposes only build-configured languages; invalid injected values are rejected.
 const language=page.locator('#language-settings');
 assert.equal(await language.evaluate(e=>e.tagName),'SELECT');
 assert.deepEqual(await language.locator('option').evaluateAll(list=>list.map(o=>({code:o.value,name:o.textContent}))),[{code:'zh-CN',name:'简体中文'},{code:'en',name:'English'}]);
 await language.evaluate(e=>{e.value='ja';e.dispatchEvent(new Event('change'));});
 assert.equal(await language.inputValue(),'en');assert.ok(await page.locator('#tree-toast').innerText());assert.equal(await page.locator('dialog[open]').count(),0);
 await language.selectOption('zh-CN');
 // Formula editor: alias rows are author-owned and optional, not an obligatory base label.
 await page.locator('#open-graphics-library').click();
 const card=page.locator('.graphics-card').filter({has:page.getByText('圆形',{exact:true})}).first();await card.getByRole('button',{name:'编辑 圆形',exact:true}).click();
 await page.locator('.graphics-parameters .parameter-aliases').first().locator('summary').click();
 const first=page.locator('.graphics-parameters .parameter-aliases').first();
 assert.equal(await first.getByRole('combobox',{name:'别名语言 / Alias language',exact:true}).first().inputValue(),'zh-CN');
 await first.getByRole('textbox',{name:'参数别名 / Parameter alias',exact:true}).nth(1).fill('Base radius');
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'导出创作文件',exact:true}).click();const download=await downloading;
 const exported=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(exported.parameters[0].aliases.en,'Base radius');assert.equal(exported.parameters[0].variable,'radius');
 // Alias language types also come from configuration, with duplicates disabled.
 assert.equal(await first.getByRole('textbox').count(),2);
 assert.equal(await first.getByRole('button',{name:'＋ 添加语言 / Add language',exact:true}).isDisabled(),true);
 assert.equal(await first.getByRole('combobox').first().locator('option[value=en]').isDisabled(),true);
 await first.locator('.parameter-alias-row button').nth(1).click();
 await first.getByRole('button',{name:'＋ 添加语言 / Add language',exact:true}).click();
 assert.equal(await first.getByRole('combobox').last().inputValue(),'en');
 await first.getByRole('textbox',{name:'参数别名 / Parameter alias',exact:true}).last().fill('Base radius');
 await page.waitForFunction(()=>document.querySelector('.graphic-preview-panel [role=status]')?.textContent.startsWith('预览成功'));
 await mkdir(new URL('../test-results/languages/',import.meta.url),{recursive:true});
 await page.screenshot({path:fileURLToPath(new URL(`../test-results/languages/${built?'built':'source'}-alias-editor.png`,import.meta.url))});
 await page.locator('dialog[open] .graphics-close').last().click();await page.locator('dialog[open] .graphics-close').last().click();
 await page.locator('#language-settings').selectOption('en');
 await page.screenshot({path:fileURLToPath(new URL(`../test-results/languages/${built?'built':'source'}-english-inspector.png`,import.meta.url))});
 const puzzle=project();puzzle.root.children=[node('shape','PuzzlePiece')];await page.goto(address+'#tree='+Buffer.from(JSON.stringify(puzzle)).toString('base64'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('[role=treeitem]').first().click();
 assert.deepEqual(await page.locator('[data-parameter-variable=topEdge] option').allTextContents(),['Socket','Flat edge','Tab']);
 // Multiselect uses the same language resolver and updates without changing selection.
 const batch=project();batch.root.children=[node('shape','Circle'),node('shape','Circle')];batch.root.children[0].name='A';batch.root.children[1].name='B';
 await page.goto(address+'#tree='+Buffer.from(JSON.stringify(batch)).toString('base64'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('[role=treeitem]').first().click();await page.locator('[role=treeitem]').nth(1).click({modifiers:['Control']});
 assert.equal(await page.locator('[data-parameter-variable=radius] > span').first().innerText(),'Radius');
 await page.locator('#language-settings').selectOption('zh-CN');assert.equal(await page.locator('[data-parameter-variable=radius] > span').first().innerText(),'半径');
 if(!built){const retained=await page.evaluate(async()=>{const {createAliasEditor}=await import('./alias-editor.js');const aliases={en:'Seed',ja:'種'},editor=createAliasEditor({variable:'seed',aliases});const before=JSON.stringify(editor.read()),options=[...editor.element.querySelector('select').options].map(option=>option.value);const input=editor.element.querySelector('input');input.value='Edited seed';input.dispatchEvent(new Event('input'));return {before,options,after:editor.read()};});assert.equal(retained.before,JSON.stringify({en:'Seed',ja:'種'}));assert.deepEqual(retained.options,['zh-CN','en']);assert.deepEqual(retained.after,{en:'Edited seed',ja:'種'});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({built,pass:true,checks:['configured language choices','persistent settings','invalid choice rejection','unchanged canvas/project/undo','user names','alias editor/export','option aliases','multiselect'],errors}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
