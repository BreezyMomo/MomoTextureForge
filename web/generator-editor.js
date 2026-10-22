import {createGraphicNameEditor} from './graphic-name-editor.js';
import {messageError} from './message-catalog.js';
import {uiError,uiText} from './ui-language.js';
import {createAliasEditor} from './alias-editor.js';
import {parameterLabel,onLanguageChange} from './language.js';
import {contentHash,registerAsset,unregisterAsset} from './resource-assets.js';
import {BY_ID} from './catalog.js';
import {TreeRenderer} from './tree-renderer.js';
import {project,node} from './tree-model.js';
import {EMPTY_GENERATOR,GENERATOR_AUTHORING_LIMIT,parseGeneratorAuthoring,assetFromGeneratorAuthoring,generatorAuthoringFromAsset} from './generator-authoring.js';
import {download} from './encoders.js';

export async function editGenerator(asset,{item,embedded,ui,onSave,onClose}={}){
 const {modal,el,button,labelled}=ui,{d,body}=embedded??modal(uiText("generator.graphicGenerator"));d.classList.add('graphic-editor-dialog');
 const custom=!asset||asset.definition.generator.effect==='pipeline';let draft=asset?structuredClone(asset):assetFromGeneratorAuthoring(EMPTY_GENERATOR);
 const layout=el('div',{className:'graphic-editor'}),form=el('div'),right=el('div',{className:'graphic-preview-panel'}),canvas=el('canvas',{width:320,height:320,className:'checker'}),status=el('p',{role:'status'}),controls=el('div');
 const name=embedded?.fields.name??el('input',{value:item?.name??draft.definition.name,maxLength:80}),category=embedded?.fields.category??el('input',{value:item?.category??'特效素材',maxLength:80}),description=embedded?.fields.desc??el('textarea',{value:item?.description??'',maxLength:2000});
 const nameAliases=embedded?.nameAliases??createGraphicNameEditor(name,item?.aliases??draft.definition.aliases,{onchange:()=>schedule()});
 if(!asset&&name.value==='新资源')name.value='新生成器';
 if(!embedded)form.append(labelled(uiText("library.graphicName"),name),nameAliases.element,labelled(uiText("library.category"),category),labelled(uiText("library.description"),description));
 form.append(el('p',{className:'tree-note',text:uiText("generator.generatorsBuildGraphicsFromParticleNoiseAndPostProcessingPassesThese")}));
 let disposed=false,cleaned=false,revision=0,timer=null,busy=false,lastGood=null,active=true,saving=false,sourceDirty=custom,loading=false;
 const renderSurface=document.createElement('canvas'),renderer=new TreeRenderer(renderSurface);
 const code=custom?el('textarea',{className:'graphics-code',value:JSON.stringify(generatorAuthoringFromAsset(draft,{name:name.value,aliases:nameAliases.read(),category:category.value,description:description.value}),null,2),spellcheck:false,'aria-label':uiText("generator.generatorJSON")}):null;
 let sourceMeta={name:name.value,aliases:nameAliases.read(),category:category.value,description:description.value};const parameterEditors=new Map();
 const schedule=(delay=0)=>{revision++;lastGood=null;status.textContent=uiText("library.updatingPreview");clearTimeout(timer);timer=setTimeout(preview,delay);};
 const update=(spec,value)=>{if(disposed||saving)return;value=Number(value);if(!Number.isFinite(value))return;value=Math.max(spec.min,Math.min(spec.max,value));if(spec.step===1)value=Math.round(value);spec.default=value;draft.definition.defaults[spec.slot]=value;if(custom)code.value=JSON.stringify(generatorAuthoringFromAsset(draft,{name:name.value,aliases:nameAliases.read(),category:category.value,description:description.value}),null,2);schedule();};
 function refreshControls(){controls.replaceChildren();parameterEditors.clear();for(const spec of draft.definition.parameters){
  const meta=document.createElement('div');meta.className='generator-parameter-metadata';const variable=document.createElement('code');variable.textContent=spec.variable;variable.title=uiText("generator.stableVariable");meta.append(variable);const aliases=createAliasEditor(spec,{onchange:(names,options)=>{spec.aliases=names;if(options)spec.options=options;const label=meta.nextElementSibling?.querySelector('span');if(label)label.textContent=parameterLabel(spec);const select=meta.nextElementSibling?.querySelector('select');if(select&&options)options.forEach((o,i)=>select.options[i].textContent=parameterLabel(o));if(custom)code.value=JSON.stringify(generatorAuthoringFromAsset(draft,{name:name.value,aliases:nameAliases.read(),category:category.value,description:description.value}),null,2);schedule();}});parameterEditors.set(spec,aliases);meta.append(aliases.element);controls.append(meta);
  if(spec.type==='select'){const input=el('select',{'aria-label':parameterLabel(spec)},spec.options.map(o=>el('option',{value:String(o.value),text:parameterLabel(o)})));input.value=String(spec.default);input.onchange=()=>update(spec,input.value);controls.append(labelled(parameterLabel(spec),input));}
  else if(spec.type==='color'){const input=el('input',{type:'color',value:'#'+Math.round(spec.default).toString(16).padStart(6,'0'),'aria-label':parameterLabel(spec)});input.oninput=()=>update(spec,parseInt(input.value.slice(1),16));controls.append(labelled(parameterLabel(spec),input));}
  else{const input=el('input',{type:'number',min:spec.min,max:spec.max,step:spec.step,value:spec.default,'aria-label':parameterLabel(spec)}),slider=el('input',{type:'range',min:spec.min,max:spec.max,step:spec.step,value:spec.default,'aria-label':(parameterLabel(spec) + uiText("editor.slider"))});input.oninput=()=>{slider.value=input.value;update(spec,input.value);};slider.oninput=()=>{input.value=slider.value;update(spec,slider.value);};controls.append(labelled(parameterLabel(spec),input),slider);}
 }}
 if(custom){
  const file=el('input',{type:'file',accept:'.json,application/json','aria-label':uiText("generator.generatorFile")});
  file.onchange=async()=>{const f=file.files[0];if(!f||busy||saving)return;loading=true;try{if(f.size>GENERATOR_AUTHORING_LIMIT)throw messageError("generator.generatorFileExceedsMB");const text=await f.text();if(disposed)return;const next=parseGeneratorAuthoring(text);name.value=next.name;nameAliases.set(next.aliases);category.value=next.category;description.value=next.description;code.value=JSON.stringify(next,null,2);sourceDirty=true;schedule();}catch(error){status.textContent=uiError(error);}finally{loading=false;file.value='';if(disposed)cleanup();}};
  code.oninput=()=>{sourceDirty=true;controls.inert=true;schedule(300);};
  form.append(el('p',{className:'tree-note',text:uiText("generator.pasteOrImportGeneratorJSONToDefineParametersAndGLSLPasses")}),labelled(uiText("generator.generatorFile"),file),labelled(uiText("generator.generatorJSON"),code));
 }
 refreshControls();form.append(controls);
 const unlisten=onLanguageChange(()=>{if(!disposed)refreshControls();});d.addEventListener('close',unlisten,{once:true});
 const clock=el('input',{type:'range',min:0,max:10,step:.01,value:0,'aria-label':uiText("generator.generatorPreviewTime")}),clockLabel=labelled(uiText("library.previewTimeSeconds"),clock);clock.oninput=()=>schedule();right.append(canvas,clockLabel,status);layout.append(form,right);body.append(layout);
 async function preview(){
  timer=null;if(disposed||!active||busy||saving||loading)return;busy=true;const started=revision;let id,registered=false;
  try{
   if(custom&&sourceDirty){const parsed=parseGeneratorAuthoring(code.value);for(const [key,field]of Object.entries({name,category,description}))if(field.value===sourceMeta[key])field.value=parsed[key];sourceMeta={name:parsed.name,category:parsed.category,description:parsed.description};draft=assetFromGeneratorAuthoring(parsed);nameAliases.set(parsed.aliases);refreshControls();controls.inert=false;sourceDirty=false;}
   for(const [spec,editor]of parameterEditors){spec.aliases=editor.read();if(spec.options)spec.options=editor.readOptions();}
   const candidate=structuredClone(draft);candidate.definition.name=name.value.trim()||draft.definition.name;candidate.definition.aliases=nameAliases.read();id='asset_'+await contentHash(candidate);
   if(disposed)return;
   if(!BY_ID.has(id)){registerAsset(id,candidate);registered=true;}
   const p=project();p.root.children=[node('shape',id)];const pixels=renderer.draw(p,320,320,{quality:1,read:custom,formulaSeconds:Number(clock.value)});if(custom&&!pixels.every(Number.isFinite))throw messageError("generator.generatorOutputContainsNonfiniteValuesCheckDivisionByZeroSqrtAnd");const ctx=canvas.getContext('2d');ctx.clearRect(0,0,320,320);if(custom){const image=ctx.createImageData(320,320);for(let i=0;i<pixels.length;i++)image.data[i]=Math.round(Math.min(1,Math.max(0,pixels[i]))*255);ctx.putImageData(image,0,0);}else ctx.drawImage(renderSurface,0,0);clockLabel.hidden=!BY_ID.get(id)?.usesTime;lastGood={revision:started,asset:candidate,thumbnail:canvas.toDataURL()};status.textContent=((uiText("generator.previewReadyMultipassGenerator") + draft.definition.parameters.length) + uiText("generator.parameters"));
  }catch(error){lastGood=null;status.textContent=(error.message + uiText("generator.lastSuccessfulPreviewRetainedFixErrorsBeforeSaving"));}finally{if(registered)unregisterAsset(id);busy=false;if(disposed)cleanup();else if(active&&started!==revision)timer=setTimeout(preview,0);}
 }
 async function save(updateExisting=false){
  if(busy||saving||loading||disposed)return;clearTimeout(timer);await preview();if(!lastGood||lastGood.revision!==revision)return;const record=lastGood;record.asset.definition.name=name.value.trim();if(!record.asset.definition.name){status.textContent=uiText("library.enterAGraphicName");return;}
  saving=true;layout.inert=true;status.textContent=uiText("generator.savingGenerator");try{await onSave(record,{name:name.value.trim(),aliases:nameAliases.read(),category:category.value.trim(),description:description.value,generator:true},updateExisting);d.close();}catch(error){status.textContent=uiError(error);}finally{saving=false;layout.inert=false;if(disposed)cleanup();}
 }
 const actions=el('div',{className:'graphics-actions'},[button((custom ? uiText("library.validatePreview") : uiText("generator.updatePreview")),preview)]);if(custom)actions.append(button(uiText("generator.exportGeneratorJSON"),()=>{try{const parsed=parseGeneratorAuthoring(code.value);Object.assign(parsed,{name:name.value.trim(),aliases:nameAliases.read(),category:category.value.trim(),description:description.value});download(new TextEncoder().encode(JSON.stringify(parseGeneratorAuthoring(parsed),null,2)),'graphic.generator.json','application/json');}catch(error){status.textContent=uiError(error);}}));if(!embedded)actions.append(button(uiText("library.saveAsNewGraphic"),()=>save(false)));if(item&&!item.builtin&&!item.remote)actions.append(button(uiText("library.updateGraphic"),()=>save(true)));body.append(actions);
 const cleanup=()=>{if(cleaned||busy||saving||loading)return;cleaned=true;renderer.destroy();onClose?.();};
 const dispose=()=>{if(disposed)return;disposed=true;clearTimeout(timer);cleanup();};d.addEventListener('close',dispose,{once:true});await preview();
 return {save:()=>save(false),dispose,isBusy:()=>busy||saving||loading,setActive:value=>{active=value;if(active&&(!lastGood||lastGood.revision!==revision))preview();}};
}
