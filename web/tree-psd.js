import {canvasRoot,evaluateNode} from './tree-model.js';
import {writePsdUint8Array} from './vendor/psd-writer.js';

const POST=[0,1,1,0,1,0,1];
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const neutralGroup=n=>n.kind==='group'&&!n.mask&&!n.seamless&&!n.arrange[0]&&!n.invert&&(!n.contour||n.contour.mode==='none'||n.contour.radius===0)&&same(n.post,POST)&&n.opacity===1&&['preserve','inherit'].includes(n.color.mode)&&
 n.transform.x===.5&&n.transform.y===.5&&n.transform.width===1&&n.transform.height===1&&n.transform.rotation===0&&!n.transform.mirrorX&&n.transform.pivotX===.5&&n.transform.pivotY===.5&&n.transform.fit==='stretch';

// PSD paths use document pixel coordinates, y down; GLSL UV uses y up.
function ellipsePath(rx,ry,transform,width,height,operation='combine'){
 const t=transform,side=Math.min(t.width*width,t.height*height),tw=t.fit==='contain'?side/width:t.width,th=t.fit==='contain'?side/height:t.height;
 const angle=t.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),map=(x,y)=>{
  x=(x+.5-t.pivotX)*tw*(t.mirrorX?-1:1);y=(y+.5-t.pivotY)*th;
  return [t.x*width+c*x*width-s*y*height,(1-t.y)*height-s*x*width-c*y*height];
 };
 const k=.5522847498307936;
 const triples=[[[rx,-k*ry],[rx,0],[rx,k*ry]],[[k*rx,ry],[0,ry],[-k*rx,ry]],[[-rx,k*ry],[-rx,0],[-rx,-k*ry]],[[-k*rx,-ry],[0,-ry],[k*rx,-ry]]];
 return {open:false,operation,fillRule:'even-odd',knots:triples.map(points=>({linked:true,points:points.flatMap(p=>map(...p))}))};
}

export function shapeVector(n,width,height){
 if(n.kind!=='shape'||!['Circle','Ring','Ellipse'].includes(n.type)||n.mask||n.seamless||n.arrange[0]||n.polar||n.invert||n.contour?.mode!=='none'&&n.contour?.radius>0||!same(n.post,POST)||!same(n.uv,[1,0,0,0,0,0,0])||n.params[3]!==0)return null;
 // A scalar gradient is not generally a Photoshop spatial gradient. Only a
 // solid color is exported as a fill; all other color models remain pixels.
 if(n.color.mode!=='own'||n.color.fill!=='solid')return null;
 const r=n.params[0],inner=n.type==='Ring'?Math.max(0,r-n.params[1]):n.type==='Circle'?n.params[1]:0,outer=n.type==='Ring'?r+n.params[1]:r,ratio=n.type==='Ellipse'?n.params[4]:1;
 if(outer>1||outer*ratio>1||inner>=outer)return null; // local clipping would change the outline
 const paths=[ellipsePath(outer/2,outer*ratio/2,n.transform,width,height)];
 if(inner>0)paths.push(ellipsePath(inner/2,inner/2,n.transform,width,height,'subtract'));
 const hex=n.color.high,color={r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)};
 return {vectorMask:{paths,fillStartsWithAllPixels:false},vectorFill:{type:'color',color},vectorStroke:{fillEnabled:true,strokeEnabled:false},opacity:n.opacity};
}

export function planPSD(project,{time=0,width=project.output.width,height=project.output.height,vectors=true}={}){
 const p=structuredClone(project);p.root=canvasRoot(p.root);
 const warnings=[],stats={pixels:0,vectors:0,groups:0,merged:0};
 function leaf(name,root,n,merged=false){
  let vector=vectors&&!merged?shapeVector(n,width,height):null;
  if(vector){stats.vectors++; // Keep opacity in the editable layer, not its cached bitmap.
   function unbake(x){if(x.id===n.id){x={...x,opacity:1,tracks:{...x.tracks}};delete x.tracks.opacity;return x;}return {...x,children:x.children.map(unbake)};}root=unbake(root);
  }else stats.pixels++;
  if(merged){stats.merged++;warnings.push(`${name}：组合效果或混合/遮罩已合成`);}
  return {name,root,vector,contourNodeId:n.id,contourOpacity:n.opacity};
 }
 function group(original,parentTime,wrap){
  const e=evaluateNode(original,parentTime),n=e.node;
  if(!e.visible)return null;
  if(!neutralGroup(n))return leaf(n.name+' · 合成',wrap(original),n,true);
  stats.groups++;
  const children=[];
  // Non-normal operations depend on accumulated preceding siblings. Collapse
  // the smallest prefix that contains every such operation; later over layers stay editable.
  let last=-1,hdr=false;n.children.forEach((c,i)=>{const x=evaluateNode(c,e.progress);if(x.visible&&x.node.blend!=='over')last=i;if(x.visible&&x.node.blend==='add')hdr=true;});
  // Add can exceed 1 before later over layers attenuate it. Preserve that
  // attenuation before quantizing to PSD 8-bit channels.
  if(hdr)last=n.children.length-1;
  if(last>=0)children.push(leaf('混合与遮罩 · 合成',wrap({...original,children:original.children.slice(0,last+1)}),n,true));
  for(const child of original.children.slice(last+1)){
   const ce=evaluateNode(child,e.progress);if(!ce.visible)continue;
   const childWrap=x=>wrap({...original,children:[x]});
   const item=child.kind==='group'?group(child,e.progress,childWrap):leaf(child.name+(ce.node.mask?' · 遮罩合成':''),childWrap(child),ce.node,!!ce.node.mask);
   if(item)children.push(item);
  }
  return {name:original.name,children};
 }
 let tree;
 if(p.output.mode!=='color'){tree={name:p.name,children:[leaf(p.output.mode+' · 完整合成',p.root,p.root,true)]};warnings.push('高度/法线/通道输出按完整画面合成，不拆分图层。');}
 else tree=group(p.root,time,x=>x);
 const count=stats.pixels+stats.vectors+(p.output.alpha?0:1)+1;
 // CPU layer buffers, writer channels and composite can otherwise exhaust the browser.
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>4096||height>4096)throw Error('PSD 尺寸须为 1～4096 的整数');
 if(width*height*count>33554432)throw Error(`PSD 共 ${count-1} 层，超过总像素预算；请降低导出尺寸或合并组合`);
 return {project:p,tree,stats,warnings,width,height,time,count};
}

export function pixelData(pixels,width,height){
 if(!pixels||pixels.length!==width*height*4)throw Error('PSD 渲染像素尺寸不匹配');
 return {width,height,data:Uint8ClampedArray.from(pixels,v=>Math.round(Math.max(0,Math.min(1,Number.isFinite(v)?v:0))*255))};
}

export async function exportPSD(project,{render,time=0,width=project.output.width,height=project.output.height,vectors=true,check=()=>{},pause=()=>Promise.resolve(),progress=()=>{},stage=()=>{}}={}){
 const plan=planPSD(project,{time,width,height,vectors});check();
 const composite=pixelData(await render(plan.project,width,height,time),width,height);await pause();check();
 let done=0;
 async function build(item){
  check();if(item.children){const children=[];for(const child of item.children)children.push(await build(child));return {name:item.name,opened:true,blendMode:'normal',children};}
  const p={...plan.project,root:item.root,output:{...plan.project.output,alpha:true}};
  // Data outputs are intentionally a single full output (normal is always opaque).
  if(plan.project.output.mode!=='color')p.output.alpha=plan.project.output.alpha;
  const imageData=pixelData(await render(p,width,height,time),width,height);
  progress(++done,plan.stats.pixels+plan.stats.vectors);await pause();check();
  return {name:item.name,...item.vector,imageData};
 }
 const children=[];
 if(!plan.project.output.alpha&&plan.project.output.mode==='color'){
  const bg=plan.project.output.background??'#000000',rgba=[1,3,5].map(i=>parseInt(bg.slice(i,i+2),16));rgba.push(255);
  const data=new Uint8ClampedArray(width*height*4);for(let i=0;i<data.length;i+=4)data.set(rgba,i);
  children.push({name:'画布背景',imageData:{width,height,data}});
 }
 if(plan.tree)for(const item of plan.tree.children??[plan.tree])children.push(await build(item));
 // Verify the cached normal-over layers against the complete GPU frame. HDR
 // and quantization can invalidate a seemingly separable layer stack. In that
 // case retain the exact current frame rather than writing a misleading stack.
 if(plan.project.output.mode==='color'&&cachedDifference(children,composite)>3){
  children.splice(0,children.length,{name:plan.project.name+' · 完整合成',imageData:composite});
  plan.stats={pixels:1,vectors:0,groups:0,merged:1};plan.warnings.push('拆层后的像素与完整画面不同，已保留完整合成图层。');
 }
 check();stage('正在生成 PSD 文件…');const bytes=writePsdUint8Array({width,height,children,imageData:composite},{trimImageData:false,generateThumbnail:false});check();
 return {bytes,stats:plan.stats,warnings:plan.warnings};
}

export function cachedDifference(children,composite){
 const size=composite.width*composite.height*4,out=new Float32Array(size);
 function blend(items){for(const l of items){if(l.children){blend(l.children);continue;}const data=l.imageData.data,opacity=Math.round((l.opacity??1)*255)/255;for(let i=0;i<size;i+=4){const a=data[i+3]/255*opacity,b=1-a;for(let k=0;k<3;k++)out[i+k]=data[i+k]*a+out[i+k]*b;out[i+3]=255*a+out[i+3]*b;}}}
 blend(children);let max=0;for(let i=0;i<size;i+=4){const a=composite.data[i+3]/255;for(let k=0;k<3;k++)max=Math.max(max,Math.abs(out[i+k]-composite.data[i+k]*a));max=Math.max(max,Math.abs(out[i+3]-composite.data[i+3]));}return max;
}
