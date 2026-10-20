import {project,node,sanitizeTree} from './tree-model.js';
import {recordValue,templateTracks} from './animation-editing.js';
import {encodeResourcePack,readResourcePack} from './resource-pack.js';
import {TreeRenderer} from './tree-renderer.js';
import {encodePNG} from './encoders.js';
const result=document.getElementById('result'),canvas=document.createElement('canvas');document.getElementById('canvases').append(canvas);let renderer,pack;
const check=(v,m)=>{if(!v)throw Error(m);};
try{
 const p=project(),group=node('group'),shape=node();p.root.children=[group];group.children=[shape];group.timing.start=.2;group.timing.end=.8;shape.color.mode='own';shape.color.fill='solid';shape.params[0]=.4;
 recordValue(shape,'color.high',0,'#ff0000');recordValue(shape,'color.high',1,'#0000ff');Object.assign(shape.tracks,templateTracks(shape,'fade'));
 recordValue(shape,'transform.width',0,.4);recordValue(shape,'transform.width',.5,1);recordValue(shape,'transform.width',1,.4);shape.tracks['transform.width'].segments={0:{ease:'cubic',out:0,in:0}};
 renderer=new TreeRenderer(canvas);const read=(doc,t)=>{renderer.draw(doc,96,96,{time:t,quality:2});const c=document.createElement('canvas');c.width=c.height=96;c.getContext('2d').drawImage(canvas,0,0);return c.getContext('2d').getImageData(0,0,96,96).data;},pixel=(bytes,x,y)=>[...bytes.slice((y*96+x)*4,(y*96+x)*4+4)];
 const zero=read(p,.2),mid=read(p,.5),end=read(p,.8);check(pixel(zero,48,48)[3]<2,'开始帧应透明');check(pixel(end,48,48)[3]<2,'结束帧应透明');const center=pixel(mid,48,48);check(center[3]>250&&Math.abs(center[0]-128)<3&&Math.abs(center[2]-128)<3,'父子时间或颜色插值错误');
 const encoded=await encodeResourcePack(p);pack=await readResourcePack(encoded);pack.register();const reopened=sanitizeTree(pack.payload),again=read(reopened,.5);check(mid.every((v,i)=>v===again[i]),'ZIP重开后GPU帧发生变化');
 const png=await encodePNG(again,96,96,8);check(png.byteLength>100,'PNG导出失败');
 recordValue(shape,'enabled',0,true);recordValue(shape,'enabled',.5,false);check(pixel(read(p,.5),48,48)[3]<2,'开关轨道未影响真实GPU输出');
 shape.tracks.enabled.muted=true;check(pixel(read(p,.5),48,48)[3]>250,'静音轨道未恢复基础值');
 group.timing.loop=true;group.timing.cycles=2;check(pixel(read(p,.35),48,48)[3]>250,'父循环没有驱动子动画');
 const plain=project(),only=plain.root.children[0];only.timing.start=.2;only.timing.end=.6;only.timing.before='hold';only.timing.after='hide';check(pixel(read(plain,.4),48,48)[3]>250,'静态节点区间内不可见');check(pixel(read(plain,.8),48,48)[3]<2,'静态父缓存忽略独立区间后隐藏');
 result.textContent='PASS：父子时间 / 颜色与透明度 / cubic参数 / 开关与静音 / 父循环 / 自包含ZIP往返像素一致 / PNG编码。';
}catch(e){result.textContent='FAIL: '+e.stack;console.error(e);}finally{renderer?.destroy();pack?.rollback();}
