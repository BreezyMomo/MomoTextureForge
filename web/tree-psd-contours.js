import {denoiseContourCoverage} from './contour-denoise.js';
import {coverageContours} from './coverage-contours.js';
import {canvasRoot,evaluateNode} from './tree-model.js';
import {BY_ID} from './catalog.js';
import {planPSD} from './tree-psd.js';
import {occupiedPixels,pixelContours,CONTOUR_LIMITS} from './pixel-contours.js';
import {writePsdUint8Array} from './vendor/psd-writer.js';
import {fitContourPathsIndividually,rasterizeContourPaths,preservesContourInterior} from './contour-smoothing.js';

export function planContourPSD(project,options={}){
 const source=structuredClone(project);source.root=canvasRoot(source.root);source.output={...source.output,mode:'color',alpha:true};
 const plan=planPSD(source,{...options,vectors:false}),warnings=new Set();
 if(plan.width*plan.height*(plan.stats.pixels+1+(project.output.alpha?0:1))>33554432)throw Error('PSD 矢量轮廓超过总采样预算，请降低导出尺寸');
 function inspect(original,parentTime){
  const e=evaluateNode(original,parentTime),n=e.node;if(!e.visible)return;
  if(BY_ID.get(n.type)?.parameters.some(p=>p.label.includes('羽化')&&n.params[p.slot]>0))warnings.add(`${n.name}：羽化按透明度阈值取轮廓，不保留柔边过渡`);
  if(n.mask||['mask','inverseMask'].includes(n.blend))warnings.add('遮罩结果转为轮廓与孔洞，不保留独立可编辑蒙版');
  for(const child of original.children)inspect(child,e.progress);if(original.mask)inspect(original.mask,e.progress);
 }inspect(source.root,options.time??0);
 warnings.add('每个导出部分为单色形状，取其最不透明采样点的颜色；渐变、多色与像素级半透明过渡不保留');
 if(plan.stats.merged)warnings.add('复杂组合或跨节点效果先合成再取轮廓，合成部分不能拆回独立子节点');
 return {...plan,warnings:[...warnings],background:project.output.alpha?null:project.output.background??'#000000'};
}

function outlineLayer(name,region,width,height,color,paths,opacity=1){
 const data=new Uint8ClampedArray(width*height*4),rgba=[color.r,color.g,color.b,255];for(let i=0;i<region.length;i++)if(region[i])data.set(rgba,i*4);
 return {name,opacity,imageData:{width,height,data},vectorMask:{paths,fillStartsWithAllPixels:false},vectorFill:{type:'color',color},vectorStroke:{fillEnabled:true,strokeEnabled:false}};
}

export function contourComposite(children,width,height){
 const data=new Uint8ClampedArray(width*height*4),premul=new Float32Array(data.length);
 function blend(items){for(const l of items){if(l.children){blend(l.children);continue;}const src=l.imageData.data,opacity=Math.round((l.opacity??1)*255)/255;for(let i=0;i<src.length;i+=4){const a=src[i+3]/255*opacity;for(let k=0;k<3;k++)premul[i+k]=src[i+k]*a+premul[i+k]*(1-a);premul[i+3]=255*a+premul[i+3]*(1-a);}}}
 blend(children);for(let i=0;i<data.length;i+=4){const a=premul[i+3]/255;if(a>0)for(let k=0;k<3;k++)data[i+k]=Math.round(premul[i+k]/a);data[i+3]=Math.round(premul[i+3]);}
 return {width,height,data};
}

export async function buildContourDocument(project,{render,time=0,width=project.output.width,height=project.output.height,threshold=0,smooth=false,denoise=0,detail=.75,samplingScale,rasterize=rasterizeContourPaths,check=()=>{},pause=()=>Promise.resolve(),progress=()=>{},stage=()=>{}}={}){
 if(!Number.isFinite(threshold)||threshold<0||threshold>=1)throw Error('轮廓透明度阈值须在 0～1 之间');
 if(!Number.isFinite(detail)||detail<=0||detail>1)throw Error('轮廓简化误差须在0～1像素之间');
 if(!Number.isFinite(denoise)||denoise<0||denoise>3)throw Error('轮廓去毛刺强度须在0～3之间');
 const plan=planContourPSD(project,{time,width,height}),autoScale=Math.max(1,Math.min(4,Math.floor(1024/Math.max(width,height)),Math.floor(Math.sqrt(33554432/((plan.stats.pixels+1)*width*height))))),scale=smooth?(samplingScale??autoScale):1;
 if(!Number.isInteger(scale)||scale<1||scale>4||width*scale>4096||height*scale>4096||width*height*scale*scale*(plan.stats.pixels+1)>33554432)throw Error('精细轮廓采样超过预算，请降低导出尺寸');
 const stats={rawVertices:0,vectors:0,vertices:0,paths:0,empty:0,groups:0,smoothed:0,preserved:0,fittedPaths:0,preservedPaths:0,samplingScale:scale},children=[];let done=0;
 const binary=cache=>Uint8Array.from({length:cache.width*cache.height},(_,i)=>cache.data[i*4+3]>=128?1:0);
 function validFit(reference,candidate,w,h){const region=binary(reference);if(!preservesContourInterior(region,candidate,w,h,reference))return false;try{const counts=image=>{const p=pixelContours(binary(image),w,h,{maxVertices:200000}).paths;return [p.filter(x=>x.operation==='combine').length,p.filter(x=>x.operation==='subtract').length];},a=counts(reference),b=counts(candidate);return a.every((n,i)=>n===b[i]);}catch{return false;}}
 async function build(item){
  check();if(item.children){const children=[];for(const c of item.children){const child=await build(c);if(child)children.push(child);}if(!children.length)return null;stats.groups++;return {name:item.name,opened:true,blendMode:'normal',children};}
  // Scalar layer opacity belongs to the PSD layer, not the edge coverage.
  // Otherwise a 40%-opaque solid shape disappears at the default 50% boundary.
  function coverageRoot(n){if(n.id===item.contourNodeId){const tracks={...n.tracks};delete tracks.opacity;return {...n,opacity:1,tracks};}return {...n,children:n.children.map(coverageRoot)};}
  const snapshot={...plan.project,root:coverageRoot(item.root)};
  stage('正在提取轮廓…');
  const sw=width*scale,sh=height*scale,pixels=denoiseContourCoverage(await render(snapshot,sw,sh,time),sw,sh,Math.round(denoise*scale));check();stage('正在提取轮廓…');const {region,occupied,color}=occupiedPixels(pixels,sw,sh,threshold);
  let layer=null;if(occupied){let {paths,vertices}=smooth&&threshold>0?coverageContours(pixels,sw,sh,threshold,{maxVertices:200000,maxEdges:600000}):pixelContours(region,sw,sh,{maxVertices:200000,maxEdges:600000});stats.rawVertices+=vertices;if(scale>1)paths=paths.map(p=>({...p,knots:p.knots.map(k=>({...k,points:k.points.map(v=>v/scale)}))}));
   let cache=scale>1||smooth&&threshold>0?rasterize(paths,width,height,color):null,outputRegion=cache?binary(cache):region;
   if(smooth){stage('正在简化和平滑路径…');const reference=cache??outlineLayer('',region,width,height,color,paths).imageData,candidate=fitContourPathsIndividually(paths,rasterize,validFit,{tolerance:detail});
    stats.preservedPaths+=candidate.preserved;if(candidate.accepted){const imageData=rasterize(candidate.paths,width,height,color);
     if(validFit(reference,imageData,width,height)){paths=candidate.paths;vertices=candidate.vertices;cache=imageData;stats.smoothed++;stats.fittedPaths+=candidate.accepted;}
     else{
      // Nearby outlines can interact despite passing individual checks. Add
      // fits one at a time so a single collision does not undo every island.
      const original=paths;let selected=[...paths],accepted=0,attempted=0;
      for(let i=0;i<original.length&&attempted<32;i++)if(candidate.paths[i]!==original[i]){check();attempted++;const trial=[...selected];trial[i]=candidate.paths[i];const preview=rasterize(trial,width,height,color);if(validFit(reference,preview,width,height)){selected=trial;cache=preview;accepted++;}}
      stats.preservedPaths+=candidate.accepted-accepted;if(accepted){paths=selected;vertices=paths.reduce((n,p)=>n+p.knots.length,0);stats.smoothed++;stats.fittedPaths+=accepted;}else stats.preserved++;
     }
    }else if(candidate.preserved)stats.preserved++;
   }
   stats.vertices+=vertices;stats.paths+=paths.length;stats.vectors++;layer=outlineLayer(item.name+' · 矢量轮廓',outputRegion,width,height,color,paths,item.contourOpacity??1);if(cache)layer.imageData=cache;
  }else stats.empty++;
  progress(++done,plan.stats.pixels);await pause();check();return layer;
 }
 check();
 if(plan.background){const region=new Uint8Array(width*height).fill(1),hex=plan.background,color={r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)},outline=pixelContours(region,width,height);children.push(outlineLayer('画布背景',region,width,height,color,outline.paths));stats.vectors++;stats.vertices+=outline.vertices;stats.paths+=outline.paths.length;}
 if(plan.tree)for(const item of plan.tree.children??[plan.tree]){const layer=await build(item);if(layer)children.push(layer);}
 stats.complexityWarning=stats.vertices>CONTOUR_LIMITS.vertices?'图形较复杂（'+stats.vertices+' 个锚点），预览和编辑可能较慢，可降低细节保留或采样尺寸':'';if(stats.complexityWarning)plan.warnings.push(stats.complexityWarning);
 if(!children.length)throw Error('当前进度没有超过阈值的可见区域，无法生成矢量轮廓');
 stage('正在合成图层…');const imageData=contourComposite(children,width,height);await pause();check();
 if(smooth)plan.warnings.push(`轮廓平滑：${stats.fittedPaths} 条路径已平滑，${stats.preservedPaths} 条路径保留原轮廓；精细采样 ${scale}×，允许约1像素的边缘偏差`);
 return {width,height,children,stats,warnings:plan.warnings,imageData};
}

export async function exportContourPSD(project,options={}){
 const result=await buildContourDocument(project,options);const {width,height,children,imageData}=result;
 options.stage?.('正在生成 PSD 文件…');const bytes=writePsdUint8Array({width,height,children,imageData},{trimImageData:false,generateThumbnail:false});options.check?.();return {bytes,stats:result.stats,warnings:result.warnings,imageData};
}
