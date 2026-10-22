import {TreeRenderer} from './tree-renderer.js';
import {project} from './tree-model.js';
import {imageAsset,encodeResourcePack,readResourcePack} from './resource-pack.js';
import {prepareAsset,registerAsset,unregisterAsset,contentHash} from './resource-assets.js';
import {defaultImageProcessing} from './image-processing.js';
import {createGraphicsLibrary,packageGraphic} from './graphics-workspace.js';
import {saveLibraryEntry} from './graphics-library.js';
import {node,PRESET_SCHEMA} from './tree-model.js';
const result=document.querySelector('#result');
try {
 const c=document.createElement('canvas');c.width=160;c.height=120;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,160,120);ctx.fillStyle='#ff4000';ctx.fillRect(30,20,100,80);ctx.fillStyle='white';ctx.fillRect(60,40,40,40);
 const file=new File([await new Promise(r=>c.toBlob(r))],'背景剔除测试.png',{type:'image/png'}),asset=await imageAsset(file),original=asset.data;
 asset.imageProcessing={...defaultImageProcessing(),mode:'color'};
 const bitmap=await prepareAsset(asset),check=document.createElement('canvas');check.width=160;check.height=120;const cx=check.getContext('2d');cx.drawImage(bitmap,0,0);const pixels=cx.getImageData(0,0,160,120).data;
 if(pixels[3]!==0||pixels[(60*160+80)*4+3]!==255)throw Error('连通域处理失败');
 const id='asset_'+await contentHash(asset);registerAsset(id,asset,bitmap);
 try{const root=node('shape',id),bytes=await encodeResourcePack({schema:PRESET_SCHEMA,root});const pack=await readResourcePack(bytes);pack.rollback();const saved=await packageGraphic(root,{name:'背景剔除测试',kind:'image',category:'验证'});await saveLibraryEntry(saved.entry,saved.bytes);if(asset.data!==original)throw Error('原图被修改');}finally{unregisterAsset(id);}
 // Asymmetric top/bottom fixture checks processing preserves upload orientation.
 ctx.fillStyle='white';ctx.fillRect(0,0,160,120);ctx.fillStyle='red';ctx.fillRect(0,0,160,60);const oriented=await imageAsset(new File([await new Promise(r=>c.toBlob(r))],'方向.png',{type:'image/png'}));
 const raw=await prepareAsset(oriented);oriented.imageProcessing={...defaultImageProcessing(),mode:'color'};const processed=await prepareAsset(oriented);cx.drawImage(raw,0,0);const before=cx.getImageData(0,0,160,120).data;cx.clearRect(0,0,160,120);cx.drawImage(processed,0,0);const after=cx.getImageData(0,0,160,120).data;for(let i=0;i<before.length;i+=4)if(before[i+1]===0&&after[i+3]!==255)throw Error('图片方向改变');raw.close();processed.close();
 const small=document.createElement('canvas');small.width=16;small.height=16;const sc=small.getContext('2d'),ip=sc.createImageData(16,16);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=(y*16+x)*4;ip.data[k]=ip.data[k+1]=ip.data[k+2]=255;ip.data[k+3]=Math.max(0,Math.min(1,(6-Math.hypot(x-7.5,y-7.5))/2))*255;}sc.putImageData(ip,0,0);
 const icon=await imageAsset(new File([await new Promise(r=>small.toBlob(r))],'轮廓测试.png',{type:'image/png'}));
 async function renderIcon(a){const id='asset_'+await contentHash(a);registerAsset(id,a,await prepareAsset(a));const surface=document.createElement('canvas'),renderer=new TreeRenderer(surface);try{const p=project();p.root.children=[node('shape',id)];renderer.draw(p,256,256,{time:0});const out=document.createElement('canvas');out.width=out.height=256;const ctx=out.getContext('2d');ctx.drawImage(renderer.canvas,0,0);return ctx.getImageData(0,0,256,256).data;}finally{renderer.destroy();unregisterAsset(id);}}
 const blurred=await renderIcon(icon);icon.imageProcessing={...defaultImageProcessing(),contour:{enabled:true,threshold:.5,softness:.06}};const sharp=await renderIcon(icon);
 const transition=data=>{let count=0;for(let i=3;i<data.length;i+=4)if(data[i]>10&&data[i]<245)count++;return count;};
 if(transition(sharp)>=transition(blurred)*.6)throw Error('轮廓重建未减少模糊边缘');
 const iconId='asset_'+await contentHash(icon);registerAsset(iconId,icon,await prepareAsset(icon));try{const entry=await packageGraphic(node('shape',iconId),{name:'轮廓重建测试',kind:'image',category:'验证'});await saveLibraryEntry(entry.entry,entry.bytes);}finally{unregisterAsset(iconId);}
 const off=document.createElement('canvas');off.width=64;off.height=48;const oc=off.getContext('2d');oc.fillStyle='#ffb444';oc.fillRect(2,3,16,12);
 const centered=await imageAsset(new File([await new Promise(r=>off.toBlob(r))],'自动居中测试.png',{type:'image/png'}));centered.imageProcessing={...defaultImageProcessing(),autoCenter:true};
 const cb=await prepareAsset(centered);oc.clearRect(0,0,64,48);oc.drawImage(cb,0,0);const cp=oc.getImageData(0,0,64,48).data;let l=64,t=48,r=-1,b=-1;for(let y=0;y<48;y++)for(let x=0;x<64;x++)if(cp[(y*64+x)*4+3]){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}if(l!==24||r!==39||t!==18||b!==29)throw Error('自动居中像素范围错误');
 const ci='asset_'+await contentHash(centered);registerAsset(ci,centered,cb);try{const entry=await packageGraphic(node('shape',ci),{name:'自动居中测试',kind:'image',category:'验证'});await saveLibraryEntry(entry.entry,entry.bytes);}finally{unregisterAsset(ci);}
 const selected=document.createElement('canvas');selected.width=selected.height=64;const sx=selected.getContext('2d');
 sx.fillStyle='rgba(255,0,0,.5)';sx.fillRect(0,0,16,64);sx.fillStyle='#00ff00';sx.fillRect(16,0,16,64);sx.fillStyle='#0000ff';sx.fillRect(32,0,16,64);sx.fillStyle='#ff0000';sx.fillRect(48,0,16,64);
 const retained=await imageAsset(new File([await new Promise(r=>selected.toBlob(r))],'提取指定颜色测试.png',{type:'image/png'})),sourceBytes=retained.data;
 retained.imageProcessing={...defaultImageProcessing(),mode:'extract',color:'#ff0000',tolerance:.01,softness:.02};
 const red=await renderIcon(retained),rgba=(x,y)=>red.slice((y*256+x)*4,(y*256+x)*4+4);
 if(rgba(32,128)[0]<250||Math.abs(rgba(32,128)[3]-128)>2||rgba(96,128)[3]!==0||rgba(160,128)[3]!==0||rgba(224,128)[3]!==255)throw Error('指定颜色提取GPU颜色/透明度错误');
 const roundtrip=await readResourcePack(await encodeResourcePack({schema:'momo.texture-assets/v1'},{assets:new Map([['extract',retained]])}));
 try{const restored=roundtrip.prepared[0][1];if(restored.imageProcessing||restored.imageTransform||restored.imageColor||restored.data===sourceBytes)throw Error('保存结果仍保留源图片或处理设置');const baked=await renderIcon(restored);for(let i=0;i<red.length;i++){const d=i%4===3?Math.abs(red[i]-baked[i]):Math.abs(red[i]*red[i-i%4+3]/255-baked[i]*baked[i-i%4+3]/255);if(d>2)throw Error('确认图片往返改变了处理结果');}}finally{roundtrip.rollback();}
 const selectedId='asset_'+await contentHash(retained);registerAsset(selectedId,retained,await prepareAsset(retained));try{const entry=await packageGraphic(node('shape',selectedId),{name:'提取指定颜色测试',kind:'image',category:'验证'});await saveLibraryEntry(entry.entry,entry.bytes);}finally{unregisterAsset(selectedId);}
 result.textContent='PASS：指定颜色提取GPU/部分透明度/资源包往返、自动居中像素范围、轮廓GPU放大对比、连通域、编辑草稿原图不变、确认后仅保存处理结果、图片方向。点击按钮编辑测试图形。';
 const library=createGraphicsLibrary({onLoad:()=>{},onLoadBatch:()=>{},notify:message=>result.textContent=message});document.querySelector('#open').onclick=()=>library.open();
}catch(e){result.textContent=e.stack;}
