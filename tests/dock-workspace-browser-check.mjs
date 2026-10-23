import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {project,node} from '../web/tree-model.js';
import {LAYOUT_KEY} from '../web/dock-layout.js';

const standalone=process.argv.includes('--standalone'),root=resolve('web');
const server=createServer(async(req,res)=>{
 try{const path=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))throw Error('Invalid path');res.setHeader('Content-Type',standalone?'text/html':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.glsl':'text/plain','.css':'text/css'})[extname(file)]??'application/octet-stream');res.end(await readFile(standalone?'site/index.html':file));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const p=project();p.name='布局拖动验收';const star=node('shape','Star');star.name='测试星形';p.root.children=[star];
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));
 await page.getByRole('tab',{name:'画布预览',exact:true}).waitFor();
 await page.getByRole('button',{name:'选择 测试星形',exact:true}).click();
 await page.getByRole('button',{name:'变换/排列',exact:true}).click();await page.getByRole('spinbutton',{name:'区域宽',exact:true}).fill('0.65');await page.getByRole('spinbutton',{name:'区域宽',exact:true}).press('Tab');
 const frame=async()=>{await page.waitForFunction(()=>!document.querySelector('.dock-motion'));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LAYOUT_KEY);
 const stack=id=>page.locator('.dock-stack').filter({has:page.locator(`[data-panel-tab="${id}"]`)}).first();
 const menu=page.locator('#workspace-layout-menu');const openMenu=async()=>{if(!await menu.evaluate(e=>e.open))await menu.locator('summary').click();const box=await menu.locator('.header-dropdown-panel').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=page.viewportSize().width,'layout menu remains inside the viewport');};
 const drag=async(id,to,{alt=false}={})=>{
  const from=await page.locator(`[data-panel-tab="${id}"]`).boundingBox();await page.mouse.move(from.x+from.width/2,from.y+from.height/2);if(alt)await page.keyboard.down('Alt');await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();if(alt)await page.keyboard.up('Alt');await frame();
 };
 const point=async(locator,x=.5,y=.5)=>{const r=await locator.boundingBox();return {x:r.x+r.width*x,y:r.y+r.height*y};};
 const assertCanvas=async()=>{await frame();assert.ok(await page.locator('#tree-canvas').isVisible());assert.ok((await page.locator('#tree-canvas').boundingBox()).height>60);assert.equal(await page.locator('#preview-error').isVisible(),false);assert.equal(await page.locator('#project-name').inputValue(),p.name);assert.match(await page.locator('#selected-heading').innerText(),/测试星形/);};
 await assertCanvas();await mkdir('test-results/docking',{recursive:true});await page.screenshot({path:'test-results/docking/default.png'});
 const assertDefaultColumns=async()=>{await frame();
  const ids=['library','nodes','canvas','inspector'],boxes=await Promise.all(ids.map(id=>stack(id).boundingBox()));
  for(let i=1;i<boxes.length;i++){assert.ok(boxes[i].x>=boxes[i-1].x+boxes[i-1].width,'four panels are ordered left to right');assert.ok(Math.abs(boxes[i].y-boxes[0].y)<1);assert.ok(Math.abs(boxes[i].height-boxes[0].height)<1);}
  const width=await page.locator('.dock-workspace').evaluate(e=>e.clientWidth);
  for(const [i,expected]of [.154,.126,.4968,.2232].entries())assert.ok(Math.abs(boxes[i].width/width-expected)<.015);
 };
 await assertDefaultColumns();await page.setViewportSize({width:2448,height:1276});await frame();await assertDefaultColumns();
 await page.screenshot({path:`test-results/docking/${standalone?'built-':''}default-four-columns.png`});await page.setViewportSize({width:1600,height:1000});await frame();
 await drag('library',await point(stack('inspector')));assert.equal(await stack('inspector').getByRole('tab').count(),2);assert.equal(await page.locator('#shape-search').isVisible(),true);
 await page.getByRole('tab',{name:'参数面板',exact:true}).click();assert.equal(await page.locator('#inspector').isVisible(),true);
 await drag('library',await point(stack('canvas'),.5,.9));assert.equal(await stack('inspector').getByRole('tab').count(),1);assert.equal(await page.locator('.dock-split-y').count(),1);
 await page.getByRole('button',{name:'悬浮图形列表',exact:true}).click();assert.equal(await page.locator('.dock-floating').count(),1);
 const win=page.locator('.dock-floating'),before=await win.boundingBox(),grip=await win.getByRole('button',{name:'移动悬浮窗口'}).boundingBox();
 await frame();
 const tabs=await win.locator('.dock-tabs').boundingBox(),body=await win.locator('.dock-panel-body:not([hidden])').boundingBox(),corner=await win.locator('.dock-window-resize').boundingBox();
 assert.ok(grip.x+grip.width<=tabs.x,'window move grip has its own title-bar space');
 assert.ok(body.y+body.height<=corner.y,'resize grip stays below the scrolling content');
 assert.ok(corner.width>=24&&corner.height>=24,'resize grip has a usable pointer target');
 await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();await page.mouse.move(grip.x+60,grip.y+60,{steps:8});await page.mouse.up();assert.ok((await win.boundingBox()).x>before.x+30);
 const resize=await win.getByRole('button',{name:'调整悬浮窗口大小'}).boundingBox(),width=(await win.boundingBox()).width;
 await page.mouse.move(resize.x+3,resize.y+3);await page.mouse.down();await page.mouse.move(resize.x+75,resize.y+35,{steps:8});await page.mouse.up();assert.ok((await win.boundingBox()).width>width+40);
 await drag('library',await point(stack('nodes')));assert.equal(await page.locator('.dock-floating').count(),0);assert.equal(await stack('nodes').getByRole('tab').count(),2);
 const separator=page.getByRole('separator',{name:'调整面板宽度',exact:true}).first(),splitBefore=await separator.getAttribute('aria-valuenow');await separator.focus();await page.keyboard.press('ArrowRight');assert.notEqual(await page.getByRole('separator',{name:'调整面板宽度',exact:true}).first().getAttribute('aria-valuenow'),splitBefore);
 await page.locator('#open-docked-timeline').click();assert.ok(await page.getByRole('tab',{name:'时间轴',exact:true}).isVisible());assert.ok(await page.locator('#animation-panel').isVisible());
 await page.getByRole('button',{name:'关闭参数面板',exact:true}).click();await openMenu();await menu.getByRole('checkbox',{name:'显示参数面板',exact:true}).check();await menu.locator('summary').click();await assertCanvas();
 // The render canvas is moved, not replaced; material context and live controls survive.
 await page.locator('#preview-mode').selectOption('material');await page.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('材质采样'));
 await page.getByRole('button',{name:'悬浮画布预览',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#material-preview canvas')?.width>0);assert.ok(await page.locator('#material-preview canvas').isVisible());
 await page.locator('#preview-mode').selectOption('canvas');await assertCanvas();
 await openMenu();await menu.getByRole('textbox',{name:'布局名称',exact:true}).fill('我的工作台');await menu.getByRole('button',{name:'保存当前布局',exact:true}).click();const expected=(await stored()).current;const draft=await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1'));
 await page.evaluate(()=>history.replaceState(null,'',location.pathname));await page.reload();await page.getByRole('tab',{name:'画布预览',exact:true}).waitFor();assert.deepEqual((await stored()).current,expected);await page.getByRole('tab',{name:'节点树',exact:true}).click();await page.getByRole('button',{name:'选择 测试星形',exact:true}).click();await assertCanvas();
 await openMenu();await menu.getByRole('button',{name:'专注画布',exact:true}).click();assert.equal(await page.getByRole('tab').count(),1);await openMenu();await menu.getByRole('button',{name:'应用布局',exact:true}).click();assert.deepEqual((await stored()).current,expected);await menu.locator('summary').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),draft,'layout operations leave project state alone');
 // Actual PNG export still works after docking and restoration.
 await page.locator('#export-now').click();const downloading=page.waitForEvent('download');await page.locator('#confirm-export').click();const download=await downloading;assert.equal(await download.failure(),null);assert.deepEqual([...((await readFile(await download.path())).subarray(0,8))],[137,80,78,71,13,10,26,10]);await page.locator('#close-global').click();
 await openMenu();await menu.getByRole('button',{name:'动画布局',exact:true}).click();await page.screenshot({path:'test-results/docking/animation.png'});
 await page.setViewportSize({width:900,height:700});await assertCanvas();await page.setViewportSize({width:1600,height:1000});
 await openMenu();await menu.getByRole('button',{name:'恢复默认布局',exact:true}).click();assert.equal(await page.getByRole('tab').count(),4);await assertDefaultColumns();await assertCanvas();assert.deepEqual(errors,[]);
 console.log({standalone,dragDockMerge:true,floatMoveResize:true,saveReload:true,projectUnchanged:true,material:true,png:true,errors});
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
