// Exercise an opaque imported image: internal brightness, not just its silhouette, must generate normals.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const url=process.argv[2]??'http://127.0.0.1:8799/';
await mkdir('test-results/normal-preview',{recursive:true});
for(const channel of ['chrome','msedge']){
 const browser=await chromium.launch({channel,headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  const pack=await page.evaluate(async()=>{
   const {encodePNG}=await import('./encoders.js'),{imageAsset,encodeResourcePack}=await import('./resource-pack.js'),{registerAsset,prepareAsset}=await import('./resource-assets.js'),{project,node}=await import('./tree-model.js');
   const size=128,pixels=new Float32Array(size*size*4);
   for(let y=0;y<size;y++)for(let x=0;x<size;x++){const offset=(y*size+x)*4,v=.1+.85*Math.exp(-((x-64)**2+(y-64)**2)/700);pixels.set([v,v,v,1],offset);}
   const png=await encodePNG(pixels,size,size),asset=await imageAsset(new File([png],'亮度测试.png',{type:'image/png'})),id='asset_normal_preview';
   registerAsset(id,asset,await prepareAsset(asset));const p=project();p.root.children=[node('shape',id)];
   const bytes=await encodeResourcePack(p,{assets:[[id,asset]]});let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
  });
  await page.locator('#project-file').setInputFiles({name:'亮度测试.zip',mimeType:'application/zip',buffer:Buffer.from(pack,'base64')});
  await page.waitForFunction(()=>document.querySelector('#node-tree').textContent.includes('亮度测试'));
  const selector=page.getByRole('combobox',{name:'预览贴图类型',exact:true});
  const pixels=()=>page.locator('#tree-canvas').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return Array.from(data);});
  const waitFrame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await selector.selectOption('height');await waitFrame();
  const height=await pixels(),values=height.filter((_,i)=>i%4===0);assert.ok(Math.max(...values.slice(0,100))<100);
  assert.ok(values.some(v=>v>200),'image brightness must reach the height buffer');
  assert.ok(values.some(v=>v<60),'opaque image must not become constant white height');
  await selector.selectOption('normal');await waitFrame();
  const normal=await pixels();assert.ok(normal.some((v,i)=>i%4===0&&Math.abs(v-128)>10),'brightness gradients must produce varying normals');
  const settings=page.locator('#normal-preview-settings');
  await page.locator('.tree-preview').screenshot({path:'test-results/normal-preview/'+channel+'-2d.png'});
  const strength=()=>settings.getByRole('spinbutton',{name:'法线强度',exact:true});
  await strength().fill('0');await strength().press('Tab');await waitFrame();
  const zero=await pixels();assert.ok(zero.every((v,i)=>i%4<2?Math.abs(v-127.5)<=.5:v===255),'zero strength must produce a flat normal map');
  await page.locator('#undo').click();await waitFrame();assert.deepEqual(await pixels(),normal,'undo must restore generated normals');
  await settings.getByRole('checkbox',{name:'翻转法线 X',exact:true}).check();await waitFrame();
  const flipped=await pixels();for(let i=0;i<normal.length;i+=4){assert.ok(Math.abs(normal[i]+flipped[i]-255)<=1);assert.equal(normal[i+1],flipped[i+1]);assert.equal(normal[i+2],flipped[i+2]);}
  await settings.getByRole('combobox',{name:'法线算法',exact:true}).selectOption('scharr');
  await settings.getByRole('spinbutton',{name:'法线预平滑',exact:true}).fill('2');await settings.getByRole('spinbutton',{name:'法线预平滑',exact:true}).press('Tab');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')).output.mode),'color');
  const exportPNG=async(mode)=>{await page.locator('#export-now').click();const modal=page.locator('#global-panel');if(mode)await modal.getByRole('combobox',{name:'输出内容',exact:true}).selectOption(mode);const pending=page.waitForEvent('download');await page.locator('#confirm-export').click();const file=await pending;assert.equal(await file.failure(),null);const bytes=await readFile(await file.path());await page.locator('#close-global').click();return bytes;};
  const colorPNG=await exportPNG();await selector.selectOption('color');assert.deepEqual(await exportPNG(),colorPNG,'preview channel must not change export');
  await selector.selectOption('normal');const normalPNG=await exportPNG('normal');assert.notDeepEqual(normalPNG,colorPNG,'explicit normal export must contain generated normals');
  const exportedDifference=await page.evaluate(async encoded=>{
   const {TreeRenderer}=await import('./tree-renderer.js'),p=JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')),renderer=new TreeRenderer(document.createElement('canvas'));
   const blob=new Blob([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],{type:'image/png'}),bitmap=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);const exported=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   try{const expected=renderer.draw(p,canvas.width,canvas.height,{read:true});return expected.reduce((sum,v,i)=>sum+Math.abs(Math.round(Math.max(0,Math.min(1,v))*255)-exported[i]),0)/expected.length;}finally{renderer.destroy();bitmap.close();}
  },normalPNG.toString('base64'));
  assert.ok(exportedDifference<=1,'normal export must use the saved generation parameters: '+exportedDifference);
  await page.getByRole('combobox',{name:'预览模式',exact:true}).selectOption('material');await page.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('材质采样'));
  await page.locator('.tree-preview').screenshot({path:'test-results/normal-preview/'+channel+'-3d.png'});
  assert.equal(await page.locator('#preview-error').isVisible(),false);assert.deepEqual(errors,[]);
  console.log({channel,imageBrightness:true,normalStrength:true,normalFlip:true,undo:true,exportIndependent:true,normalExport:true,material:true,errors});
 }finally{await browser.close();}
}
