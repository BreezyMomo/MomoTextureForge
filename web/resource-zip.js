import {crc32} from './encoders.js';
export const PACK_LIMIT=64*1024*1024;
export function safePath(path){if(typeof path!=='string'||path.length>200||!path||/^[\\/]|[:\\\x00-\x1f]/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('非法资源路径：'+path);return path;}
// Read the central directory: ordinary ZIP writers may use data descriptors.
export async function decodeZIP(input){
 const bytes=new Uint8Array(input);if(bytes.length>PACK_LIMIT)throw Error('资源包超过64MB');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=p=>v.getUint16(p,true),u32=p=>v.getUint32(p,true);
 let end=-1;for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(u32(p)===0x06054b50&&p+22+u16(p+20)===bytes.length){end=p;break;}
 if(end<0)throw Error('ZIP目录缺失');
 const count=u16(end+10),start=u32(end+16),size=u32(end+12);
 if(u16(end+4)||u16(end+6)||u16(end+8)!==count||count>4096||start+size!==end)throw Error('不支持多卷/ZIP64或目录过大');
 let p=start,total=0;const files=new Map(),decoder=new TextDecoder('utf-8',{fatal:true});
 for(let i=0;i<count;i++){
  if(p+46>end||u32(p)!==0x02014b50)throw Error('ZIP目录损坏');
  const flags=u16(p+8),method=u16(p+10),crc=u32(p+16),packed=u32(p+20),length=u32(p+24),names=u16(p+28),extra=u16(p+30),comment=u16(p+32),local=u32(p+42);
  if(p+46+names+extra+comment>end||flags&1||![0,8].includes(method)||u16(p+34))throw Error('不支持加密或此ZIP压缩格式');
  const name=decoder.decode(bytes.subarray(p+46,p+46+names));p+=46+names+extra+comment;
  if(name.endsWith('/')&&length===0){safePath(name.slice(0,-1));continue;}
  safePath(name);if(files.has(name))throw Error('ZIP包含重复路径：'+name);
  total+=length;if(total>PACK_LIMIT||length>16*1024*1024)throw Error('解压资源超过大小限制');
  if(local+30>start||u32(local)!==0x04034b50||u16(local+8)!==method)throw Error('ZIP文件头损坏');
  const offset=local+30+u16(local+26)+u16(local+28);
  if(offset+packed>start||decoder.decode(bytes.subarray(local+30,local+30+u16(local+26)))!==name)throw Error('ZIP路径或边界不一致');
  let data=bytes.slice(offset,offset+packed);
  if(method===8){const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();const chunks=[];let n=0;try{for(;;){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>length)throw Error('解压长度超过声明');chunks.push(value);}}finally{await reader.cancel();}data=new Uint8Array(n);let at=0;for(const c of chunks){data.set(c,at);at+=c.length;}}
  if(data.length!==length||crc32(data)!==crc)throw Error('ZIP资源校验失败：'+name);files.set(name,data);
 }
 if(p!==end)throw Error('ZIP目录长度不一致');return files;
}
