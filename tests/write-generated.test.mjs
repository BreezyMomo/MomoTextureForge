import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,readdir,stat,utimes} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeGenerated} from '../tools/write-generated.mjs';

test('generated output accepts paths and file URLs on a clean build and preserves unchanged files',async()=>{
 await mkdir('test-results/write-generated',{recursive:true});
 const root=await mkdtemp(resolve('test-results/write-generated/build-'));
 for(const kind of ['path','url']){
  const path=resolve(root,kind,'新文件 space','runtime.js'),target=kind==='url'?pathToFileURL(path):path;
  await writeGenerated(target,'first\n');assert.equal(await readFile(path,'utf8'),'first\n');
  const timestamp=new Date('2020-01-01T00:00:00Z');await utimes(path,timestamp,timestamp);const before=(await stat(path)).mtimeMs;
  await writeGenerated(target,Buffer.from('first\n'));assert.equal((await stat(path)).mtimeMs,before);
  await writeGenerated(target,'second\n');assert.equal(await readFile(path,'utf8'),'second\n');
  assert.deepEqual(await readdir(dirname(path)),['runtime.js']);
 }
});
