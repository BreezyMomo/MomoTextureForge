import {contentHash,registerAsset,unregisterAsset} from './resource-assets.js';
import {BY_ID} from './catalog.js';
import {TreeRenderer} from './tree-renderer.js';
import {project,node} from './tree-model.js';

export async function editGenerator(asset,{item,embedded,ui,onSave,onClose}={}){
 const {modal,el,button,labelled}=ui,{d,body}=embedded??modal('图形生成器');d.classList.add('graphic-editor-dialog');
 const draft=structuredClone(asset),layout=el('div',{className:'graphic-editor'}),form=el('div'),right=el('div',{className:'graphic-preview-panel'}),canvas=el('canvas',{width:320,height:320,className:'checker'}),status=el('p',{role:'status'});
 const name=embedded?.fields.name??el('input',{value:item?.name??draft.definition.name,maxLength:80}),category=embedded?.fields.category??el('input',{value:item?.category??'特效素材',maxLength:80}),description=embedded?.fields.desc??el('textarea',{value:item?.description??'',maxLength:2000});
 if(!embedded)form.append(labelled('图形名称',name),labelled('图形分类',category),labelled('图形说明',description));
 form.append(el('p',{className:'tree-note',text:'生成器按粒子/噪声及后处理步骤生成图形。以下参数直接控制生成结果，保存后作为资源默认值。固定种子可复现；可在节点时间轴上为参数添加关键帧。'}));
 let disposed=false,cleaned=false,revision=0,timer=null,busy=false,lastGood=null,active=true,saving=false;
 const renderSurface=document.createElement('canvas'),renderer=new TreeRenderer(renderSurface);
 const update=(spec,value)=>{if(disposed||saving)return;value=Number(value);if(!Number.isFinite(value))return;value=Math.max(spec.min,Math.min(spec.max,value));if(spec.step===1)value=Math.round(value);spec.default=value;draft.definition.defaults[spec.slot]=value;revision++;status.textContent='正在更新预览…';clearTimeout(timer);timer=setTimeout(preview,0);};
 for(const spec of draft.definition.parameters){
  if(spec.type==='select'){const input=el('select',{'aria-label':spec.label},spec.options.map(o=>el('option',{value:String(o.value),text:o.label})));input.value=String(spec.default);input.onchange=()=>update(spec,input.value);form.append(labelled(spec.label,input));}
  else if(spec.type==='color'){const input=el('input',{type:'color',value:'#'+Math.round(spec.default).toString(16).padStart(6,'0'),'aria-label':spec.label});input.oninput=()=>update(spec,parseInt(input.value.slice(1),16));form.append(labelled(spec.label,input));}
  else{const input=el('input',{type:'number',min:spec.min,max:spec.max,step:spec.step,value:spec.default,'aria-label':spec.label}),slider=el('input',{type:'range',min:spec.min,max:spec.max,step:spec.step,value:spec.default,'aria-label':spec.label+'滑动条'});input.oninput=()=>{slider.value=input.value;update(spec,input.value);};slider.oninput=()=>{input.value=slider.value;update(spec,slider.value);};form.append(labelled(spec.label,input),slider);}
 }
 right.append(canvas,status);layout.append(form,right);body.append(layout);
 async function preview(){
  timer=null;if(disposed||!active||busy||saving)return;busy=true;const started=revision;let id,registered=false;
  try{
   const candidate=structuredClone(draft);candidate.definition.name=name.value.trim()||draft.definition.name;id='asset_'+await contentHash(candidate);
   if(disposed)return;
   if(!BY_ID.has(id)){registerAsset(id,candidate);registered=true;}
   const p=project();p.root.children=[node('shape',id)];renderer.draw(p,320,320,{quality:1});const ctx=canvas.getContext('2d');ctx.clearRect(0,0,320,320);ctx.drawImage(renderSurface,0,0);lastGood={revision:started,asset:candidate,thumbnail:canvas.toDataURL()};status.textContent='预览成功 · 多步骤生成器 · '+draft.definition.parameters.length+' 个参数';
  }catch(error){lastGood=null;status.textContent=error.message;}finally{if(registered)unregisterAsset(id);busy=false;if(disposed)cleanup();else if(active&&started!==revision)timer=setTimeout(preview,0);}
 }
 async function save(updateExisting=false){
  if(busy||saving||disposed)return;clearTimeout(timer);await preview();if(!lastGood||lastGood.revision!==revision)return;const record=lastGood;record.asset.definition.name=name.value.trim();if(!record.asset.definition.name){status.textContent='请输入图形名称';return;}
  saving=true;layout.inert=true;status.textContent='正在保存生成器…';try{await onSave(record,{name:name.value.trim(),category:category.value.trim(),description:description.value,generator:true},updateExisting);d.close();}catch(error){status.textContent=error.message;}finally{saving=false;layout.inert=false;if(disposed)cleanup();}
 }
 const actions=el('div',{className:'graphics-actions'},[button('更新预览',preview)]);if(!embedded)actions.append(button('保存为新图形',()=>save(false)));if(item&&!item.builtin&&!item.remote)actions.append(button('更新原图形',()=>save(true)));body.append(actions);
 const cleanup=()=>{if(cleaned||busy||saving)return;cleaned=true;renderer.destroy();onClose?.();};
 const dispose=()=>{if(disposed)return;disposed=true;clearTimeout(timer);cleanup();};d.addEventListener('close',dispose,{once:true});await preview();
 return {save:()=>save(false),dispose,isBusy:()=>busy||saving,setActive:value=>{active=value;if(active&&(!lastGood||lastGood.revision!==revision))preview();}};
}
