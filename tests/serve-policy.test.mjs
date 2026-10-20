import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('actual local server permits remote library fetches and thumbnails while retaining script isolation',async()=>{
 const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const child=spawn(process.execPath,['serve.mjs','--port',String(port)],{cwd:fileURLToPath(new URL('..',import.meta.url)),stdio:['ignore','pipe','pipe']}),closed=new Promise(resolve=>child.once('exit',resolve));
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Local server did not start')),5000);const settle=fn=>value=>{clearTimeout(timeout);fn(value);};child.once('error',settle(reject));child.once('exit',settle(()=>reject(Error('Local server exited early'))));child.stdout.once('data',settle(resolve));});
  const response=await fetch('http://127.0.0.1:'+port+'/');assert.equal(response.status,200);await response.text();
  const policy=new Map(response.headers.get('content-security-policy').split(';').map(s=>{const [key,...values]=s.trim().split(/\s+/);return [key,values];}));
  for(const directive of ['connect-src','img-src'])for(const source of ["'self'",'https:','http:'])assert.ok(policy.get(directive).includes(source),directive+' lacks '+source);
  assert.deepEqual(policy.get('script-src'),["'self'"]);for(const directive of ['object-src','base-uri','frame-ancestors'])assert.deepEqual(policy.get(directive),["'none'"]);
 }finally{child.kill();await closed;}
});
