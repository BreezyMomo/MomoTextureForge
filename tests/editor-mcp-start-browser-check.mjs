import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {EDITOR_BRIDGE_ORIGIN,EDITOR_BRIDGE_PROTOCOL} from '../web/editor-bridge-protocol.js';

const out=resolve('test-results/editor-mcp-start');await mkdir(out,{recursive:true});
const reserve=createServer();await new Promise(done=>reserve.listen(0,'127.0.0.1',done));const port=reserve.address().port;await new Promise(done=>reserve.close(done));
const origin='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['serve.mjs','--port',String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let browser,client,stderr='';child.stderr.on('data',b=>stderr+=b);
const checks=[];
const health=()=>fetch(EDITOR_BRIDGE_ORIGIN+'/health',{signal:AbortSignal.timeout(1500)}).then(r=>r.json()).catch(()=>null);
try{
 await new Promise((done,fail)=>{let text='';const timer=setTimeout(()=>fail(Error('Development server startup timed out')),15000);child.stdout.on('data',b=>{text+=b;if(text.includes(origin)){clearTimeout(timer);done();}});child.once('exit',code=>{clearTimeout(timer);fail(Error('Development server exited '+code));});});
 assert.equal(await health(),null,'Run this test without a helper already listening on port 8798.');
 for(const headers of [{Origin:'https://evil.example','Content-Type':'application/json'},{Origin:origin,'Content-Type':'text/plain'},{}]){
  assert.equal((await fetch(origin+'/api/editor-mcp/start',{method:'POST',headers,body:'{}'})).status,403);
 }
 assert.equal(await health(),null);checks.push('service stays off until an allowed local page explicitly requests startup');
 browser=await chromium.launch({headless:true});const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#language-settings').selectOption('en');
 await page.locator('#ai-tools').click();await page.locator('[data-connection-open]').click();
 const dialog=page.locator('.editor-ai-dialog');await dialog.locator('[data-connect]').click();await page.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected==='true');
 assert.equal((await health()).protocol,EDITOR_BRIDGE_PROTOCOL);
 const config=JSON.parse(await dialog.locator('textarea').inputValue()).mcpServers['texture-forge'];
 client=new Client({name:'startup-regression',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL(config.url),{requestInit:{headers:config.headers}}));
 const pages=()=>client.callTool({name:'forge_pages',arguments:{}}).then(r=>r.structuredContent.pages);
 const first=(await pages())[0].pageId;
 // Concurrent repeated start requests reuse the running shared service.
 const starts=await Promise.all([1,2,3].map(()=>fetch(origin+'/api/editor-mcp/start',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'})));for(const response of starts)assert.equal(response.status,200);
 assert.equal((await pages())[0].pageId,first);checks.push('web button launches shared HTTP service; repeated startup preserves registered pages');
 await dialog.locator('[data-disconnect]').click();await page.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected==='false');assert.equal((await pages()).length,0);
 // Simulate an unavailable helper/backend and verify useful recovery UI.
 await page.route('**/api/editor-mcp/start',route=>route.abort());await page.route(EDITOR_BRIDGE_ORIGIN+'/**',route=>route.abort());
 await dialog.locator('[data-connect]').click();await dialog.locator('[role=alert]').filter({hasText:'Cannot reach'}).waitFor();assert.equal(await dialog.locator('[data-setup]').evaluate(e=>e.open),true);assert.equal(await dialog.locator('[data-connect]').isEnabled(),true);
 await page.unroute('**/api/editor-mcp/start');await page.unroute(EDITOR_BRIDGE_ORIGIN+'/**');
 await dialog.locator('[data-connect]').click();await page.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected==='true');assert.notEqual((await pages())[0].pageId,first);
 assert.deepEqual(JSON.parse(await dialog.locator('textarea').inputValue()).mcpServers['texture-forge'],config);
 checks.push('helper failure shows startup instructions and supports retry without replacing shared credentials');
 await page.goto('about:blank');assert.equal((await pages()).length,0);checks.push('leaving the page revokes its access');assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify({ok:true,checks},null,2)+'\n');console.log({ok:true,checks});
}finally{
 await client?.close();await browser?.close();child.kill();await new Promise(done=>child.exitCode!==null?done():child.once('exit',done));
}
assert.equal(stderr,'');
