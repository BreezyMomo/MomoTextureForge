import {messageError,serializeMessageError} from '../web/message-catalog.js';
import {uiError} from '../web/ui-language.js';
import {setLanguage} from '../web/language.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runExportWorker} from '../web/export-job.js';
class FakeWorker {
 static latest;
 constructor(){FakeWorker.latest=this;this.messages=[];this.terminated=false;}
 postMessage(data){this.messages.push(data);}
 terminate(){this.terminated=true;}
 emit(data){return this.onmessage({data});}
}
test('export waits for worker readiness, reports stages and releases worker on completion',async t=>{
 const previous=globalThis.Worker;globalThis.Worker=FakeWorker;t.after(()=>{if(previous)globalThis.Worker=previous;else delete globalThis.Worker;});
 const stages=[],task=runExportWorker('encode-zip',{entries:[]},{},{stage:s=>stages.push(s)}),w=FakeWorker.latest;
 assert.equal(w.messages.length,0);await w.emit({type:'ready'});assert.equal(w.messages[0].type,'start');
 await w.emit({type:'stage',message:'pack'});await w.emit({type:'done',result:42});
 assert.equal(await task,42);assert.deepEqual(stages,['pack']);assert.equal(w.terminated,true);
});
test('cancel terminates computation, ignores stale results and next export can succeed',async t=>{
 const previous=globalThis.Worker;globalThis.Worker=FakeWorker;t.after(()=>{if(previous)globalThis.Worker=previous;else delete globalThis.Worker;});
 const controller=new AbortController(),task=runExportWorker('svg',{}, {},{signal:controller.signal}),w=FakeWorker.latest;
 controller.abort();await assert.rejects(task,/导出已取消/);assert.equal(w.terminated,true);await w.emit({type:'done',result:'stale'});
 const next=runExportWorker('svg',{},{});await FakeWorker.latest.emit({type:'done',result:'ok'});assert.equal(await next,'ok');
});
test('worker errors reject and release worker',async t=>{
 const previous=globalThis.Worker;globalThis.Worker=FakeWorker;t.after(()=>{if(previous)globalThis.Worker=previous;else delete globalThis.Worker;});
 const task=runExportWorker('svg',{},{}),w=FakeWorker.latest;
 await w.emit({type:'error',message:'bad contour'});await assert.rejects(task,/bad contour/);assert.equal(w.terminated,true);
});

test('worker error transport preserves message IDs and user interpolation for the selected UI language',async t=>{
 const previous=globalThis.Worker;globalThis.Worker=FakeWorker;t.after(()=>{if(previous)globalThis.Worker=previous;else delete globalThis.Worker;setLanguage('zh-CN');});
 setLanguage('en');const task=runExportWorker('svg',{},{}),worker=FakeWorker.latest;
 await worker.emit({type:'error',...structuredClone(serializeMessageError(messageError('errors.invalidLanguageTag','用户数据')))});
 await assert.rejects(task,error=>{assert.equal(uiError(error),'Invalid language tag: 用户数据');assert.equal(error.messageKey,'errors.invalidLanguageTag');return true;});
 assert.equal(worker.terminated,true);
});
