import {uiText,localizeApplicationMarkup} from './ui-language.js';
import {TreeRenderer} from './tree-renderer.js';
import {treeSamples} from './tree-samples.js';
import {project,cloneNode} from './tree-model.js';
import {encodePNG} from './encoders.js';
import {pageHref} from './distribution.js';

localizeApplicationMarkup(document.head);localizeApplicationMarkup(document.body);
document.querySelector('a[href="./"]').href=pageHref('editor');
const urls=[],button=document.getElementById('generate'),panel=document.getElementById('samples'),status=document.getElementById('status');
button.onclick=async()=>{
 button.disabled=true;let renderer;
 try{
  urls.splice(0).forEach(URL.revokeObjectURL);panel.replaceChildren();
  renderer=new TreeRenderer(document.createElement('canvas'));
  const samples=treeSamples();if(filter.value!=='all')samples.sort((a,b)=>Number(b.category===filter.value)-Number(a.category===filter.value));
  for(const sample of samples){
   status.textContent=((uiText("ui.generating") + uiText(sample.nameKey)) + '…');
   const p=project();p.name=sample.name;p.root.children=[cloneNode(sample.root)];Object.assign(p.output,sample.output);
   const pixels=renderer.draw(p,384,384,{read:true,time:sample.previewTime??.3}),url=URL.createObjectURL(new Blob([await encodePNG(pixels,384,384)],{type:'image/png'}));urls.push(url);
   const article=document.createElement('article'),img=document.createElement('img'),heading=document.createElement('h2'),description=document.createElement('p'),tags=document.createElement('ul'),link=document.createElement('a');
   article.dataset.category=sample.category;article.hidden=filter.value!=='all'&&sample.category!==filter.value;img.src=url;img.alt=uiText(sample.nameKey);heading.textContent=uiText(sample.nameKey);description.textContent=uiText(sample.description);
   for(const tag of sample.tags){const item=document.createElement('li');item.textContent=uiText(tag);tags.append(item);}
   const bytes=new TextEncoder().encode(JSON.stringify(p));let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   link.textContent=uiText("ui.editOnCanvas");const editorURL=new URL(pageHref('editor','#tree='+btoa(binary)));if(Number.isFinite(sample.previewTime))editorURL.searchParams.set('preview-time',sample.previewTime);link.href=editorURL.href;link.target='_blank';link.rel='noopener';
   article.append(img,heading,description,tags,link);panel.append(article);
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  filter.onchange();status.textContent=(samples.length + uiText("ui.examplesGeneratedOpenToInspectNodesEditParametersAndPlayAnimation"));
 }catch(error){status.textContent=(uiText("ui.exampleGenerationFailed") + error.message);}
 finally{renderer?.destroy();button.disabled=false;}
};
const filter=document.getElementById('sample-category');filter.onchange=()=>{for(const card of panel.children)card.hidden=filter.value!=='all'&&card.dataset.category!==filter.value;};
const requested=new URL(location.href).searchParams.get('category');if([...filter.options].some(o=>o.value===requested))filter.value=requested;
button.click();
