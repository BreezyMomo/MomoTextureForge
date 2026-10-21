import {TreeRenderer} from './tree-renderer.js';
import {treeSamples} from './tree-samples.js';
import {project,cloneNode} from './tree-model.js';
import {encodePNG} from './encoders.js';
import {pageHref} from './distribution.js';

document.querySelector('a[href="./"]').href=pageHref('editor');
const urls=[],button=document.getElementById('generate'),panel=document.getElementById('samples'),status=document.getElementById('status');
button.onclick=async()=>{
 button.disabled=true;let renderer;
 try{
  urls.splice(0).forEach(URL.revokeObjectURL);panel.replaceChildren();
  renderer=new TreeRenderer(document.createElement('canvas'));
  const samples=treeSamples();
  for(const sample of samples){
   status.textContent='正在生成 '+sample.name+'…';
   const p=project();p.name=sample.name;p.root.children=[cloneNode(sample.root)];Object.assign(p.output,sample.output);
   const pixels=renderer.draw(p,384,384,{read:true,time:.3}),url=URL.createObjectURL(new Blob([await encodePNG(pixels,384,384)],{type:'image/png'}));urls.push(url);
   const article=document.createElement('article'),img=document.createElement('img'),heading=document.createElement('h2'),description=document.createElement('p'),tags=document.createElement('ul'),link=document.createElement('a');
   article.dataset.category=sample.category;img.src=url;img.alt=sample.name;heading.textContent=sample.name;description.textContent=sample.description;
   for(const tag of sample.tags){const item=document.createElement('li');item.textContent=tag;tags.append(item);}
   link.textContent='在画布中编辑';link.href=pageHref('editor','#tree='+btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(p)))));link.target='_blank';link.rel='noopener';
   article.append(img,heading,description,tags,link);panel.append(article);
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  filter.onchange();status.textContent=samples.length+' 种组合示例已生成 · 打开后可拆解节点、调整参数和播放动画';
 }catch(error){status.textContent='示例生成失败：'+error.message;}
 finally{renderer?.destroy();button.disabled=false;}
};
const filter=document.getElementById('sample-category');filter.onchange=()=>{for(const card of panel.children)card.hidden=filter.value!=='all'&&card.dataset.category!==filter.value;};
button.click();
