import {createServer} from 'node:http';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {EDITOR_BRIDGE_PROTOCOL,EDITOR_BRIDGE_PORT,EDITOR_BRIDGE_POLL_MS,EDITOR_BRIDGE_LEASE_MS,EDITOR_BRIDGE_MESSAGE_LIMIT} from './web/editor-bridge-protocol.js';

export const bridgeSecret=()=>randomBytes(32).toString('base64url');
export const equalSecret=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const loopback=origin=>{try{const url=new URL(origin);return ['http:','https:'].includes(url.protocol)&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.origin===origin;}catch{return false;}};
export function validBridgeOrigin(origin,extra=[]){return origin==='https://breezymomo.github.io'||loopback(origin)||extra.includes(origin);}
export async function readBridgeJSON(req,limit=EDITOR_BRIDGE_MESSAGE_LIMIT){
 if(req.headers['content-type']?.split(';')[0]!=='application/json')throw Error('Expected application/json');
 if(Number(req.headers['content-length'])>limit)throw Error('Bridge message is too large');
 let size=0;const chunks=[];for await(const bytes of req){size+=bytes.length;if(size>limit)throw Error('Bridge message is too large');chunks.push(bytes);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export class EditorBridge{
 constructor({port=EDITOR_BRIDGE_PORT,origins=[],leaseMs=EDITOR_BRIDGE_LEASE_MS,onDisconnect=()=>{},agentToken=bridgeSecret(),onMCP}={}){
  Object.assign(this,{port,origins,leaseMs,onDisconnect,agentToken,onMCP});this.pages=new Map();
 }
 async start(){
  if(this.starting)return this.starting;
  if(this.server)return;
  this.starting=(async()=>{
   const server=createServer((req,res)=>void this.handle(req,res));server.requestTimeout=30000;server.headersTimeout=15000;
   await new Promise((ok,fail)=>{server.once('error',fail);server.listen(this.port,'127.0.0.1',ok);});this.server=server;this.port=server.address().port;
   this.clock=setInterval(()=>this.expire(),5000);this.clock.unref();
  })();try{await this.starting;}finally{this.starting=null;}
 }
 expire(){const now=Date.now();for(const page of this.pages.values()){
  // The browser executes a delivered operation before polling again. Its lease
  // must survive that bounded work, but an unpolled queue cannot keep a dead
  // page alive. Explicit disconnect and request deadlines remain authoritative.
  const executing=[...page.pending.values()].some(p=>p.delivered&&p.expiresAt>now);
  if(now-page.lastSeen>this.leaseMs&&!executing)this.revoke(page.id,'Editor connection expired');
 }}
 status(pageId){
  this.expire();const summaries=[...this.pages.values()].map(p=>({pageId:p.id,connectionId:p.id,name:p.name,origin:p.origin,connectedAt:p.connectedAt,lastSeen:new Date(p.lastSeen).toISOString(),access:p.access,connected:true}));
  return pageId?(summaries.find(p=>p.pageId===pageId)??{pageId,connected:false,access:'read-only'}):{connected:!!summaries.length,pages:summaries};
 }
 configuration(){return {mcpServers:{'texture-forge':{url:'http://127.0.0.1:'+this.port+'/mcp',headers:{Authorization:'Bearer '+this.agentToken}}}};}
 revoke(pageId,reason='Editor disconnected'){
  const page=this.pages.get(pageId);if(!page)return;this.pages.delete(pageId);
  if(page.poll){clearTimeout(page.poll.timer);this.reply(page.poll.res,401,{error:'Disconnected'});page.poll=null;}
  for(const pending of [...page.pending.values()])pending.reject(Error(reason+(pending.delivered?'. The outcome may be unknown; inspect current state before retrying.':'')));page.queue=[];this.onDisconnect(pageId);
 }
 async close(){for(const id of [...this.pages.keys()])this.revoke(id,'MCP server stopped');clearInterval(this.clock);if(this.server){const server=this.server;this.server=null;server.closeAllConnections();await new Promise(done=>server.close(done));}}
 request(pageId,operation,{signal,timeout=120000,args}={}){
  if(!this.status(pageId).connected)return Promise.reject(Error('Page is not connected. Ask the user to enable MCP in that page, then call forge_pages.'));
  const page=this.pages.get(pageId);if(page.pending.size>=4)return Promise.reject(Error('Too many pending requests for this page'));
  if(signal?.aborted)return Promise.reject(Error('Request cancelled'));
  if(['edit','timeline-edit','list-view-edit','inspector-edit','remote-job','remote-edit','component-edit','workspace-edit','editor-control','history','example-open','project-open','library-import','library-process-image','library-edit-resource','library-aliases','library-create','library-update','library-save-node','library-delete','graphics-list-edit','graphics-list-batch','graphics-list-job'].includes(operation)&&page.access!=='read-write')return Promise.reject(Error('This page has not enabled editing'));
  const request={id:randomUUID(),operation,args,expiresAt:Date.now()+timeout};
  return new Promise((resolve,reject)=>{
   let timer;const abort=()=>finish(reject,Error('Request cancelled. If already dispatched, the outcome may be unknown; inspect current state before retrying.'));
   const finish=(done,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);page.pending.delete(request.id);page.queue=page.queue.filter(q=>q.id!==request.id);done(value);};
   timer=setTimeout(()=>finish(reject,Error('Editor did not respond before the request deadline. The outcome may be unknown; inspect current state before retrying.')),timeout);
   page.pending.set(request.id,{delivered:false,expiresAt:request.expiresAt,resolve:value=>finish(resolve,value),reject:error=>finish(reject,error)});page.queue.push(request);signal?.addEventListener('abort',abort,{once:true});this.flush(page);
  });
 }
 reply(res,status,value){if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}}
 flush(page){if(page.poll&&page.queue.length){const poll=page.poll;page.poll=null;clearTimeout(poll.timer);const requests=page.queue.splice(0);for(const request of requests){const pending=page.pending.get(request.id);if(pending)pending.delivered=true;}this.reply(poll.res,200,{requests});}}
 async handle(req,res){
  try{
   const origin=req.headers.origin,host='127.0.0.1:'+this.port,path=new URL(req.url,'http://'+host).pathname;
   if(req.headers.host!==host||origin&&!validBridgeOrigin(origin,this.origins)){this.reply(res,403,{error:'Origin or host is not allowed'});return;}
   if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Expose-Headers','Mcp-Session-Id');}
   if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version','Access-Control-Allow-Private-Network':'true','Access-Control-Max-Age':'0'}).end();return;}
   if(path==='/health'&&req.method==='GET'){this.reply(res,200,{protocol:EDITOR_BRIDGE_PROTOCOL,access:'read-write'});return;}
   if(path==='/mcp'){
    if(!equalSecret(req.headers.authorization,'Bearer '+this.agentToken)){this.reply(res,401,{error:'Use the connection configuration copied from the editor'});return;}
    if(!this.onMCP){this.reply(res,503,{error:'MCP unavailable'});return;}await this.onMCP(req,res);return;
   }
   if(!origin){this.reply(res,403,{error:'Browser origin required'});return;}
   this.expire();
   if(path==='/pages'&&req.method==='POST'){
    const body=await readBridgeJSON(req,4096);
    if(body.protocol!==EDITOR_BRIDGE_PROTOCOL){this.reply(res,400,{error:'Incompatible protocol'});return;}
    if(this.pages.size>=16){this.reply(res,429,{error:'Too many connected pages'});return;}
    const page={id:randomUUID(),token:bridgeSecret(),origin,access:body.access==='read-write'?'read-write':'read-only',name:String(body.name??'').slice(0,160),lastSeen:Date.now(),connectedAt:new Date().toISOString(),pending:new Map(),queue:[],poll:null};this.pages.set(page.id,page);
    this.reply(res,200,{protocol:EDITOR_BRIDGE_PROTOCOL,pageId:page.id,token:page.token,access:page.access,configuration:this.configuration()});return;
   }
   const match=/^\/pages\/([a-f0-9-]{36})\/(requests|response|disconnect)$/.exec(path),page=match&&this.pages.get(match[1]);
   if(!page||origin!==page.origin||!equalSecret(req.headers.authorization,'Bearer '+page.token)){this.reply(res,401,{error:'Invalid page connection'});return;}page.lastSeen=Date.now();
   if(match[2]==='requests'&&req.method==='GET'){
    if(page.poll){this.reply(res,409,{error:'A page poll is already pending'});return;}
    const name=new URL(req.url,'http://'+host).searchParams.get('name');if(name!==null)page.name=name.slice(0,160);
    const poll={res,timer:setTimeout(()=>{if(page.poll===poll){page.poll=null;this.reply(res,200,{requests:[]});}},EDITOR_BRIDGE_POLL_MS)};page.poll=poll;
    res.once('close',()=>{if(page.poll===poll){clearTimeout(poll.timer);page.poll=null;}});this.flush(page);return;
   }
   if(match[2]==='response'&&req.method==='POST'){
    const body=await readBridgeJSON(req),pending=page.pending.get(body.id);if(!pending){this.reply(res,409,{error:'Unknown or expired request'});return;}
    if(body.error)pending.reject(Error(String(body.error).slice(0,4000)));else pending.resolve(body.result);this.reply(res,200,{ok:true});return;
   }
   if(match[2]==='disconnect'&&req.method==='POST'){this.revoke(page.id);this.reply(res,200,{ok:true});return;}
   this.reply(res,404,{error:'Not found'});
  }catch(error){this.reply(res,400,{error:error.message});}
 }
}
