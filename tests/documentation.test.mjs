import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDocumentation} from '../tools/check-docs.mjs';
import {documentationLanguage,documentationFile,documentationURL,repositoryURL} from '../web/documentation-links.js';
import {readFile} from 'node:fs/promises';

test('all maintained Markdown editions link to existing documents and anchors in the same language',async()=>{
 const result=await checkDocumentation();assert.ok(result.pairs>=45);assert.equal(result.files,result.pairs*2);assert.ok(result.localLinks>200);
});
test('documentation uses Chinese only for the Chinese UI and English for every other language',()=>{
 assert.equal(documentationLanguage('zh-CN'),'zh-CN');
 assert.equal(documentationFile('README.md','zh-CN'),'README.md');assert.equal(documentationFile('README.en.md','zh-CN'),'README.md');
 for(const host of ['github.com','gitee.com']){
  const base='https://'+host+'/BreezyMomo/MomoTextureForge';assert.equal(repositoryURL(base,'zh-CN'),base);assert.equal(repositoryURL(base,'en'),base+'/blob/main/README.en.md');
 }
 for(const language of ['en','fr','ja','zh-TW','',undefined]){
  assert.equal(documentationLanguage(language),'en');assert.equal(documentationFile('README.md',language),'README.en.md');
  assert.equal(documentationFile('docs/README.en.md',language),'docs/README.en.md');
  assert.equal(documentationURL('docs/01-quick-start.md',language),'https://github.com/BreezyMomo/MomoTextureForge/blob/main/docs/01-quick-start.en.md');
 }
});
test('generated English arrangement ranges retain numeric values and use English labels',async()=>{
 const [zh,en]=await Promise.all(['layout-parameters.md','layout-parameters.en.md'].map(name=>readFile(new URL('../skills/texture-forge-effects/references/'+name,import.meta.url),'utf8')));
 const ranges=text=>text.split('\n').filter(row=>/^\| .+ \| [\d.-]+ \| [\d.-]+ \| [\d.-]+ \| [\d.-]+ \|$/.test(row)).map(row=>row.split('|').slice(2,-1).map(s=>s.trim()));
 assert.ok(ranges(en).length>40);assert.deepEqual(ranges(en),ranges(zh));assert.ok(!/[\u3400-\u9fff]/.test(en.replace(/<!-- doc-language -->[\s\S]*?<!-- \/doc-language -->/,'')));
});
