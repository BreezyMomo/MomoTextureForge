import {normalizeDashPattern} from './sketch-options.js';
import {createPostEffectsEditor} from './post-effects-editor.js';
import {POST_EFFECTS,effectEnabled,effectEnableValues,effectResetValues,effectValues,effectParameterVisible} from './post-effect-specs.js';
import {segmentedChoice} from './segmented-choice.js';
import {createGradientEditor} from './gradient-editor.js';
import {gradientColorAt,reverseGradient} from './gradient-stops.js';
import {messageError} from './message-catalog.js';
import {uiOption,uiError,uiText,uiFormat} from './ui-language.js';
import {parameterLabel} from './language.js';
import {parameterRole} from './parameter-metadata.js';
import {commonValue,selectionCompatibility,shapeParameterVisible} from './selection-editing.js';
import {graphicLabel} from './graphic-label.js';
import {CATALOG,BY_ID,PALETTES} from './catalog.js';
import {shapeDefaults,POST_SPECS,ANIMATION_ENUMS} from './tree-model.js';
import {FX_SPECS} from './post-fx.js';
import {ARRANGEMENT_NAMES,arrangementSpec} from './arrangement.js';
import {EXTRA_LAYOUTS,EXTRA_SPECS} from './tree-arrangement.js';
import {ARRANGEMENT_LIMITS as LIMITS} from './arrangement-limits.js';
import {normalizeHex,colorBackground} from './inspector-color.js';

export const SELECTION_TABS=[['shape',"inspector.shape"],['layout',"inspector.transformLayout"],['animation',"inspector.animation"],['composite',"inspector.composite"]];

export function createSelectionInspector(host,api){
 const doc=host.ownerDocument,bindings=[],variantPaths=new Set();let gestures=0,rebuilding=false;
 const el=(tag,attrs={},children=[])=>{const e=doc.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='text')e.textContent=v;else e.setAttribute(k,v);}e.append(...children);return e;};
 const append=(e,parent=host)=>(parent.append(e),e),note=(text,parent=host)=>append(el('p',{class:'tree-note',text}),parent),heading=(key,parent=host,title=uiText(key))=>append(el('h3',{'data-inspector-section':key,text:title}),parent);
 const row=(label,inputs,parent=host)=>append(el('div',{class:'selection-field'},[el('span',{text:label}),...inputs]),parent);
 const button=(label,fn,parent=host)=>{const b=append(el('button',{text:uiText(label),type:'button'}),parent);b.onclick=fn;return b;};
 api.prepare();const nodes=api.nodes(),compat=selectionCompatibility(nodes),section=api.section();
 const val=(n,path)=>api.value(n,path),common=path=>commonValue(api.nodes().map(n=>val(n,path)));
 const branch=path=>(variantPaths.add(path),common(path)),mutate=plan=>api.mutate(plan),assign=(path,value)=>api.apply(path,value);
 function details(key,build){const label=uiText(key),d=append(el('details',{class:'arrangement-advanced','data-inspector-section':key},[el('summary',{text:label})]));d.open=api.disclosures.has(label);d.ontoggle=()=>{if(d.isConnected)d.open?api.disclosures.add(label):api.disclosures.delete(label);};build(d);return d;}
 function bind(inputs,paths,read,write,{reason='',packed=false}={}){
  const r=inputs[0].closest('.selection-field'),hint=append(el('small',{class:'selection-field-state'}),r);
  bindings.push(()=>{
   const value=commonValue(api.nodes().map(read)),locked=api.locked(paths),mixed=value===undefined;
   for(const input of inputs){input.disabled=locked||!!reason||input.dataset.choiceDisabled==='true';if(doc.activeElement===input&&input.type!=='radio')continue;
    if(input.type==='radio')input.checked=!mixed&&input.value===String(value);
    else if(input.type==='checkbox'){input.indeterminate=mixed;input.checked=value===true;input.setAttribute('aria-checked',mixed?'mixed':String(!!value));}
    else if(input.type==='range')input.value=mixed?input.min:value;
    else if(input.type==='color')input.value=mixed?'#808080':packed?'#'+Math.round(value).toString(16).padStart(6,'0'):value;
    else input.value=mixed?'':value;
    input.dataset.mixed=String(mixed);input.title=uiText(reason)||(mixed?uiText("selection.mixedValuesChangesApplyToAll"):'');
   }
   hint.textContent=uiText(reason)||(locked?uiText("selection.someNodesAreAnimatedEnableRecordingOrEditBaseValues"):[mixed?uiText("selection.mixedValues"):'',api.dependencies(paths)].filter(Boolean).join(' · '));
   r.querySelector('[data-reset]')?.toggleAttribute('disabled',locked||!!reason);
  });
  for(const input of inputs){
   if(input.type==='range'||input.type==='color'){
    let active=false;
    input.oninput=()=>{if(!active){api.begin();active=true;gestures++;}if(!write(input.value)){active=false;gestures--;api.cancel();}};
    const end=()=>{if(active){active=false;gestures--;api.end();}};input.onchange=()=>active?end():write(input.value);input.onblur=end;
    input.onkeydown=e=>{if(e.key==='Escape'&&active){active=false;gestures--;api.cancel();}};
   }else input.onchange=()=>{const value=input.type==='checkbox'?input.checked:input.value;write(value);if(input.type==='radio')host.querySelector('[data-choice-path="'+paths[0]+'"] input[value="'+value+'"]')?.focus();};
  }
 }
 function number(label,path,min,max,step=.01,{scale=1,parent=host,reason='',resettable=true}={}){
  if(!path.startsWith('params.'))label=uiText(label);const name=uiText("selection.batch")+label,slider=el('input',{type:'range',min,max,step,'aria-label':(name + uiText("editor.slider"))}),input=el('input',{type:'number',min,max,step,placeholder:uiText("selection.mixedValues"),'aria-label':name}),r=row(label,[slider,input],parent);
  const paths=[path];if(path==='transform.width'&&nodes.some(n=>n.transform.lockAspect))paths.push('transform.height');if(path==='transform.height'&&nodes.some(n=>n.transform.lockAspect))paths.push('transform.width');
  bind([slider,input],paths,n=>Math.round(val(n,path)*scale*1e6)/1e6,v=>{if(v.trim()===''||!Number.isFinite(Number(v))){api.notify(uiText("selection.enterAValidNumber"));return false;}return assign(path,Math.max(min,Math.min(max,Number(v)))/scale);},{reason});
  if(resettable){const b=button('↺',()=>api.reset(path),r);b.dataset.reset='true';b.title=uiText("selection.restoreEachNodeSDefaultRecordsAKeyframeWhileRecording");b.setAttribute('aria-label',(uiText("selection.batchReset") + label));}return r;
 }
 function choice(label,path,options,{numeric=false,parent=host,reason='',read=n=>val(n,path),write=v=>assign(path,v),paths=[path]}={}){if(!path.startsWith('params.')){label=uiText(label);options=options.map(([v,t,...rest])=>[v,uiOption(t),...rest]);}
  const select=el('select',{'aria-label':(uiText("selection.batch") + label)},[el('option',{value:'',text:uiText("selection.mixedValues"),disabled:'disabled'}),...options.map(([value,text,disabled])=>el('option',{value,text,...(disabled?{disabled:'disabled'}:{})}))]);row(label,[select],parent);
  bind([select],paths,read,v=>v!==''&&write(numeric?Number(v):v),{reason});return select;
 }
 function segments(label,path,options){
  label=uiText(label);const {group,inputs}=segmentedChoice(doc,uiText('selection.batch')+label,options.map(([value,text,disabled])=>[value,uiOption(text),disabled])),r=row(label,[group]);r.classList.add('color-choice-field');group.dataset.choicePath=path;bind(inputs,[path],n=>val(n,path),v=>assign(path,v));
 }
 function check(label,path,{parent=host,reason='',write=v=>assign(path,v)}={}){label=uiText(label);const input=el('input',{type:'checkbox','aria-label':(uiText("selection.batch") + label)});row(label,[input],parent);bind([input],[path],n=>val(n,path),write,{reason});return input;}
 function color(label,path,{parent=host,packed=false,read=n=>val(n,path),write=v=>assign(path,v),paths=[path]}={}){
  const picker=el('input',{type:'color','aria-label':(uiText("selection.batch") + label)}),hex=el('input',{type:'text',placeholder:uiText("selection.mixedValues"),'aria-label':((uiText("selection.batch") + label) + ' HEX'),maxlength:7,spellcheck:'false'});row(label,[picker,hex],parent);
  const apply=v=>{const value=normalizeHex(v);if(!value){api.notify(uiText("selection.enterAColorEGDFFF"));return false;}return write(packed?parseInt(value.slice(1),16):value);};
  bind([picker,hex],paths,read,apply,{packed});
  if(packed)bindings.push(()=>{if(doc.activeElement!==hex){const v=commonValue(api.nodes().map(read));hex.value=v===undefined?'':'#'+Math.round(v).toString(16).padStart(6,'0');}});
 }
 const modes=append(el('div',{class:'tree-actions inspector-animation-mode'}));for(const [mode,label]of [['record',"editor.record"],['base',"editor.baseValues"]]){const b=button(uiText(label),()=>api.mode(api.editMode()===mode?'normal':mode),modes);b.setAttribute('aria-label',(uiText("selection.batchParameterMode") + uiText(label)));b.setAttribute('aria-pressed',String(api.editMode()===mode));}
 note(uiFormat("selection.valueSelectedEditingValueOutermostNodesDifferencesShowAsMixedValues",api.selectedCount(),nodes.length)).classList.add('selection-summary');
 if(api.editMode()==='base')note(uiText("selection.editingBaseValuesAnimationResumesOnExitExistingKeyframesAreRetained"));
 check(uiText("editor.visible"),'enabled');

 function uv(parent=host){heading("editor.shapeUV",parent);if(!compat.allShapes){note(uiText("selection.uvAndPolarSamplingApplyInsideShapesSelectOnlyShapeNodes"),parent);return;}
  button(uiText("editor.resetUV"),()=>mutate(()=>({values:Object.fromEntries([1,0,0,0,0,0,0].map((v,i)=>['uv.'+i,v]))})),parent);
  for(const [i,label,min,max,step]of [[0,"editor.uvScale",.1,8,.01],[1,"editor.uvRotation",-360,360,1],[2,"editor.uvOffsetX",-2,2,.01],[3,"editor.uvOffsetY",-2,2,.01],[4,"editor.uvScrollSpeed",-2,2,.01],[5,"editor.uvScrollDirection",-360,360,1],[6,"editor.uvSwirl",-6.28,6.28,.01]])number(uiText(label),'uv.'+i,min,max,step,{parent});check(uiText("editor.polarSampling"),'polar',{parent});
 }
 function shape(){
  if(!compat.sameShape)note(((compat.allGroups ? uiText("selection.groupsSelectedSelectShapesInTheNodeTreeToEditShape") : uiText("selection.differentShapesDoNotShareShapeSpecificParametersOtherTabsStill"))));
  else{
   const shape=BY_ID.get(nodes[0].type),type=nodes[0].type;heading('modules.shapeParameters',host,uiFormat('modules.graphicParameters',graphicLabel(shape)));
   button(uiText("editor.resetShapeParameters"),()=>mutate(n=>({values:Object.fromEntries(shapeDefaults(n.type).map((v,i)=>['params.'+i,v]))})));
   const evaluated=nodes.map(n=>api.evaluated(n));for(const p of shape.parameters){
    if(!evaluated.every(n=>shapeParameterVisible(n,p)))continue;
    const path='params.'+p.slot;if(type==='Star')variantPaths.add('params.5');if(type==='Gear')variantPaths.add('params.8');
    const special=type==='Star'&&p.slot===5?[[0,"editor.straightStar"],[1,"editor.roundedStar"],[2,"editor.legacyLobes"]]:type==='Gear'&&p.slot===8?[[0,"editor.straightTeeth"],[1,"editor.roundedTeeth"]]:type==='BezierRibbon'&&p.slot===12?[[0,"editor.roundCaps"],[1,"editor.flatCaps"]]:type==='Halftone'&&p.slot===4?[[0,"editor.radial"],[1,"editor.linear"],[2,"editor.noise"]]:type==='RingPulse'&&p.slot===4?[[0,"editor.smooth"],[1,"editor.exponential"]]:type==='ConeGradient'&&p.slot===4?[[0,"editor.forward"],[1,"editor.reverse"]]:type==='LineSegment'&&p.slot===5?[[0,"editor.flatCaps"],[1,"editor.roundCaps"]]:api.isImage(type)&&p.slot===0?[[0,"editor.colorAndAlpha"],[1,"editor.luminanceMask"],[2,"editor.alphaMask"]]:null;
    if(p.type==='select'||special)choice(parameterLabel(p),path,p.options?p.options.map(o=>[o.value,parameterLabel(o)]):special,{numeric:true});
    else if(p.type==='color')color(parameterLabel(p),path,{packed:true});else number(parameterLabel(p),path,parameterRole(p)==='feather'?0:p.min,p.max,p.step);
    const field=host.lastElementChild;if(field){field.title=p.variable??p.key;field.dataset.parameterVariable=p.variable??p.key;}
   }
   if(shape.definition.editor.kind==='gear'||shape.definition.editor.kind==='star')note(uiText("selection.profileSpecificFieldsAreHiddenWhenModesDifferUnifyTheTooth"));
  }
  if(compat.allShapes&&nodes.every(n=>api.isImage(n.type)))choice(uiText("editor.imageAspect"),'imageFit',[['contain',"editor.preserveImageAspect"],['stretch',"editor.stretchToRegion"]]);
  if(compat.usesTime){heading("editor.shapeAnimation");check(uiText("editor.autoplay"),'shapeClock.follow',{write:v=>mutate(n=>({values:{'shapeClock.follow':v,...(!v&&!n.tracks['shapeClock.value']?{'shapeClock.value':api.formulaTime(n)}:{})}}))});number(uiText("editor.motionSpeed"),'shapeClock.speed',-10,10,.01);number(uiText("editor.timeOffsetS"),'shapeClock.offset',-600,600,.01);number(uiText("editor.shapeTimeS"),'shapeClock.value',-36000,36000,.01);note(uiText("selection.autoplayUsesSpeedAndOffsetTurnItOffToUseExplicit"));}
  uv();
 }
 function colors(){
  heading('editor.opacity');number(uiText("selection.opacity"),'opacity',0,100,1,{scale:100});heading("editor.nodeColors");
  choice(uiText("editor.colorSource"),'color.mode',[['inherit',"editor.inheritParentColors"],['own',"editor.ownColors"],['preserve',"selection.preserveChildColorsGroupsOnly",!compat.allGroups],['remap',"selection.remapGroupColorsGroupsOnly",!compat.allGroups]]);
  branch('color.mode');if(!nodes.every(n=>['own','remap'].includes(val(n,'color.mode')))){note(uiText("selection.chooseIndependentColorsBeforeBatchEditingFillsOrGradientsOtherEdits"));adjustments();return;}
  segments(uiText("editor.colorFill"),'color.fill',[['solid',"editor.solidFill"],['gradient',"editor.valueGradient"]]);const fill=branch('color.fill');
  if(fill==='solid')color(uiText('editor.fillColor'),'color.high');else if(fill==='gradient')gradient();else note(uiText("selection.unifySolidOrGradientFillBeforeEditingItsColors"));
  note(uiText("selection.childrenWithIndependentColorsRetainThemParentWideRemappingStillAffects"));adjustments();
 }
 function stops(n){return n.color.stops?.length>=2?n.color.stops:[{position:0,color:val(n,'color.low')},{position:1,color:val(n,'color.high')}];}
 function gradient(){
  const sameCount=()=>api.nodes().every(n=>stops(n).length===stops(api.nodes()[0]).length),custom=n=>n.color.stops?.length>=2,allEndpoints=()=>api.nodes().every(n=>!custom(n)),paths=['color.low','color.high'];variantPaths.add('color.stops');
  const canEdit=(index,reason)=>reason==='color'&&allEndpoints()?!api.locked([paths[index]]):api.editMode()!=='record'&&(reason==='restore'?!api.locked(paths):api.nodes().every(custom)||!api.locked(paths));
  const widget=createGradientEditor({document:doc,view:api.gradientView,focus:index=>host.querySelector('[data-gradient-stop="'+index+'"]')?.focus(),presets:PALETTES,read:()=>{api.prepare();return sameCount()?stops(api.nodes()[0]):null;},canEdit,
   mixed:index=>{const values=api.nodes().map(stops),colors=values.map(s=>s[index]?.color),positions=values.map(s=>s[index]?.position);return {any:commonValue(values.map(s=>JSON.stringify(s.map(stop=>[stop.position,stop.color]))))===undefined,color:commonValue(colors)===undefined,position:commonValue(positions)===undefined};},
   begin:()=>{api.begin();gestures++;},end:()=>{gestures--;api.end();},cancel:()=>{gestures--;api.cancel();},
   write:(next,{reason,index})=>{if(!canEdit(index,reason))return false;return mutate(n=>{const original=stops(n);if(reason==='color'&&!custom(n))return {values:{[paths[index]]:next[index].color}};if(reason==='reverse'&&!custom(n))return {values:{'color.low':original[1].color,'color.high':original[0].color}};let result;if(reason==='color')result=original.map((s,i)=>i===index?{...s,color:next[index].color}:s);else if(reason==='position')result=original.map((s,i)=>i===index?{...s,position:next[index].position}:s);else if(reason==='add'){const at=next[index].position;result=[...original,{position:at,color:gradientColorAt(original,at)}];}else if(reason==='delete')result=original.filter((_,i)=>i!==(api.gradientView.removedIndex??index));else if(reason==='reverse')result=reverseGradient(original);else result=next;return {values:{'color.stops':result}};});},
   restore:()=>{if(!canEdit(0,'restore'))return;mutate(n=>{const sorted=[...stops(n)].sort((a,b)=>a.position-b.position);return {values:{'color.low':sorted[0].color,'color.high':sorted.at(-1).color},clearStops:true};});}
  });append(widget);bindings.push(()=>widget.refreshGradient());
 }
 function adjustments(){
  heading('modules.levels');const reset=button(uiText('modules.resetLevels'),()=>mutate(()=>({values:Object.fromEntries(POST_SPECS.map((p,i)=>['post.'+i,p[3]]))})));bindings.push(()=>{reset.disabled=api.locked(POST_SPECS.map((_,i)=>'post.'+i));});POST_SPECS.forEach(([label,min,max],i)=>number(label,'post.'+i,min,max,.01));heading('modules.invert');check(uiText('editor.invertPattern'),'invert');
 }
 function align(){heading("selection.alignDistribute");const reference=el('select',{'aria-label':uiText("selection.alignmentReference")},[el('option',{value:'selection',text:uiText("selection.selectionBounds")}),el('option',{value:'canvas',text:uiText("editor.canvas")})]);row(uiText("selection.alignmentReference"),[reference]);reference.value=api.reference();reference.onchange=()=>api.setReference(reference.value);
  const actions=append(el('div',{class:'selection-align-actions'}));for(const [id,label]of [['left',"selection.alignLeft"],['centerX',"selection.centerHorizontally"],['right',"selection.alignRight"],['top',"selection.alignTop"],['centerY',"selection.centerVertically"],['bottom',"selection.alignBottom"],['distributeX',"selection.distributeHorizontally"],['distributeY',"selection.distributeVertically"]]){const b=button(uiText(label),()=>api.layout(id,reference.value),actions);b.dataset.layoutOperation=id;}
  const hint=note('');bindings.push(()=>{const reason=api.layoutReason(),locked=api.locked(['transform.x','transform.y']);hint.textContent=uiText(reason||"selection.alignsNodeRegionBoundsThreeOrMoreNodesCanBeEvenly");for(const b of actions.children){b.disabled=!!reason||locked||b.dataset.layoutOperation.startsWith('distribute')&&api.nodes().length<3;b.title=uiText(reason||(locked?"selection.positionIsAnimatedEnableRecordingOrEditBaseValues":''));}});
 }
 function layout(){
  heading("editor.nodeRegion");check(uiText("editor.lockRegionAspectRatio"),'transform.lockAspect');
  for(const [k,label,min,max,step]of [['x',"editor.positionX",-2,2,.01],['y',"editor.positionY",-2,2,.01],['width',"editor.regionWidth",0,1,.01],['height',"editor.regionHeight",0,1,.01],['rotation',"editor.rotationDegrees",-3600,3600,1],['pivotX',"editor.pivotX",0,1,.01],['pivotY',"editor.pivotY",0,1,.01]])number(uiText(label),'transform.'+k,min,max,step);
  check(uiText("editor.mirrorHorizontally"),'transform.mirrorX');choice(uiText("editor.regionFit"),'transform.fit',[['stretch',"editor.stretchToRegion"],['contain',"editor.lockAspectRatio"]]);choice(uiText("editor.boundary"),'boundary',[['clip',"editor.clipToNodeRegion"],['visible',"editor.allowContentOutsideRegion"],['repeat',"editor.seamlessRepeat"]]);note(uiText("selection.positionAndSizeAreRelativeToEachParentBoundaryHandlingDoes"));align();
  details("editor.shapeUV",parent=>uv(parent));if(branch('boundary')==='repeat'&&compat.allShapes&&branch('arrange.0')===0){choice(uiText("editor.shapeSeamHandling"),'seamMode',[[0,"editor.automaticPeriodicShapeRepeat"],[1,"editor.genericBlendEdges"]],{numeric:true});number(uiText("editor.blendWidth"),'seamBlend',.05,.45,.01);}
  heading("editor.contentArrangement");const options=[...ARRANGEMENT_NAMES.map((name,i)=>[i,name]),...EXTRA_LAYOUTS.map(([id,label])=>[id,uiText(label)+([14,16].includes(id)&&!compat.allGroups?uiText('selection.groupsRequired'):''),[14,16].includes(id)&&!compat.allGroups])];
  choice(uiText("editor.arrangement"),'arrange.0',options,{numeric:true,write:value=>mutate(n=>{if([14,16].includes(value)&&n.kind!=='group')throw messageError("selection.thisArrangementRequiresOnlyGroupsToBeSelected");const values={'arrange.0':value};if(value===8)values['arrange.33']=1;if([13,14].includes(value))Object.assign(values,{'arrange.3':48,'arrange.4':.04,'arrange.19':1});if(value===15)Object.assign(values,{'arrange.1':2,'arrange.2':2});return {values};})});
  const mode=branch('arrange.0');if(mode===undefined)note(uiText("selection.arrangementModesDifferUnifyTheModeBeforeEditingItsSettings"));else if(mode){
   if(compat.allGroups)choice(uiText("editor.instanceContent"),'instanceContent',[['all',"editor.entireGroup"],['random-child',"editor.oneRandomChild"],['cycle-child',"editor.cycleChildrenInOrder"]]);
   choice(uiText("editor.instanceAspect"),'arrangeFit',[['contain',"editor.preserveDesignAspect"],['stretch',"editor.stretchToRegion"]]);arrangement(mode);number(uiText("editor.animationPhasePerInstance"),'instancePhase',-1,1,.01);
  }
  details("selection.tileConnectors",parent=>{choice(uiText("selection.tileConnectors"),'tileEdges',Array.from({length:16},(_,mask)=>[mask,mask?[[1,"editor.right"],[2,"editor.top"],[4,"editor.left"],[8,"editor.bottom"]].filter(([bit])=>mask&bit).map(([,name])=>uiText(name)).join(' + '):uiText('selection.blankConnectors')]),{numeric:true,parent});note(uiText("selection.usedByRuleTilingCandidatesSelectTheActualTileToEdit"),parent);});
 }
 function arrangement(m){
  const a=api.evaluated(nodes[0]).arrange;
  const slots=m===15?[1,2,6]:m===16?[1,2,11]:m===13||m===14?[30,...(branch('arrange.30')===1?[31]:[3]),4,19,6,13,14]:[...([1,4,11].includes(m)?[1,2]:[3]),...([1,4].includes(m)?[6]:[4,5,6]),...({5:[16,17,18,19],6:[30,31,20,21,22,23,24,25,26,27,28,29,18,19],7:[32,18,19],8:[58,33,34,36,15,18,19],9:[35,36,18,19],10:[34,37],11:[38],12:[32,40,41,18,19]}[m]??[])];
  const options={19:[[0,"editor.keepOrientation"],[1,[6,9,13,14].includes(m)?uiText('selection.pathTangent'):uiText('selection.radiallyOutward')],[2,[6,9,13,14].includes(m)?uiText('selection.pathNormal'):uiText('selection.circleTangent')]],30:[[0,"editor.evenlyByCount"],[1,"editor.bySpacing"]],37:[[0,"editor.radialRotationOnly"],[1,"editor.rotationMirroredPairs"]],38:[[0,"editor.staggerRows"],[1,"editor.staggerColumns"]],58:[[1,"editor.uniformSpacing"],[0,"editor.equalCountPerRing"]]};
  const slotControl=(slot,parent=host)=>{const s=arrangementSpec(m,slot,a),path='arrange.'+slot;let min=s.min,max=s.max,label=s.label,step=s.step;if([1,2].includes(slot)&&m===15)max=LIMITS.weaveBlocks;if(slot===3&&[13,14].includes(m))max=LIMITS.instances;if(slot===4&&[13,14].includes(m))max=1;
   if(m===8&&slot===3&&branch('arrange.58')===undefined)label=uiText('selection.unifyCountDistribution');if(options[slot])choice(label,path,options[slot],{numeric:true,parent});else number(label,path,min,max,step,{parent});};
  for(const slot of [...new Set(slots)])slotControl(slot);if(m===8){variantPaths.add('arrange.33');variantPaths.add('arrange.58');}
  if(m!==15&&m!==16)details("editor.advancedRandomnessPosition",parent=>{for(const slot of [8,9,10,11,...(m===1?[12]:[]),13,14])if(!slots.includes(slot))slotControl(slot,parent);});
  const extra=key=>{const [label,min,max,step]=EXTRA_SPECS[key];number(label,'arrangeExtra.'+key,min,max,step);};
  if([13,14].includes(m)){extra('offset');if(m===13)for(const k of ['width','height','corner'])extra(k);else{for(const k of ['threshold','contourOffset'])extra(k);check(uiText("editor.showContourSource"),'arrangeExtra.showSource');note(uiText("selection.eachGroupSFirstChildIsItsSourceTheOthersAre"));}}
  if(m===15)choice(uiText("editor.layoutStyle"),'arrangeExtra.weave',[['herringbone',"editor.herringbone"],['basket',"editor.basketWeave"]]);if([7,12].includes(m)){check(uiText("editor.avoidOverlap"),'scatterAvoidOverlap');number(uiText("editor.extraGap"),'scatterGap',0,.5,.005);}
  if(m===12){choice(uiText("editor.densityPattern"),'arrange.39',CATALOG.map((p,i)=>[i,graphicLabel(p)]),{numeric:true,write:i=>mutate(()=>({values:{'arrange.39':i,...Object.fromEntries(CATALOG[i].defaults.map((v,j)=>['arrange.'+(42+j),v]))}}))});const index=branch('arrange.39');if(index!==undefined)for(const p of CATALOG[index].parameters)number((uiText("editor.density") + parameterLabel(p)),'arrange.'+(42+p.slot),p.min,p.max,p.step);else note(uiText("selection.unifyTheDensityPatternToEditItsParameters"));}
  if(m!==16)details("editor.layoutVariationGradientFlow",parent=>{
   choice(uiText("editor.gradientDistribution"),'arrangeExtra.gradient',[['none',"common.close"],['x',"editor.leftToRight"],['y',"editor.bottomToTop"],['radial',"editor.centerOutward"],['index',"editor.byInstanceIndex"]],{parent});check(uiText("editor.reverseGradient"),'arrangeExtra.reverse',{parent});
   for(const key of ['scaleFrom','scaleTo','opacityFrom','opacityTo','rotationFrom','rotationTo']){const [label,min,max,step]=EXTRA_SPECS[key];number(label,'arrangeExtra.'+key,min,max,step,{parent});}
   choice(uiText("editor.flowField"),'arrangeExtra.flow',[['none',"common.close"],['wave',"editor.waveOffset"],['vortex',"editor.vortexTwist"]],{parent});for(const key of ['flowAmount','flowFrequency','flowPhase']){const [label,min,max,step]=EXTRA_SPECS[key];number(label,'arrangeExtra.'+key,min,max,step,{parent});}check(uiText("editor.orientAlongFlow"),'arrangeExtra.flowTurn',{parent});note(uiText("selection.disabledGradientsAndFlowRetainTheirSettingsNeitherIsAppliedWhile"),parent);
  });if(m===16)note(uiText("selection.eachGroupKeepsItsOwnCandidateTilesSelectChildTilesTo"));
 }
 function composite(){
  heading("modules.blending");
  choice(uiText("editor.blendMode"),'blend',ANIMATION_ENUMS.blend.map((v,i)=>[v,["editor.normalBlend","editor.add","editor.maximum","editor.multiply","editor.subtract","editor.screen","editor.difference","editor.overlay","editor.softLight","editor.colorDodge","editor.mask","editor.inverseMask"][i]]));
  check(uiText("editor.invertMask"),'maskInvert',{reason:nodes.every(n=>n.mask)?'':uiText("selection.allSelectedNodesMustHaveAMaskSubtreeForThisSetting")});note(uiText("selection.maskAndInverseMaskAffectEarlierSiblingsEnterThePrimarySelection"));
  for(const spec of POST_EFFECTS)for(const p of spec.parameters)if(p.options||p.type==='boolean'||p.key==='paperOpacity')variantPaths.add(p.path);
  heading("editor.contourProcessing");choice(uiText("editor.contourMode"),'contour.mode',[['none',"common.close"],['outline',"editor.outline"],['dilate',"editor.dilate"],['erode',"editor.erode"]]);number(uiText("editor.contourWidthFractionOfShortSide"),'contour.radius',0,.1,.001);
  details('modules.imageFilters',parent=>createPostEffectsEditor({document:doc,host:parent,node:nodes[0],allowShaderExport:false,scope:'batch:'+nodes.map(n=>n.id).join(','),enabled:id=>commonValue(api.nodes().map(n=>effectEnabled(api.evaluated(n),id))),locked:path=>api.locked([path]),
   onToggle:(id,value)=>mutate(n=>({values:effectEnableValues(n,id,value)})),onReset:id=>mutate(()=>({values:effectResetValues(id)})),onOrder:order=>mutate(()=>({values:{effectOrder:order}})),
   onResetAll:()=>mutate(n=>({values:Object.fromEntries(POST_EFFECTS.flatMap(s=>[['postEffects.'+s.id+'.enabled',false],...s.parameters.map(p=>[p.path,p.path.startsWith('postFx.')?FX_SPECS[+p.path.split('.')[1]][3]:p.default])]))})),
   buildParameters:(parent,spec)=>{const values=nodes.map(n=>Object.fromEntries(spec.parameters.map(p=>[p.key,val(n,p.path)])));for(const p of spec.parameters.filter(p=>values.some(value=>effectParameterVisible(p,value)))){if(p.type==='dash'){const input=el('input',{type:'text','aria-label':uiText('selection.batch')+uiText(p.label),placeholder:uiText('fx.dashPatternPlaceholder')});row(uiText(p.label),[input],parent);bind([input],[p.path],n=>val(n,p.path),v=>{const value=normalizeDashPattern(v);if(value===null){api.notify(uiText('fx.dashPatternInvalid'));return false;}return assign(p.path,value);});}else if(p.type==='boolean')check(p.label,p.path,{parent});else if(p.type==='color')color(uiText(p.label),p.path,{parent});else if(p.options)choice(p.label,p.path,p.options.map((value,index)=>[index,uiText('fx.option.'+value)]),{numeric:true,parent});else number(p.label,p.path,p.min,p.max,p.step,{parent});}}
  }));
 }
 function animation(){
  heading("editor.playbackInParent");number(uiText("editor.parentRangeStart"),'timing.start',0,1,.001);number(uiText("editor.parentRangeEnd"),'timing.end',0,1,.001);
  choice(uiText("editor.playbackMode"),'timing.loop',[['once',"editor.playOnce"],['loop',"editor.loop"],['pingpong',"editor.pingPong"]],{read:n=>n.timing.loop?(n.timing.pingpong?'pingpong':'loop'):'once',paths:[],write:value=>mutate(()=>({values:{'timing.loop':value!=='once','timing.pingpong':value==='pingpong',...(value==='once'?{'timing.cycles':1}:{})}}))});
  number(uiText("selection.repeatsOneWayPasses"),'timing.cycles',.01,64,.01);note(uiText("selection.eachDirectionCountsAsOnePassInPingPongModePlay"));for(const [key,label]of [['before',"editor.beforeStart"],['after',"editor.afterEnd"]])choice(uiText(label),'timing.'+key,[['hold',"editor.holdBoundaryState"],['hide',"editor.hide"]],{read:n=>n.timing[key]??n.timing.outside});
  details("editor.advancedTimeControls",parent=>{for(const [k,label,min,max]of [['from',"editor.sourceAnimationStart",0,1],['to',"editor.sourceAnimationEnd",0,1],['offset',"editor.parentTimePhaseOffset",-1,1]])number(uiText(label),'timing.'+k,min,max,.01,{parent});check(uiText("editor.freezeAnimationPercentage"),'timing.frozen',{parent});number(uiText("editor.frozenProgress"),'timing.at',0,1,.001,{parent});choice(uiText("editor.timeInterpolation"),'timing.ease',[['linear',"editor.linear"],['smooth',"editor.easeInOut"],['hold',"editor.hold"]],{parent});note(uiText("selection.timeRemappingAndKeyframeValueCurvesAreEditedPerNodeExisting"),parent);});
  heading("editor.nodeParameterAnimation");check(uiText("editor.enableNodeParameterAnimation"),'animationEnabled');button(uiText("selection.editPrimaryNodeKeyframesCurves"),api.editPrimary);note(uiText("selection.recordingCreatesKeyframesAtEachNodeSCurrentLocalProgressTiming"));
 }
 ({shape:()=>{shape();colors();},layout,animation,composite}[section]??colors)();
 const signature=()=>JSON.stringify([...variantPaths].map(path=>api.nodes().map(n=>val(n,path))));let previous=signature();
 function sync(){api.prepare();for(const update of bindings)update();const next=signature();if(next!==previous&&!gestures&&!rebuilding){previous=next;rebuilding=true;queueMicrotask(()=>{if(host.isConnected)api.rebuild();});}}
 sync();return {sync};
}
