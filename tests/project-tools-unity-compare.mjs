import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

export async function compareUnityReference(base=resolve('test-results/project-tools')){
 const verification=JSON.parse(await readFile(resolve(base,'unity-validation.json'),'utf8'));
 assert.equal(verification.engineCompilation,'passed');
 const browser=await chromium.launch({headless:true});let metrics;
 try{
  const page=await browser.newPage();metrics=await page.evaluate(async entries=>{
   const images=[];for(const bytes of entries){const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'})),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);images.push({width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data});bitmap.close();}
   const [a,b]=images;if(a.width!==b.width||a.height!==b.height)throw Error('Reference dimensions differ');
   let rgbError=0,alphaError=0,intersection=0,union=0;for(let i=0;i<a.data.length;i+=4){const aa=a.data[i+3]/255,ba=b.data[i+3]/255;alphaError+=Math.abs(aa-ba);for(let c=0;c<3;c++)rgbError+=Math.abs(a.data[i+c]/255*aa-b.data[i+c]/255*ba);if(aa>.1&&ba>.1)intersection++;if(aa>.1||ba>.1)union++;}
   return {width:a.width,height:a.height,premultipliedRGBMeanAbsoluteError:rgbError/(a.data.length/4*3),alphaMeanAbsoluteError:alphaError/(a.data.length/4),coverageIoU:union?intersection/union:0};
  },await Promise.all(['reference/reference-preview.png','unity-reference.png'].map(async name=>[...await readFile(resolve(base,name))])));
 }finally{await browser.close();}
 // Compare visible color, not arbitrary RGB beneath fully transparent pixels. Allow AA/GPU differences.
 assert.ok(metrics.premultipliedRGBMeanAbsoluteError<.03,JSON.stringify(metrics));assert.ok(metrics.alphaMeanAbsoluteError<.02,JSON.stringify(metrics));assert.ok(metrics.coverageIoU>.9,JSON.stringify(metrics));
 const result={...verification,referenceComparison:{status:'passed',scope:'cross-hatch fill reference, not Rough.js editor contour parity',...metrics}};
 await writeFile(resolve(base,'unity-validation.json'),JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await compareUnityReference(),null,2));
