import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const address=process.argv[2]??'http://127.0.0.1:8799/';
const output=resolve('test-results/builtin-release');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(new URL('authoring-render.html',address).href);
 const seamless=await page.evaluate(async()=>{
  const {Renderer}=await import('./renderer.js'),{checkSeamless}=await import('./gpu-seamless.js');
  const renderer=new Renderer(document.createElement('canvas'));
  try{return await checkSeamless(renderer);}finally{renderer.dispose();renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();}
 });
 await writeFile(resolve(output,'seamless.json'),JSON.stringify(seamless,null,2));
 assert.ok(seamless.every(c=>c.passed),JSON.stringify(seamless));
 await page.goto(new URL('visual-fix-validation.html',address).href);
 await page.locator('#run').click();
 await page.waitForFunction(()=>/"status": "(?:PASS|FAIL)"/.test(document.getElementById('result').textContent),null,{timeout:120000});
 const shapes=JSON.parse(await page.locator('#result').innerText());assert.equal(shapes.status,'PASS',JSON.stringify(shapes));
 await page.goto(new URL('export-worker-validation.html',address).href);
 await page.waitForFunction(()=>/全部通过|FAIL/.test(document.getElementById('result').textContent),null,{timeout:120000});
 const exports=await page.locator('#result').innerText();assert.ok(exports.includes('全部通过'),exports);
 await page.goto(pathToFileURL(resolve('dist/MomoTextureForge.html')).href);
 await page.waitForFunction(()=>document.documentElement.dataset.ready==='true',null,{timeout:120000});
 await page.locator('#open-graphics-library').click();
 await page.locator('.graphics-card[data-origin="builtin"]').first().waitFor();
 assert.equal(await page.locator('.graphics-card[data-origin="builtin"]').count(),284);
 await page.screenshot({path:resolve(output,'standalone-library.png')});
 assert.deepEqual(errors,[]);
 const report={seamless,shapes,exports,standalone:{builtins:284,offline:true},pageErrors:errors};
 await writeFile(resolve(output,'smoke.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
