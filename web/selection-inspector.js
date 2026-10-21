import {commonValue,selectionCompatibility,shapeParameterVisible} from './selection-editing.js';
import {CATALOG,BY_ID,PALETTES} from './catalog.js';
import {shapeDefaults,POST_SPECS,ANIMATION_ENUMS} from './tree-model.js';
import {FX_SPECS} from './post-fx.js';
import {ARRANGEMENT_NAMES,arrangementSpec} from './arrangement.js';
import {EXTRA_LAYOUTS,EXTRA_SPECS} from './tree-arrangement.js';
import {ARRANGEMENT_LIMITS as LIMITS} from './arrangement-limits.js';
import {normalizeHex,colorBackground} from './inspector-color.js';

export const SELECTION_TABS=[['shape','图形'],['color','颜色'],['layout','变换/排列'],['animation','动画'],['composite','合成']];

export function createSelectionInspector(host,api){
 const doc=host.ownerDocument,bindings=[],variantPaths=new Set();let gestures=0,rebuilding=false;
 const el=(tag,attrs={},children=[])=>{const e=doc.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='text')e.textContent=v;else e.setAttribute(k,v);}e.append(...children);return e;};
 const append=(e,parent=host)=>(parent.append(e),e),note=(text,parent=host)=>append(el('p',{class:'tree-note',text}),parent),heading=(text,parent=host)=>append(el('h3',{text}),parent);
 const row=(label,inputs,parent=host)=>append(el('div',{class:'selection-field'},[el('span',{text:label}),...inputs]),parent);
 const button=(label,fn,parent=host)=>{const b=append(el('button',{text:label,type:'button'}),parent);b.onclick=fn;return b;};
 api.prepare();const nodes=api.nodes(),compat=selectionCompatibility(nodes),section=api.section();
 const val=(n,path)=>api.value(n,path),common=path=>commonValue(api.nodes().map(n=>val(n,path)));
 const branch=path=>(variantPaths.add(path),common(path)),mutate=plan=>api.mutate(plan),assign=(path,value)=>api.apply(path,value);
 function details(label,build){const d=append(el('details',{class:'arrangement-advanced'},[el('summary',{text:label})]));d.open=api.disclosures.has(label);d.ontoggle=()=>{if(d.isConnected)d.open?api.disclosures.add(label):api.disclosures.delete(label);};build(d);return d;}
 function bind(inputs,paths,read,write,{reason='',packed=false}={}){
  const r=inputs[0].closest('.selection-field'),hint=append(el('small',{class:'selection-field-state'}),r);
  bindings.push(()=>{
   const value=commonValue(api.nodes().map(read)),locked=api.locked(paths),mixed=value===undefined;
   for(const input of inputs){input.disabled=locked||!!reason;if(doc.activeElement===input)continue;
    if(input.type==='checkbox'){input.indeterminate=mixed;input.checked=value===true;input.setAttribute('aria-checked',mixed?'mixed':String(!!value));}
    else if(input.type==='range')input.value=mixed?input.min:value;
    else if(input.type==='color')input.value=mixed?'#808080':packed?'#'+Math.round(value).toString(16).padStart(6,'0'):value;
    else input.value=mixed?'':value;
    input.dataset.mixed=String(mixed);input.title=reason||(mixed?'多个值；修改后统一应用':'');
   }
   hint.textContent=reason||(locked?'部分节点由动画控制：可开启录制修改或编辑基础值。':[mixed?'多个值':'',api.dependencies(paths)].filter(Boolean).join(' · '));
   r.querySelector('[data-reset]')?.toggleAttribute('disabled',locked||!!reason);
  });
  for(const input of inputs){
   if(input.type==='range'||input.type==='color'){
    let active=false;
    input.oninput=()=>{if(!active){api.begin();active=true;gestures++;}if(!write(input.value)){active=false;gestures--;api.cancel();}};
    const end=()=>{if(active){active=false;gestures--;api.end();}};input.onchange=()=>active?end():write(input.value);input.onblur=end;
    input.onkeydown=e=>{if(e.key==='Escape'&&active){active=false;gestures--;api.cancel();}};
   }else input.onchange=()=>write(input.type==='checkbox'?input.checked:input.value);
  }
 }
 function number(label,path,min,max,step=.01,{scale=1,parent=host,reason='',resettable=true}={}){
  const name='批量'+label,slider=el('input',{type:'range',min,max,step,'aria-label':name+'滑动条'}),input=el('input',{type:'number',min,max,step,placeholder:'多个值','aria-label':name}),r=row(label,[slider,input],parent);
  const paths=[path];if(path==='transform.width'&&nodes.some(n=>n.transform.lockAspect))paths.push('transform.height');if(path==='transform.height'&&nodes.some(n=>n.transform.lockAspect))paths.push('transform.width');
  bind([slider,input],paths,n=>Math.round(val(n,path)*scale*1e6)/1e6,v=>{if(v.trim()===''||!Number.isFinite(Number(v))){api.notify('请输入有效数值');return false;}return assign(path,Math.max(min,Math.min(max,Number(v)))/scale);},{reason});
  if(resettable){const b=button('↺',()=>api.reset(path),r);b.dataset.reset='true';b.title='各自恢复默认值（录制时记录关键帧）';b.setAttribute('aria-label','批量重置 '+label);}return r;
 }
 function choice(label,path,options,{numeric=false,parent=host,reason='',read=n=>val(n,path),write=v=>assign(path,v),paths=[path]}={}){
  const select=el('select',{'aria-label':'批量'+label},[el('option',{value:'',text:'多个值',disabled:'disabled'}),...options.map(([value,text,disabled])=>el('option',{value,text,...(disabled?{disabled:'disabled'}:{})}))]);row(label,[select],parent);
  bind([select],paths,read,v=>v!==''&&write(numeric?Number(v):v),{reason});return select;
 }
 function check(label,path,{parent=host,reason='',write=v=>assign(path,v)}={}){const input=el('input',{type:'checkbox','aria-label':'批量'+label});row(label,[input],parent);bind([input],[path],n=>val(n,path),write,{reason});return input;}
 function color(label,path,{parent=host,packed=false,read=n=>val(n,path),write=v=>assign(path,v),paths=[path]}={}){
  const picker=el('input',{type:'color','aria-label':'批量'+label}),hex=el('input',{type:'text',placeholder:'多个值','aria-label':'批量'+label+' HEX',maxlength:7,spellcheck:'false'});row(label,[picker,hex],parent);
  const apply=v=>{const value=normalizeHex(v);if(!value){api.notify('请输入颜色，例如 #80DFFF');return false;}return write(packed?parseInt(value.slice(1),16):value);};
  bind([picker,hex],paths,read,apply,{packed});
  if(packed)bindings.push(()=>{if(doc.activeElement!==hex){const v=commonValue(api.nodes().map(read));hex.value=v===undefined?'':'#'+Math.round(v).toString(16).padStart(6,'0');}});
 }
 const modes=append(el('div',{class:'tree-actions'}));for(const [mode,label]of [['record','● 录制'],['base','基础值']]){const b=button(label,()=>api.mode(api.editMode()===mode?'normal':mode),modes);b.setAttribute('aria-label','批量参数模式 '+label);b.setAttribute('aria-pressed',String(api.editMode()===mode));}
 note(`已选 ${api.selectedCount()} 个，修改 ${nodes.length} 个最外层节点；不同值显示“多个值”。`);
 if(api.editMode()==='base')note('正在修改基础值；退出后恢复动画，原有关键帧保留。');
 check('显示节点','enabled');

 function uv(parent=host){heading('图形内部 UV',parent);if(!compat.allShapes){note('UV 与极坐标作用于图形内部；请只选择图形节点进行批改。',parent);return;}
  button('复位 UV',()=>mutate(()=>({values:Object.fromEntries([1,0,0,0,0,0,0].map((v,i)=>['uv.'+i,v]))})),parent);
  for(const [i,label,min,max,step]of [[0,'UV缩放',.1,8,.01],[1,'UV旋转',-360,360,1],[2,'UV偏移X',-2,2,.01],[3,'UV偏移Y',-2,2,.01],[4,'UV滚动速度',-2,2,.01],[5,'UV滚动方向 °',-360,360,1],[6,'UV漩涡',-6.28,6.28,.01]])number(label,'uv.'+i,min,max,step,{parent});check('极坐标采样','polar',{parent});
 }
 function shape(){
  if(!compat.sameShape)note(compat.allGroups?'当前选中组合；请在节点树中选择图形，编辑专属参数。':'混选不同图形时不合并专属参数；其他页签仍可批量编辑。');
  else{
   const shape=BY_ID.get(nodes[0].type),type=nodes[0].type;heading(shape.zh+' · 图形参数');
   button('重置图形参数',()=>mutate(n=>({values:Object.fromEntries(shapeDefaults(n.type).map((v,i)=>['params.'+i,v]))})));
   const evaluated=nodes.map(n=>api.evaluated(n));for(const p of shape.parameters){
    if(!evaluated.every(n=>shapeParameterVisible(n,p)))continue;
    const path='params.'+p.slot;if(type==='Star')variantPaths.add('params.5');if(type==='Gear')variantPaths.add('params.8');
    const special=type==='Star'&&p.slot===5?[[0,'直边星'],[1,'圆角星'],[2,'旧版波瓣']]:type==='Gear'&&p.slot===8?[[0,'直边齿'],[1,'圆齿']]:type==='BezierRibbon'&&p.slot===12?[[0,'圆头'],[1,'平头']]:type==='Halftone'&&p.slot===4?[[0,'径向'],[1,'线性'],[2,'噪声']]:type==='RingPulse'&&p.slot===4?[[0,'平滑'],[1,'指数']]:type==='ConeGradient'&&p.slot===4?[[0,'正向'],[1,'反向']]:type==='LineSegment'&&p.slot===5?[[0,'平头'],[1,'圆头']]:api.isImage(type)&&p.slot===0?[[0,'原色与透明度'],[1,'亮度遮罩'],[2,'透明度遮罩']]:null;
    if(p.type==='select'||special)choice(p.label,path,special??p.options.map(o=>[o.value,o.label]),{numeric:true});
    else if(p.type==='color')color(p.label,path,{packed:true});else number(p.label,path,p.label==='羽化'?0:p.min,p.max,p.step);
   }
   if(shape.definition.editor.kind==='gear'||shape.definition.editor.kind==='star')note('造型模式不同的专属字段先不显示；统一齿形或星形模式后可继续批改。');
  }
  if(compat.allShapes&&nodes.every(n=>api.isImage(n.type)))choice('图片比例','imageFit',[['contain','保持原图比例'],['stretch','随区域拉伸']]);
  if(compat.usesTime){heading('图形内置动画');check('自动播放','shapeClock.follow',{write:v=>mutate(n=>({values:{'shapeClock.follow':v,...(!v&&!n.tracks['shapeClock.value']?{'shapeClock.value':api.formulaTime(n)}:{})}}))});number('运动速度','shapeClock.speed',-10,10,.01);number('时间偏移（秒）','shapeClock.offset',-600,600,.01);number('图形时间（秒）','shapeClock.value',-36000,36000,.01);note('自动播放使用速度与偏移；关闭自动播放后使用图形时间。');}
  uv();
 }
 function colors(){
  number('透明度（%）','opacity',0,100,1,{scale:100});heading('节点颜色');
  choice('配色','color.mode',[['inherit','继承父级配色'],['own','自定义配色'],['preserve','保留子节点颜色（需全选组合）',!compat.allGroups],['remap','组合统一配色（需全选组合）',!compat.allGroups]]);
  branch('color.mode');if(!nodes.every(n=>['own','remap'].includes(val(n,'color.mode')))){note('先统一为自定义配色，再批量修改填充或渐变；继承与保留原色不会被其他参数修改自动覆盖。');return;}
  choice('着色方式','color.fill',[['solid','纯色填充'],['gradient','数值渐变']]);const fill=branch('color.fill');
  if(fill==='solid')color('填充颜色','color.high');else if(fill==='gradient')gradient();else note('先统一纯色或渐变，再编辑对应颜色。');
  note('组合中已有独立配色的子节点保持原样；父级整体调色仍影响最终外观。');
 }
 function stops(n){return n.color.stops?.length>=2?n.color.stops:[{position:0,color:val(n,'color.low')},{position:1,color:val(n,'color.high')}];}
 function gradient(){
  const custom=nodes.some(n=>n.color.stops?.length>=2),counts=nodes.map(n=>stops(n).length),sameCount=counts.every(n=>n===counts[0]);variantPaths.add('color.stops');
  const preview=append(el('div',{class:'color-gradient-preview',role:'img','aria-label':'批量渐变预览'}));bindings.push(()=>{const value=commonValue(api.nodes().map(n=>JSON.stringify(stops(n))));preview.style.background=value?colorBackground({fill:'gradient',stops:JSON.parse(value)}):'';preview.textContent=value?'':'多个渐变';});
  if(!custom){color('暗部颜色','color.low');color('亮部颜色','color.high');}
  heading('配色预设');const presets=append(el('div',{class:'color-preset-grid'}));for(const palette of PALETTES){const b=button(palette.name,()=>mutate(()=>({values:{'color.stops':palette.stops}})),presets);b.setAttribute('aria-label','批量应用配色预设 '+palette.name);const strip=el('span',{class:'color-preset-strip'});strip.style.background=colorBackground({fill:'gradient',stops:palette.stops});b.prepend(strip);}
  if(custom&&sameCount){heading('渐变色标');for(let i=0;i<counts[0];i++){
   color('色标颜色 '+(i+1),'color.stops',{read:n=>stops(n)[i].color,write:v=>mutate(n=>({values:{'color.stops':stops(n).map((s,j)=>j===i?{...s,color:v}:s)}}))});
   const input=el('input',{type:'number',min:0,max:1,step:.01,placeholder:'多个值','aria-label':'批量色标位置 '+(i+1)});row('色标位置 '+(i+1),[input]);bind([input],[],n=>stops(n)[i].position,v=>v.trim()!==''&&Number.isFinite(Number(v))&&mutate(n=>({values:{'color.stops':stops(n).map((s,j)=>j===i?{...s,position:Math.max(0,Math.min(1,Number(v)))}:s)}})));
   if(counts[0]>2)button('删除色标 '+(i+1),()=>mutate(n=>({values:{'color.stops':stops(n).filter((_,j)=>j!==i)}})));
  }}else if(custom)note('色标数量不同：可统一应用预设，或恢复各自双色渐变后继续批改。');
  const add=button('增加色标',()=>mutate(n=>({values:{'color.stops':[...stops(n),{position:.5,color:'#808080'}]}})));add.disabled=nodes.some(n=>stops(n).length>=8);
  button('恢复双色渐变',()=>mutate(n=>{const sorted=[...stops(n)].sort((a,b)=>a.position-b.position);return {values:{'color.low':sorted[0].color,'color.high':sorted.at(-1).color},clearStops:true};}));
  note('色标不录制关键帧；双色端点可录制。不同色标数量不会自动覆盖为主选节点。');
 }
 function align(){heading('对齐与分布');const reference=el('select',{'aria-label':'对齐参照'},[el('option',{value:'selection',text:'所选范围'}),el('option',{value:'canvas',text:'画布'})]);row('对齐参照',[reference]);reference.value=api.reference();reference.onchange=()=>api.setReference(reference.value);
  const actions=append(el('div',{class:'selection-align-actions'}));for(const [id,label]of [['left','左对齐'],['centerX','水平居中'],['right','右对齐'],['top','顶对齐'],['centerY','垂直居中'],['bottom','底对齐'],['distributeX','水平等距'],['distributeY','垂直等距']]){const b=button(label,()=>api.layout(id,reference.value),actions);b.dataset.layoutOperation=id;}
  const hint=note('');bindings.push(()=>{const reason=api.layoutReason(),locked=api.locked(['transform.x','transform.y']);hint.textContent=reason||'按节点区域外框对齐；三个及以上可等距，保持两端位置。';for(const b of actions.children){b.disabled=!!reason||locked||b.dataset.layoutOperation.startsWith('distribute')&&api.nodes().length<3;b.title=reason||(locked?'位置由动画控制，请开启录制或编辑基础值':'');}});
 }
 function layout(){
  heading('节点占用区域');check('锁定区域宽高比例','transform.lockAspect');
  for(const [k,label,min,max,step]of [['x','位置 X',-2,2,.01],['y','位置 Y',-2,2,.01],['width','区域宽',0,1,.01],['height','区域高',0,1,.01],['rotation','旋转 °',-3600,3600,1],['pivotX','轴心 X',0,1,.01],['pivotY','轴心 Y',0,1,.01]])number(label,'transform.'+k,min,max,step);
  check('水平镜像','transform.mirrorX');choice('区域适配','transform.fit',[['stretch','随区域拉伸'],['contain','保持比例']]);note('位置、宽高相对各自父级；保留各节点锁定比例，超出范围整次取消。');align();
  details('图形内部 UV',parent=>uv(parent));heading('无缝与接缝');check('节点无缝重复','seamless');if(compat.allShapes){choice('图形接缝处理','seamMode',[[0,'自动：周期 / 形状重复'],[1,'通用：边缘融合']],{numeric:true});number('融合宽度','seamBlend',.05,.45,.01);}
  heading('区域内的内容排列');const options=[...ARRANGEMENT_NAMES.map((name,i)=>[i,name]),...EXTRA_LAYOUTS.map(([id,label])=>[id,label+([14,16].includes(id)&&!compat.allGroups?'（需全选组合）':''),[14,16].includes(id)&&!compat.allGroups])];
  choice('排列方式','arrange.0',options,{numeric:true,write:value=>mutate(n=>{if([14,16].includes(value)&&n.kind!=='group')throw Error('此排列需要全部选中组合');const values={'arrange.0':value};if(value===8)values['arrange.33']=1;if([13,14].includes(value))Object.assign(values,{'arrange.3':48,'arrange.4':.04,'arrange.19':1});if(value===15)Object.assign(values,{'arrange.1':2,'arrange.2':2});return {values};})});
  const mode=branch('arrange.0');if(mode===undefined)note('排列方式不同，请先统一方式，再修改对应的排列参数。');else if(mode){
   if(compat.allGroups)choice('实例内容','instanceContent',[['all','整个组合'],['random-child','随机一个子节点'],['cycle-child','按顺序循环（取模）']]);
   choice('实例比例','arrangeFit',[['contain','保持设计比例'],['stretch','随区域拉伸']]);arrangement(mode);number('每份动画相位偏移','instancePhase',-1,1,.01);
  }
  details('图块接口',parent=>{choice('图块接口','tileEdges',Array.from({length:16},(_,mask)=>[mask,mask?[[1,'右'],[2,'上'],[4,'左'],[8,'下']].filter(([bit])=>mask&bit).map(([,name])=>name).join(' + '):'无接口 / 空白']),{numeric:true,parent});note('作为规则拼接的候选图块时使用；请选中实际图块编辑接口。',parent);});
 }
 function arrangement(m){
  const a=api.evaluated(nodes[0]).arrange;
  const slots=m===15?[1,2,6]:m===16?[1,2,11]:m===13||m===14?[30,...(branch('arrange.30')===1?[31]:[3]),4,19,6,13,14]:[...([1,4,11].includes(m)?[1,2]:[3]),...([1,4].includes(m)?[6]:[4,5,6]),...({5:[16,17,18,19],6:[30,31,20,21,22,23,24,25,26,27,28,29,18,19],7:[32,18,19],8:[58,33,34,36,15,18,19],9:[35,36,18,19],10:[34,37],11:[38],12:[32,40,41,18,19]}[m]??[])];
  const options={19:[[0,'保持方向'],[1,[6,9,13,14].includes(m)?'沿路径切线':'朝向圆心外'],[2,[6,9,13,14].includes(m)?'垂直路径':'沿圆周切线']],30:[[0,'按数量等距'],[1,'按间距']],37:[[0,'仅放射旋转'],[1,'旋转 + 镜像成对']],38:[[0,'横向错列'],[1,'纵向错列']],58:[[1,'按间距均匀分布'],[0,'每圈等数量']]};
  const slotControl=(slot,parent=host)=>{const s=arrangementSpec(m,slot,a),path='arrange.'+slot;let min=s.min,max=s.max,label=s.label,step=s.step;if([1,2].includes(slot)&&m===15)max=LIMITS.weaveBlocks;if(slot===3&&[13,14].includes(m))max=LIMITS.instances;if(slot===4&&[13,14].includes(m))max=1;
   if(m===8&&slot===3&&branch('arrange.58')===undefined)label='数量（先统一数量分布）';if(options[slot])choice(label,path,options[slot],{numeric:true,parent});else number(label,path,min,max,step,{parent});};
  for(const slot of [...new Set(slots)])slotControl(slot);if(m===8){variantPaths.add('arrange.33');variantPaths.add('arrange.58');}
  if(m!==15&&m!==16)details('高级：随机扰动与位置',parent=>{for(const slot of [8,9,10,11,...(m===1?[12]:[]),13,14])if(!slots.includes(slot))slotControl(slot,parent);});
  const extra=key=>{const [label,min,max,step]=EXTRA_SPECS[key];number(label,'arrangeExtra.'+key,min,max,step);};
  if([13,14].includes(m)){extra('offset');if(m===13)for(const k of ['width','height','corner'])extra(k);else{for(const k of ['threshold','contourOffset'])extra(k);check('显示轮廓来源','arrangeExtra.showSource');note('每个组合的第一个子节点是来源，其余是装饰；不会自动替换或创建子节点。');}}
  if(m===15)choice('编排样式','arrangeExtra.weave',[['herringbone','人字纹'],['basket','篮式编织']]);if([7,12].includes(m)){check('防堆叠','scatterAvoidOverlap');number('额外间距','scatterGap',0,.5,.005);}
  if(m===12){choice('密度图案','arrange.39',CATALOG.map((p,i)=>[i,p.zh]),{numeric:true,write:i=>mutate(()=>({values:{'arrange.39':i,...Object.fromEntries(CATALOG[i].defaults.map((v,j)=>['arrange.'+(42+j),v]))}}))});const index=branch('arrange.39');if(index!==undefined)for(const p of CATALOG[index].parameters)number('密度 · '+p.label,'arrange.'+(42+p.slot),p.min,p.max,p.step);else note('统一密度图案后可编辑密度参数。');}
  if(m!==16)details('排列变化：渐变与流场',parent=>{
   choice('渐变分布','arrangeExtra.gradient',[['none','关闭'],['x','从左到右'],['y','从下到上'],['radial','从中心向外'],['index','按实例顺序']],{parent});check('反向渐变','arrangeExtra.reverse',{parent});
   for(const key of ['scaleFrom','scaleTo','opacityFrom','opacityTo','rotationFrom','rotationTo']){const [label,min,max,step]=EXTRA_SPECS[key];number(label,'arrangeExtra.'+key,min,max,step,{parent});}
   choice('流场方式','arrangeExtra.flow',[['none','关闭'],['wave','波浪偏移'],['vortex','旋涡扭转']],{parent});for(const key of ['flowAmount','flowFrequency','flowPhase']){const [label,min,max,step]=EXTRA_SPECS[key];number(label,'arrangeExtra.'+key,min,max,step,{parent});}check('跟随流场转向','arrangeExtra.flowTurn',{parent});note('渐变/流场关闭时参数保留；防堆叠开启时不应用渐变与流场。',parent);
  });if(m===16)note('各组合保留自己的候选图块。接口请选中子图块批改；无解时检查候选是否齐全。');
 }
 function composite(){
  choice('混合方式','blend',ANIMATION_ENUMS.blend.map((v,i)=>[v,['正常','相加','最大值','相乘','相减','滤色','差值','叠加','柔光','颜色减淡','遮罩','反向遮罩'][i]]));heading('轮廓处理');choice('轮廓方式','contour.mode',[['none','关闭'],['outline','外描边'],['dilate','膨胀'],['erode','收缩']]);number('轮廓宽度（区域短边比例）','contour.radius',0,.1,.001);
  details('后处理：亮度、色阶与反相',parent=>{button('复位后处理',()=>mutate(()=>({values:{...Object.fromEntries(POST_SPECS.map((p,i)=>['post.'+i,p[3]])),invert:false}})),parent);POST_SPECS.forEach(([label,min,max],i)=>number(label,'post.'+i,min,max,.01,{parent}));check('反相图案','invert',{parent});button('复位图像滤镜',()=>mutate(()=>({values:Object.fromEntries(FX_SPECS.map((p,i)=>['postFx.'+i,p[3]]))})),parent);FX_SPECS.forEach(([label,min,max,def,step],i)=>number(label,'postFx.'+i,min,max,step,{parent}));});
  check('反相蒙版','maskInvert',{reason:nodes.every(n=>n.mask)?'':'此参数需要所有所选节点都有蒙版子树'});note('遮罩/反向遮罩影响同组中排在节点前面的内容。蒙版子树的编辑和移除请进入主选节点。');
 }
 function animation(){
  heading('在父级中播放');number('父级区间开始','timing.start',0,1,.001);number('父级区间结束','timing.end',0,1,.001);
  choice('播放方式','timing.loop',[['once','播放一次'],['loop','循环'],['pingpong','往返']],{read:n=>n.timing.loop?(n.timing.pingpong?'pingpong':'loop'):'once',paths:[],write:value=>mutate(()=>({values:{'timing.loop':value!=='once','timing.pingpong':value==='pingpong',...(value==='once'?{'timing.cycles':1}:{})}}))});
  number('重复 / 单程次数','timing.cycles',.01,64,.01);note('往返时每个单程计一次；播放一次时不使用重复次数。');for(const [key,label]of [['before','开始前'],['after','结束后']])choice(label,'timing.'+key,[['hold','保持边界状态'],['hide','隐藏']],{read:n=>n.timing[key]??n.timing.outside});
  details('高级时间控制',parent=>{for(const [k,label,min,max]of [['from','源动画开始进度',0,1],['to','源动画结束进度',0,1],['offset','父级时间相位偏移',-1,1]])number(label,'timing.'+k,min,max,.01,{parent});check('固定动画百分比','timing.frozen',{parent});number('固定进度','timing.at',0,1,.001,{parent});choice('时间推进插值','timing.ease',[['linear','线性'],['smooth','缓入缓出'],['hold','保持']],{parent});note('时间重映射曲线、关键帧和数值曲线按节点编辑；现有曲线保持原样。',parent);});
  heading('本节点参数动画');check('启用本节点参数动画','animationEnabled');button('编辑主选节点的关键帧与曲线',api.editPrimary);note('录制修改在各节点当前局部进度记关键帧；调整时间规则不会覆盖原关键帧。');
 }
 ({shape,colors,layout,animation,composite}[section==='color'?'colors':section]??colors)();
 const signature=()=>JSON.stringify([...variantPaths].map(path=>api.nodes().map(n=>val(n,path))));let previous=signature();
 function sync(){api.prepare();for(const update of bindings)update();const next=signature();if(next!==previous&&!gestures&&!rebuilding){previous=next;rebuilding=true;queueMicrotask(()=>{if(host.isConnected)api.rebuild();});}}
 sync();return {sync};
}
