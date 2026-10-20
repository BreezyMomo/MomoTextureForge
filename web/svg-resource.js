const NS='http://www.w3.org/2000/svg';
const tags=new Set('svg g defs path rect circle ellipse line polyline polygon linearGradient radialGradient stop clipPath mask title desc'.split(' '));
const attrs=new Set('id xmlns xmlns:xlink viewBox width height x y x1 y1 x2 y2 cx cy r rx ry d points transform opacity fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset clip-path clip-rule mask maskUnits maskContentUnits clipPathUnits gradientUnits gradientTransform spreadMethod offset stop-color stop-opacity fx fy fr preserveAspectRatio vector-effect color href xlink:href'.split(' '));
export function svgText(asset){return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)));}
export function validateSvgText(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>2*1024*1024)throw Error('SVG最大2MB');
 if(/<!DOCTYPE|<!ENTITY/i.test(text)||/<\?(?!xml\s)/i.test(text))throw Error('SVG不支持DTD、实体或处理指令');
 return text;
}
export function parseSVG(text){
 validateSvgText(text);const doc=new DOMParser().parseFromString(text,'image/svg+xml'),root=doc.documentElement;
 if(doc.querySelector('parsererror')||root.localName!=='svg'||root.namespaceURI!==NS)throw Error('SVG XML格式无效或缺少SVG命名空间');
 const elements=[root,...root.querySelectorAll('*')];if(elements.length>10000)throw Error('SVG元素超过10000个');
 const ids=new Set(),refs=[];
 for(const el of elements){
  if(el.namespaceURI!==NS||!tags.has(el.localName))throw Error('SVG不支持元素：'+el.tagName+'（文字请转路径，样式请转展示属性）');
  for(const a of el.attributes){
   if(!attrs.has(a.name)||(a.namespaceURI&&!['http://www.w3.org/2000/xmlns/','http://www.w3.org/1999/xlink'].includes(a.namespaceURI)))throw Error('SVG不支持属性：'+a.name);
   if(a.name==='xmlns'&&a.value!==NS||a.name==='xmlns:xlink'&&a.value!=='http://www.w3.org/1999/xlink')throw Error('SVG命名空间无效');
   if(a.name==='id'){if(!/^[A-Za-z_][\w.-]*$/.test(a.value)||ids.has(a.value))throw Error('SVG id无效或重复');ids.add(a.value);}
   if(a.name==='href'||a.name==='xlink:href'){if(!['linearGradient','radialGradient'].includes(el.localName)||!/^#[A-Za-z_][\w.-]*$/.test(a.value))throw Error('SVG只支持渐变的本地引用');refs.push([el,a.value.slice(1)]);}
   else if(!a.name.startsWith('xmlns')){
    if(/[\\]|\/\*|@|(?:https?:|data:|javascript:|file:)/i.test(a.value))throw Error('SVG不支持外链或CSS表达式');
    if(/url\s*\(/i.test(a.value)){const m=a.value.match(/^url\(\s*['"]?#([A-Za-z_][\w.-]*)['"]?\s*\)$/);if(!m||!['fill','stroke','clip-path','mask'].includes(a.name))throw Error('SVG只支持本地渐变/裁切/遮罩引用');refs.push([el,m[1]]);}
   }
  }
 }
 const edges=new Map();for(const [el,id]of refs){const target=elements.find(e=>e.id===id);if(!target)throw Error('SVG引用不存在：'+id);let set=edges.get(el);if(!set)edges.set(el,set=new Set());set.add(target);}
 // Include containment so a mask referencing an ancestor cannot recurse.
 const visiting=new Set(),done=new Set();function walk(el,depth=0){if(depth>128||visiting.has(el))throw Error('SVG引用循环或嵌套过深');if(done.has(el))return;visiting.add(el);for(const child of [...el.children,...(edges.get(el)??[])])walk(child,depth+1);visiting.delete(el);done.add(el);}walk(root);
 let box=root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
 const length=v=>/^(?:\d+(?:\.\d*)?|\.\d+)(?:px)?$/.test(v??'')?parseFloat(v):NaN;
 if(!box){const w=length(root.getAttribute('width')),h=length(root.getAttribute('height'));box=[0,0,w,h];root.setAttribute('viewBox',box.join(' '));}
 if(box.length!==4||!box.every(Number.isFinite)||box[2]<=0||box[3]<=0||Math.max(...box.map(Math.abs))>1e9||Math.max(box[2]/box[3],box[3]/box[2])>4096)throw Error('SVG需要有效viewBox或正数width/height');
 const declaredWidth=length(root.getAttribute('width')),declaredHeight=length(root.getAttribute('height'));const ratio=declaredWidth>0&&declaredHeight>0?declaredWidth/declaredHeight:box[2]/box[3];if(!Number.isFinite(ratio)||ratio<1/4096||ratio>4096)throw Error('SVG宽高比例无效');const width=Math.max(1,Math.round(4096*Math.min(1,ratio))),height=Math.max(1,Math.round(4096*Math.min(1,1/ratio)));
 root.setAttribute('width',String(width));root.setAttribute('height',String(height));
 return {source:new XMLSerializer().serializeToString(root),ratio};
}
export async function prepareSVG(asset){
 const {source,ratio}=parseSVG(svgText(asset));const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(source)));await image.decode();
 const canvas=document.createElement('canvas');let current=0;
 canvas.ensureSize=(requested)=>{const size=Math.min(4096,Math.max(64,Math.ceil(requested)));if(size<=current)return;current=size;canvas.width=Math.max(1,Math.round(size*Math.min(1,ratio)));canvas.height=Math.max(1,Math.round(size*Math.min(1,1/ratio)));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);};
 canvas.close=()=>{image.src='';canvas.width=canvas.height=1;};canvas.ensureSize(512);return canvas;
}
