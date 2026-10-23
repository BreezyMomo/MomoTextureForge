import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {node,project} from '../web/tree-model.js';
const built=process.argv.includes('--built'),root=resolve('web'),out=resolve('test-results/effect-previews');await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname,file=built?resolve('site/index.html'):resolve(root,'.'+(path==='/'?'/index.html':path));if(!built&&!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',built?'text/html':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.glsl':'text/plain','.css':'text/css'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const origin='http://127.0.0.1:'+server.address().port;
 if(!built){
  await page.goto(origin+'/authoring-render.html');
  const gpu=await page.evaluate(async()=>{
   const {createPostEffectPreview}=await import('./post-effect-preview.js'),{POST_EFFECTS}=await import('./post-effect-specs.js'),{resources}=await import('./resource-assets.js'),{CATALOG}=await import('./catalog.js');
   const sizes=[resources.size,CATALOG.length],preview=createPostEffectPreview(document),metrics={},gallery=document.createElement('canvas');gallery.width=384*4;gallery.height=268*Math.ceil(POST_EFFECTS.length/4);const ctx=gallery.getContext('2d');
   const difference=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs((i%4===3?v:v*a[i-i%4+3]/255)-(i%4===3?b[i]:b[i]*b[i-i%4+3]/255)),0)/(a.length*255);
   try{
    for(const [i,spec]of POST_EFFECTS.entries()){
     const data=preview.pair(spec.id),change=difference(data.before.data,data.after.data);if(change<.0001)throw Error(spec.id+' has no visible difference: '+change);metrics[spec.id]=change;
     if(!data.after.data.some((v,i)=>i%4===3&&v>30))throw Error(spec.id+' is blank');
     const tile=document.createElement('canvas');tile.width=384;tile.height=240;const t=tile.getContext('2d');t.putImageData(data.before,0,0);t.putImageData(data.after,0,0,192,0,192,240);
     const x=(i%4)*384,y=Math.floor(i/4)*268;ctx.fillStyle='#122333';ctx.fillRect(x,y,384,268);ctx.drawImage(tile,x,y);ctx.fillStyle='#f1e6d1';ctx.font='14px sans-serif';ctx.fillText(spec.id,x+12,y+258);ctx.fillStyle='#fff8';ctx.fillRect(x+192,y,1,240);
    }
    const frozen=preview.pair('dissolve');if(difference(frozen.after.data,preview.pair('dissolve').after.data)>0)throw Error('Idle preview is unstable');
    for(const id of ['dissolve','shockwave','liquidFusion','noiseWarp','glitch'])if(difference(preview.pair(id,.2).after.data,preview.pair(id,1.4).after.data)<.0001)throw Error(id+' motion is static');
    if(sizes[0]!==resources.size||sizes[1]!==CATALOG.length)throw Error('Preview modified the resource registry');
    return {metrics,gallery:gallery.toDataURL('image/png')};
   }finally{preview.destroy();}
  });
  await writeFile(out+'/artwork-comparisons.png',Buffer.from(gpu.gallery.split(',')[1],'base64'));await writeFile(out+'/render-metrics.json',JSON.stringify(gpu.metrics,null,2));
 }
 const p=project(),n=node('shape','Circle');p.root.children=[n];n.effectPresence.glitch=false;n.postEffects.glitch.displacement=99;
 await page.goto(origin+'/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#node-tree .tree-node-name').first().click();await page.locator('#inspector-tabs').getByRole('button',{name:'合成',exact:true}).click();
 const panel=page.locator('#inspector [data-module="modules.imageFilters"]');if(await panel.getAttribute('open')===null)await panel.locator(':scope>summary .inspector-module-title').click();
 const before=await page.evaluate(()=>({draft:localStorage.getItem('momo-texture-tree:draft:v1'),hash:location.hash,undo:document.querySelector('#undo').disabled}));await panel.locator('.post-effects-add').click();const picker=page.locator('.post-effect-picker'),card=id=>picker.locator('[data-effect-choice='+id+']');
 await card('blur').locator('input[type=range]:enabled').waitFor();
 const hash=locator=>locator.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.reduce((sum,v,i)=>(sum+v*(i%997+1))%2147483647,0));
 const slider=card('blur').getByRole('slider');await slider.focus();await slider.press('End');const original=await hash(card('blur'));await slider.press('Home');assert.notEqual(await hash(card('blur')),original);
 const image=await card('blur').locator('.post-effect-choice-image').boundingBox();await page.mouse.move(image.x+image.width*.2,image.y+image.height*.5);await page.mouse.down();await page.mouse.move(image.x+image.width*.8,image.y+image.height*.5,{steps:4});await page.mouse.up();assert.ok(Number(await slider.inputValue())>=78);
 await picker.locator('header strong').hover();await picker.getByRole('searchbox').fill('dissolve');await card('dissolve').locator('input:enabled').waitFor();const idle=await hash(card('dissolve'));await card('dissolve').locator('.post-effect-choice-image').hover();await page.waitForFunction(()=>document.querySelector('[data-effect-choice=dissolve] [data-animating=true]'));await page.waitForTimeout(400);assert.notEqual(await hash(card('dissolve')),idle);
 await picker.locator('header strong').hover();await page.waitForFunction(()=>document.querySelector('[data-effect-choice=dissolve] [data-animating=false]'));assert.equal(await hash(card('dissolve')),idle);
 await picker.locator('.post-effect-picker-filters select').focus();await page.keyboard.press('Tab');await page.waitForFunction(()=>document.querySelector('[data-effect-choice=dissolve] [data-animating=true]'));await page.keyboard.press('Shift+Tab');await page.waitForFunction(()=>document.querySelector('[data-effect-choice=dissolve] [data-animating=false]'));
 await page.emulateMedia({reducedMotion:'reduce'});await card('dissolve').locator('.post-effect-choice-image').hover();assert.equal(await card('dissolve').locator('.post-effect-choice-image').getAttribute('data-animating'),'false');
 assert.deepEqual(await page.evaluate(()=>({draft:localStorage.getItem('momo-texture-tree:draft:v1'),hash:location.hash,undo:document.querySelector('#undo').disabled})),before);
 await picker.getByRole('searchbox').fill('glitch');await card('glitch').getByRole('button').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')));assert.equal(saved.root.children[0].postEffects.glitch.displacement,99);await picker.getByRole('button',{name:'关闭',exact:true}).click();
 await page.locator('#language-settings').selectOption('en');await panel.locator('.post-effects-add').click();await picker.getByRole('searchbox').fill('blur');await card('blur').locator('input:enabled').waitFor();assert.equal(await card('blur').getByRole('slider',{name:'Compare before and after Gaussian blur',exact:true}).count(),1);assert.ok(!/[\u3400-\u9fff]/.test(await picker.innerText()));
 await page.setViewportSize({width:320,height:900});await page.waitForFunction(()=>{const e=document.querySelector('.post-effect-picker');return e&&e.getBoundingClientRect().right<=innerWidth;});assert.equal(await picker.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);await page.keyboard.press('Escape');await picker.waitFor({state:'detached'});assert.deepEqual(errors,[]);
 console.log({built,pass:true,comparison:true,pointer:true,motion:true,reducedMotion:true,isolated:true,settingsPreserved:true,english:true,narrow:true});
}finally{await browser?.close();await new Promise(r=>server.close(r));}
