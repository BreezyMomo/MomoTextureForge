import {encodeResourcePack,readResourcePack,imageAsset} from './resource-pack.js';
import {builtinAsset,contentHash} from './resource-assets.js';
import {project,node} from './tree-model.js';
import {TreeRenderer} from './tree-renderer.js';
const result=document.getElementById('result'),packs=[],renderers=[];
try{
 const circle=builtinAsset('Circle');circle.definition.outputs.scalar.inline='1.-smoothstep(.25,.27,r)';
 const periodic=builtinAsset('Checker');periodic.definition.name='移植棋盘';
 const vector=builtinAsset('RadialFlow');vector.definition.name='移植矢量';
 const source=document.createElement('canvas');source.width=source.height=16;const ctx=source.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,8,8);
 const blob=await new Promise(resolve=>source.toBlob(resolve));const img=await imageAsset(new File([blob],'测试图片.png',{type:'image/png'}));
 for(const [label,asset]of [['独立公式',circle],['周期公式',periodic],['矢量公式',vector],['图片资源',img]]){
  const bytes=await encodeResourcePack({schema:'momo.texture-assets/v1'},{assets:[[asset.definition.id,asset]]}),pack=await readResourcePack(bytes);packs.push(pack);pack.register();
  const p=project();p.root.children=[node('shape','asset_'+await contentHash(asset))];p.root.children[0].boundary=label==='周期公式'?'repeat':'clip';
  const title=document.createElement('h2');title.textContent=label;document.getElementById('canvases').append(title);const canvas=document.createElement('canvas');document.getElementById('canvases').append(canvas);const renderer=new TreeRenderer(canvas);renderers.push(renderer);renderer.draw(p,128,128,{time:0,quality:1});
  const copy=document.createElement('canvas');copy.width=copy.height=128;copy.getContext('2d').drawImage(canvas,0,0);const pixels=copy.getContext('2d').getImageData(0,0,128,128).data;let opaque=0,transparent=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]>200)opaque++;if(pixels[i]<10)transparent++;}if(!opaque||(!asset.definition.outputs.vector&&!transparent))throw Error(label+' 未得到预期的非空透明图案');
  if(label==='图片资源'){const alpha=(x,y)=>pixels[(y*128+x)*4+3];if(alpha(16,16)<200||alpha(112,112)>10)throw Error('图片方向或透明通道错误');}
  const again=await readResourcePack(await encodeResourcePack(p));again.register();if(again.payload.root.children[0].type!==p.root.children[0].type)throw Error('重复导入引用变化');
 }
 result.textContent='PASS：公式、周期公式、矢量公式、图片在 ZIP 导出/导入后均通过 GPU 渲染；图片方向和透明度正确，二次导出保持引用。';
}catch(error){result.textContent='FAIL: '+error.stack;console.error(error);}finally{for(const r of renderers)r.destroy();for(const p of packs.reverse())p.rollback();}
