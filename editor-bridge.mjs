import {createServer} from 'node:http';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {EDITOR_BRIDGE_PROTOCOL,EDITOR_BRIDGE_PORT,EDITOR_BRIDGE_POLL_MS,EDITOR_BRIDGE_LEASE_MS,EDITOR_BRIDGE_MESSAGE_LIMIT} from './web/editor-bridge-protocol.js';

const secret=()=>randomBytes(32).toString('base64url');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const loopback=origin=>{try{const url=new URL(origin);return ['http:','https:'].includes(url.protocol)&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.origin===origin;}catch{return false;}};
export function validBridgeOrigin(origin,extra=[]){return origin==='https://breezymomo.github.io'||loopback(origin)||extra.includes(origin);}
async function readJSON(req){
 if(req.headers['content-type']?.split(';')[0]!=='application/json')throw Error('Expected application/json');
 if(Number(req.headers['content-length'])>EDITOR_BRIDGE_MESSAGE_LIMIT)throw Error('Bridge message exceeds 90 MiB');
 let size=0;const chunks=[];for await(const bytes of req){size+=bytes.length;if(size>EDITOR_BRIDGE_MESSAGE_LIMIT)throw Error('Bridge message exceeds 90 MiB');chunks.push(bytes);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export class EditorBridge{
 constructor({port=EDITOR_BRIDGE_PORT,origins=[],leaseMs=EDITOR_BRIDGE_LEASE_MS,onDisconnect=()=>{}}={}){
  this.port=port;this.origins=origins;this.leaseMs=leaseMs;this.onDisconnect=onDisconnect;this.pending=new Map();this.queue=[];this.session=null;this.pairing=null;this.poll=null;
 }
 async start(){
  if(this.server)return;
  const server=createServer((req,res)=>this.handle(req,res));server.requestTimeout=30000;server.headersTimeout=15000;this.server=server;
  try{await new Promise((ok,fail)=>{server.once('error',fail);server.listen(this.port,'127.0.0.1',ok);});this.port=server.address().port;}
  catch(error){this.server=null;throw Error(error.code==='EADDRINUSE'?'Texture Forge bridge port is in use; configure another --port in the MCP launch command':error.message);}
  this.clock=setInterval(()=>{if(this.session&&Date.now()-this.session.lastSeen>this.leaseMs)this.revoke('Editor connection expired');},5000);this.clock.unref();
 }
 async pairingCode(){
  await this.start();this.revoke('A new pairing replaced the previous connection');
  this.pairing={code:secret(),expires:Date.now()+5*60*1000};
  return {protocol:EDITOR_BRIDGE_PROTOCOL,pairingCode:this.port+'.'+this.pairing.code,expiresAt:new Date(this.pairing.expires).toISOString(),editor:'https://breezymomo.github.io/MomoTextureForge/',instruction:'In the editor open AI tools > MCP > Connection settings, paste this code and connect. The code authorizes reading this tab; keep it private. Then call forge_capture.'};
 }
 status(){
  if(this.session&&Date.now()-this.session.lastSeen>this.leaseMs)this.revoke('Editor connection expired');
  return this.session?{connected:true,connectionId:this.session.id,origin:this.session.origin,connectedAt:this.session.connectedAt,lastSeen:new Date(this.session.lastSeen).toISOString(),access:'read-only'}:{connected:false,access:'read-only'};
 }
 revoke(reason='Editor disconnected'){
  const hadSession=!!this.session;this.session=null;this.pairing=null;
  if(this.poll){clearTimeout(this.poll.timer);this.reply(this.poll.res,401,{error:'Disconnected'});this.poll=null;}
  for(const pending of [...this.pending.values()])pending.reject(Error(reason));this.pending.clear();this.queue=[];
  if(hadSession)this.onDisconnect();
 }
 async close(){this.revoke('MCP server stopped');clearInterval(this.clock);if(this.server){const server=this.server;this.server=null;server.closeAllConnections();await new Promise(done=>server.close(done));}}
 request(operation,{signal,timeout=120000}={}){
  if(!this.status().connected)return Promise.reject(Error('No paired editor. Call forge_connect and pair in the editor first.'));
  if(this.pending.size>=4)return Promise.reject(Error('Too many pending editor requests'));
  if(signal?.aborted)return Promise.reject(Error('Request cancelled'));
  const request={id:randomUUID(),operation};
  return new Promise((resolve,reject)=>{
   let timer;const abort=()=>finish(reject,Error('Request cancelled'));
   const finish=(done,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);this.pending.delete(request.id);this.queue=this.queue.filter(q=>q.id!==request.id);done(value);};
   timer=setTimeout(()=>finish(reject,Error('Editor did not respond; keep the paired tab open and try again')),timeout);
   this.pending.set(request.id,{resolve:value=>finish(resolve,value),reject:error=>finish(reject,error)});this.queue.push(request);signal?.addEventListener('abort',abort,{once:true});this.flush();
  });
 }
 reply(res,status,value){if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}}
 flush(){if(this.poll&&this.queue.length){const poll=this.poll;this.poll=null;clearTimeout(poll.timer);this.reply(poll.res,200,{requests:this.queue.splice(0)});}}
 async handle(req,res){
  try{
   const origin=req.headers.origin,host='127.0.0.1:'+this.port;
   if(req.headers.host!==host||!validBridgeOrigin(origin,this.origins)){this.reply(res,403,{error:'Origin or host is not allowed'});return;}
   res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
   if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Private-Network':'true','Access-Control-Max-Age':'0'}).end();return;}
   const path=new URL(req.url,'http://'+host).pathname;
   if(path==='/pair'&&req.method==='POST'){
    const body=await readJSON(req);
    if(body.protocol!==EDITOR_BRIDGE_PROTOCOL||!this.pairing||this.pairing.expires<Date.now()||!equal(body.code,this.pairing.code)){this.reply(res,401,{error:'Invalid or expired pairing code'});return;}
    this.session={id:randomUUID(),token:secret(),origin,lastSeen:Date.now(),connectedAt:new Date().toISOString()};this.pairing=null;
    this.reply(res,200,{protocol:EDITOR_BRIDGE_PROTOCOL,token:this.session.token,connectionId:this.session.id,access:'read-only'});return;
   }
   if(!this.status().connected||origin!==this.session.origin||!equal(req.headers.authorization,'Bearer '+this.session.token)){this.reply(res,401,{error:'Disconnected or unauthorized'});return;}
   this.session.lastSeen=Date.now();
   if(path==='/requests'&&req.method==='GET'){
    if(this.poll){this.reply(res,409,{error:'This editor already has a pending poll'});return;}
    const poll={res,timer:setTimeout(()=>{if(this.poll===poll){this.poll=null;this.reply(res,200,{requests:[]});}},EDITOR_BRIDGE_POLL_MS)};
    this.poll=poll;res.once('close',()=>{if(this.poll===poll){clearTimeout(poll.timer);this.poll=null;}});this.flush();return;
   }
   if(path==='/response'&&req.method==='POST'){
    const body=await readJSON(req),pending=this.pending.get(body.id);
    if(!pending){this.reply(res,409,{error:'Request expired or unknown'});return;}
    if(typeof body.error==='string')pending.reject(Error(body.error.slice(0,4000)));else pending.resolve(body.result);
    this.reply(res,200,{ok:true});return;
   }
   if(path==='/disconnect'&&req.method==='POST'){this.revoke();this.reply(res,200,{ok:true});return;}
   this.reply(res,404,{error:'Unknown bridge endpoint'});
  }catch(error){this.reply(res,400,{error:error.message});}
 }
}
