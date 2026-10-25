import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
const root=resolve('.'),built=process.argv.includes('--built');
await mkdir('test-results/dialog-scroll',{recursive:true});
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname,file=resolve(root,built?'site/index.html':'web/'+(path==='/'?'index.html':path.slice(1)));if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',built?'text/html':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain','.svg':'image/svg+xml'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true}),checks=[];
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function verify(dialog,body,label){
  const header=dialog.locator(':scope>header'),before=await header.boundingBox();
  await body.evaluate(e=>e.scrollTop=e.scrollHeight);const after=await header.boundingBox();
  assert.ok(Math.abs(after.y-before.y)<1,label+' header must not scroll');assert.ok(after.y>=0&&after.y+after.height<=page.viewportSize().height,label+' header in viewport');
  const close=header.locator('button').last();assert.ok(await close.isVisible());
  const bounds=await dialog.boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=page.viewportSize().height+1,label+' fits viewport');
  assert.ok(await dialog.evaluate(e=>e.scrollHeight<=e.clientHeight+1),label+' outer window must not scroll');
  const last=body.locator('button:visible,input:visible,select:visible,textarea:visible').last();if(await last.count()){await last.focus();const r=await last.boundingBox(),b=await body.boundingBox();assert.ok(r.y>=b.y-1&&r.y+r.height<=b.y+b.height+1,label+' focused control unobscured');}
  checks.push(label);
 }
 for(const [width,height,language]of [[1440,900,'zh-CN'],[390,650,'en'],[900,400,'zh-CN']]){
  const open=async selector=>{await page.setViewportSize({width:1440,height:900});await page.locator(selector).click();await page.setViewportSize({width,height});};
  await page.setViewportSize({width:1440,height:900});await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#language-settings').selectOption(language);
  await open('#export-now');await page.locator('#global-controls select').first().selectOption('gif');
  const panel=page.locator('#global-panel>section');await verify(panel,page.locator('#global-controls'),'export '+width);
  const button=await page.locator('#confirm-export').boundingBox(),footer=await page.locator('#global-actions').boundingBox();assert.ok(button.y>=footer.y&&button.y+button.height<=footer.y+footer.height+1);
  await page.screenshot({path:`test-results/dialog-scroll/${built?'built':'source'}-export-${width}.png`});await page.locator('#close-global').click();
  await open('#project-settings');await verify(panel,page.locator('#global-controls'),'canvas settings '+width);assert.equal(await page.locator('#global-actions').isVisible(),false);await page.locator('#close-global').click();
  await open('#ai-tools');await verify(page.locator('.ai-tools-dialog'),page.locator('.ai-tools-dialog>.dialog-scroll-body'),'AI tools '+width);
  await page.locator('.ai-tools-dialog [data-connection-open]').click();await verify(page.locator('.editor-ai-dialog'),page.locator('.editor-ai-dialog>.dialog-scroll-body'),'MCP '+width);await page.locator('.editor-ai-dialog [data-close]').click();
  await open('#appearance-settings');await verify(page.locator('.appearance-dialog'),page.locator('.appearance-dialog>.dialog-scroll-body'),'appearance '+width);await page.locator('.appearance-dialog [data-cancel]').click();
  await open('#support-project');await verify(page.locator('.support-dialog'),page.locator('.support-dialog>.dialog-scroll-body'),'support '+width);await page.locator('.support-dialog>header button').click();
  const words=JSON.parse(await readFile('web/locales/'+language+'.json','utf8'));
  await open('#open-graphics-library');await page.locator('.graphics-management>summary').click();await page.locator('.graphics-library-dialog').getByRole('button',{name:words['library.remoteLibraries'],exact:true}).click();
  await verify(page.locator('.remote-library-dialog'),page.locator('.remote-library-dialog>.graphics-body'),'subscriptions '+width);await page.locator('.remote-library-dialog .graphics-close').click();
  await page.locator('.graphics-library-dialog').getByRole('button',{name:words['library.createResource'],exact:true}).click();await verify(page.locator('.resource-create-dialog'),page.locator('.resource-create-dialog>.graphics-body'),'resource editor '+width);await page.locator('.resource-create-dialog .graphics-close').click();await page.locator('.graphics-library-dialog .graphics-close').click();
 }
 await page.goto('about:blank');const draft=project();draft.root.children=[node('shape','BezierRibbon')];await page.setViewportSize({width:1440,height:900});await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(draft)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#language-settings').selectOption('zh-CN');await page.locator('[role=treeitem]').first().click();await page.locator('#inspector').getByRole('button',{name:'放大编辑',exact:true}).click();await page.setViewportSize({width:900,height:400});await verify(page.locator('.bezier-editor-dialog'),page.locator('.bezier-editor-dialog>.bezier-editor-panel'),'Bezier editor');await page.locator('.bezier-editor-dialog>header button').click();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({built,checks,errors}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
