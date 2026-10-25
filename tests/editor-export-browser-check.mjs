import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runProjectBrowser} from '../project-cli.mjs';
import {project} from '../web/tree-model.js';
import {encodeResourcePack} from '../web/resource-pack.js';
import {decodeZIP} from '../web/resource-zip.js';

const p=project();Object.assign(p.output,{width:64,height:64,seconds:1,exportSeconds:1,loopExport:true,fps:2,frames:2,columns:2,depth:8});
const input={zip:Buffer.from(await encodeResourcePack(p)).toString('base64')},directory=resolve('test-results/editor-export');await mkdir(directory,{recursive:true});
const reports=[];
for(const format of ['png','exr','frames','atlas','atlas-exr','batch','batch-atlas','gif','psd','psd-vector','svg']){
 const result=await runProjectBrowser('runProjectTool',{action:'export',input,options:{format,seconds:.25,smooth:false}},120000);
 assert.equal(result.ok,true,result.error);const bytes=Buffer.from(result.data,'base64');assert.ok(bytes.length>20);
 if(result.extension==='png')assert.equal(bytes.subarray(1,4).toString(),'PNG');
 if(result.extension==='exr')assert.equal(bytes.readUInt32LE(0),20000630);
 if(result.extension==='gif')assert.match(bytes.subarray(0,6).toString(),/^GIF8[79]a$/);
 if(result.extension==='psd')assert.equal(bytes.subarray(0,4).toString(),'8BPS');
 if(result.extension==='svg')assert.ok(bytes.toString().startsWith('<svg'));
 if(result.extension==='zip'){const files=await decodeZIP(bytes);assert.equal(files.size,format==='frames'?2:3);}
 await writeFile(resolve(directory,format+'.'+result.extension),bytes);reports.push({format,bytes:bytes.length});console.log(JSON.stringify(reports.at(-1)));
}
p.output.depth=16;const high=await runProjectBrowser('runProjectTool',{action:'export',input:{zip:Buffer.from(await encodeResourcePack(p)).toString('base64')},options:{format:'png'}},120000);assert.equal(high.ok,true,high.error);assert.equal(Buffer.from(high.data,'base64')[24],16);
await writeFile(resolve(directory,'report.json'),JSON.stringify({passed:true,reports,png16:true},null,2));
