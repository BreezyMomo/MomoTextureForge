import {uiText,uiFormat} from './ui-language.js';
import { BY_ID } from "./catalog.js";
import { exportSummary } from "./workspace-model.js";

// Reorganize the existing controls without replacing their state/event routes.
export function createWorkspace(actions, prefs) {
  const $=(id)=>document.getElementById(id);
  const block=(tag,html)=>{const node=document.createElement(tag);node.innerHTML=html;return node;};
  const inspector=document.querySelector('.inspector');
  const sections=[...inspector.querySelectorAll(':scope > section')];
  const section=(title)=>sections.find((node)=>node.querySelector('h2')?.textContent===title);
  const context=block('div',`<div class="context-heading"><strong id="editing-context"></strong><button id="context-visible" type="button"></button></div><div id="context-tabs-slot"></div><nav class="inspector-tabs" aria-label="编辑分区"><button data-pane="shape">图形</button><button data-pane="arrange">排列</button><button data-pane="compose">合成</button><button data-pane="output">输出</button></nav>`);
  context.className='inspector-context';inspector.prepend(context);$('context-tabs-slot').append($('layer-tabs'));
  const panes={};let pane='shape';
  for(const [id, label] of [['shape',"inspector.shape"],['arrange',"workspace.arrangement"],['compose',"inspector.composite"],['output',"workspace.output"]]) {
    const node=document.createElement('div');node.id=`pane-${id}`;node.className='inspector-pane';node.setAttribute('role','region');node.setAttribute('aria-label',uiFormat("workspace.valueSettings",label));inspector.append(node);panes[id]=node;
  }
  const advanced=(node,title)=>{const detail=block('details',`<summary>${title}</summary>`);detail.className='advanced-section';detail.append(node);return detail;};
  panes.shape.append(section('图层与参数'),advanced(section('UV 变换'),'高级：UV 变换'));
  panes.arrange.append(section('图形排列器'),section('无缝平铺'));
  panes.compose.append(section('图层混合'),section('配色渐变'),advanced(section('后处理'),'高级：后处理'),advanced(section('预设'),'预设管理'));
  const layerControls=document.createElement('div');layerControls.id='composition-controls';layerControls.className='layer-controls';section('图层混合').querySelector('.section-heading').after(layerControls);
  panes.output.append(section('输出'),section('动画与序列帧'));
  section('动画与序列帧').querySelector('h2').textContent=uiText("workspace.frameSequenceSettings");
  const panelHead=block('div',`<label>导出内容<select id="export-kind"><option value="single">单张贴图</option><option value="atlas">翻转书图集</option><option value="frames">逐帧 PNG ZIP</option><option value="batch">批量三档 PNG ZIP</option></select></label><label>文件格式<select id="export-format"><option value="png">PNG</option><option value="exr">EXR</option></select></label><p id="export-summary" aria-live="polite"></p><button id="export-current" class="primary">导出当前输出</button>`);
  panelHead.className='export-overview';panes.output.prepend(panelHead);
  panes.output.append($('flipbook-preview'));
  inspector.append(inspector.querySelector('footer'));
  $('frames-zip').hidden=true;document.querySelector('#batch').hidden=true;
  const preset=$('keep').closest('label');preset.hidden=true;
  const project=block('div',`<input id="project-name" aria-label="项目名称" maxlength="80" value="未命名贴图"><span id="draft-status" role="status">修改后自动保存草稿</span><label class="autosave-check"><input id="autosave" type="checkbox">自动草稿</label><button id="project-save">保存项目</button><button id="project-open">打开项目</button><input id="project-file" type="file" accept=".json,application/json" hidden>`);
  project.className='project-toolbar';document.querySelector('header').after(project);
  $('autosave').checked=prefs.autosave;
  $('project-save').onclick=actions.saveProject;
  $('project-open').onclick=()=>$('project-file').click();
  $('project-file').onchange=()=>actions.openProject($('project-file').files[0]);
  $('project-name').onchange=()=>actions.renameProject($('project-name').value);
  $('autosave').onchange=()=>{prefs.autosave=$('autosave').checked;actions.preferenceChanged();actions.saveDraft();};
  const library=block('div',`<div class="library-filters" role="group" aria-label="图案筛选"><button data-filter="all">全部</button><button data-filter="favorites">收藏</button><button data-filter="recent">最近</button></div><label class="library-view-label">浏览方式<select id="library-view"><option value="list">列表</option><option value="grid">缩略图网格</option></select></label>`);
  document.querySelector('.library-top').append(library);
  $('library-view').value=prefs.libraryView;
  $('library-view').onchange=()=>{prefs.libraryView=$('library-view').value;actions.preferenceChanged();actions.buildLibrary();};
  for(const button of library.querySelectorAll('[data-filter]'))button.onclick=()=>{prefs.libraryFilter=button.dataset.filter;actions.preferenceChanged();actions.buildLibrary();};
  const view=block('div',`<label>查看缩放<select id="view-zoom"><option value="fit">适应窗口</option><option value="1">100%</option><option value="2">200%</option><option value="4">400%</option><option value="custom" hidden>自定义</option></select></label><button id="view-out" aria-label="缩小画布">−</button><button id="view-in" aria-label="放大画布">＋</button><button id="view-pan" aria-pressed="false">拖动画布</button><label>预览背景<select id="view-background"><option value="checker">棋盘格</option><option value="black">黑色</option><option value="white">白色</option></select></label>`);
  view.className='view-toolbar';$('canvas-stage').after(view);
  $('view-background').value=prefs.previewBackground;
  const surface=document.createElement('div');surface.id='preview-surface';$('preview').before(surface);surface.append($('preview'));
  let zoom='fit',x=0,y=0,pan=false,drag=null,kind=actions.initialExport.kind,format=actions.canFloat()?actions.initialExport.format:'png',animationOpen=false;
  function applyView() {
    const canvas=$('preview'),stage=$('canvas-stage');
    const scale=zoom==='fit'?Math.min((stage.clientWidth-20)/canvas.width,(stage.clientHeight-20)/canvas.height):Number(zoom);
    surface.style.width=`${canvas.width}px`;surface.style.height=`${canvas.height}px`;
    surface.style.transform=`translate(${x}px,${y}px) scale(${Math.max(.05,scale)})`;
    stage.dataset.background=prefs.previewBackground;
    stage.classList.toggle('view-panning',pan);canvas.style.cursor=actions.isGrab()?'grab':pan?'grab':'default';
  }
  function setZoom(next) {zoom=next;x=0;y=0;const select=$('view-zoom');select.value=['fit','1','2','4'].includes(String(next))?String(next):'custom';applyView();}
  $('view-zoom').onchange=()=>setZoom($('view-zoom').value);
  $('view-in').onclick=()=>setZoom(Math.min(8,(zoom==='fit'?1:Number(zoom))*1.25));
  $('view-out').onclick=()=>setZoom(Math.max(.1,(zoom==='fit'?1:Number(zoom))/1.25));
  $('view-background').onchange=()=>{prefs.previewBackground=$('view-background').value;actions.preferenceChanged();applyView();};
  $('view-pan').onclick=()=>{pan=!pan;if(pan)actions.disableGrab();$('view-pan').setAttribute('aria-pressed',String(pan));applyView();};
  const stage=$('canvas-stage');
  stage.addEventListener('pointerdown',(event)=>{if(!pan||actions.isGrab()||actions.isBusy()||event.button!==0)return;drag={startX:event.clientX,startY:event.clientY,x,y};stage.setPointerCapture(event.pointerId);});
  stage.addEventListener('pointermove',(event)=>{if(drag){x=drag.x+event.clientX-drag.startX;y=drag.y+event.clientY-drag.startY;applyView();}});
  stage.addEventListener('pointerup',()=>drag=null);stage.addEventListener('pointercancel',()=>drag=null);
  stage.addEventListener('wheel',(event)=>{if(actions.isGrab()||actions.isBusy())return;event.preventDefault();setZoom(Math.max(.1,Math.min(8,(zoom==='fit'?1:Number(zoom))*Math.exp(-event.deltaY*.001))));},{passive:false});
  window.addEventListener('resize',applyView);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(applyView).observe(stage);
  const animation=block('button','动画 / 时间轴');animation.id='animation-toggle';animation.setAttribute('aria-expanded','false');animation.className='animation-toggle';document.querySelector('.timeline').before(animation);
  function showAnimation(open) {animationOpen=open;document.querySelector('.timeline').hidden=!open;animation.setAttribute('aria-expanded',String(open));animation.textContent=(open ? uiText("workspace.collapseTimeline") : uiText("workspace.animationTimeline"));}
  animation.onclick=()=>{showAnimation(!animationOpen);if(!animationOpen)actions.pause();};
  $('preview-size').closest('label').firstChild.textContent=uiText("workspace.previewResolution");
  $('random').textContent=uiText("workspace.randomPattern");$('random-params').textContent=uiText("workspace.randomizeCurrentParameters");
  $('current-title').textContent=uiText("editor.compositePreview");
  $('context-visible').onclick=actions.toggleVisible;
  function selectTab(id) {pane=id;for(const [key,node]of Object.entries(panes))node.hidden=key!==id;for(const button of context.querySelectorAll('[data-pane]')){button.classList.toggle('active',button.dataset.pane===id);button.setAttribute('aria-pressed',String(button.dataset.pane===id));}}
  for(const button of context.querySelectorAll('[data-pane]'))button.onclick=()=>selectTab(button.dataset.pane);
  $('export-kind').onchange=()=>{kind=$('export-kind').value;const s=actions.getState();if(s.output.mode===4)actions.outputMode(0);if(['batch','frames'].includes(kind))format='png';if(['atlas','frames'].includes(kind))showAnimation(true);refresh(s,actions.active(),false);actions.saveDraft();};
  $('export-format').onchange=()=>{format=$('export-format').value;refresh(actions.getState(),actions.active(),false);actions.saveDraft();};
  $('export-current').onclick=()=>actions.export(kind,format);
  if(!actions.canFloat())$('export-format').querySelector('[value="exr"]').disabled=true;
  function refresh(s,index,playing) {
    const layer=s.layers[index],type=BY_ID.get(layer.type);
    $('editing-context').textContent=uiFormat("workspace.layerValueValue",index+1,type.zh);
    $('editing-context').title=type.id;
    $('context-visible').textContent=(layer.enabled ? uiText("workspace.visible") : uiText("workspace.hidden"));$('context-visible').setAttribute('aria-pressed',String(layer.enabled));
    const blend=$(`layers-${index}-blend`)?.closest('label'),opacity=$(`layers-${index}-opacity`)?.closest('.param-row');
    if(blend&&opacity)layerControls.replaceChildren(blend,opacity);
    const enabled=$(`layers-${index}-enabled`)?.closest('label');if(enabled)enabled.hidden=true;
    for(const button of document.querySelectorAll('[data-filter]')){button.classList.toggle('active',button.dataset.filter===prefs.libraryFilter);button.setAttribute('aria-pressed',String(button.dataset.filter===prefs.libraryFilter));}
    $('type-list').classList.toggle('library-grid',prefs.libraryView==='grid');
    $('current-title').replaceChildren('合成预览');
    if(s.output.mode===4&&kind==='single')kind='atlas';
    $('flipbook-preview').hidden=kind!=='atlas';
    $('export-kind').value=kind;$('export-format').value=format;$('export-format').disabled=['batch','frames'].includes(kind);
    try{$('export-summary').textContent=exportSummary(s,kind,format);}catch(error){$('export-summary').textContent=error.message;}
    $('export').textContent=({single:'导出 PNG',atlas:'导出图集 PNG',frames:'导出逐帧 ZIP',batch:'导出三档 ZIP'})[kind];
    $('export-exr').hidden=['batch','frames'].includes(kind);
    if(playing||Object.keys(s.animation.tracks).length||s.output.mode===4)showAnimation(true);
    applyView();
  }
  selectTab('shape');showAnimation(false);applyView();
  return {refresh,selectTab,showAnimation,applyView,kind:()=>kind,format:()=>format,setSelection:(value)=>{kind=value.kind;format=actions.canFloat()?value.format:'png';},disablePan:()=>{pan=false;drag=null;$('view-pan').setAttribute('aria-pressed','false');applyView();}};
}
