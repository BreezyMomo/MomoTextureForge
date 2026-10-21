import {parameterState} from './parameter-state.js';
import {ARRANGEMENT_LIMITS as LAYOUT_LIMITS} from './arrangement-limits.js';
import {createMaterialPreview} from './material-preview.js';
import {FX_SPECS,fxDefaults} from './post-fx.js';
import {openUserHelp} from './user-help.js';
import {downloadSkill} from './skill-downloads.js';
import {runExportWorker} from './export-job.js';
import {projectDependencyIds,serializeLocalProject,restoreLocalProject} from './project-dependencies.js';
import {GRAPHIC_LIST_KEY,GraphicShelf,serializeGraphicList,restoreGraphicList,canvasProject} from './persistent-graphic-list.js';
import {createProjectResource,replaceProjectResource,publishedProjectResource,linkedProjectResource,renameProjectResource} from './project-resources.js';
import {createGraphicsLibrary,confirmGraphicAction,requestGraphicName} from './graphics-workspace.js';
import {resources} from './resource-assets.js';
import {writeResources} from './resource-storage.js';
const isImage=id=>resources.get(id)?.kind==='image';
import {seamlessDescription,seamlessKind} from './seamless.js';
import {formulaTime} from './formula-time.js';
import {libraryVisible,libraryAliases,libraryVariants,libraryVariantNode} from './library-policy.js';
import {recordValue,sameTime,animatablePaths} from './animation-editing.js';
import {selectionRoots,rangeSelection,duplicateSelection,deleteSelection,groupSelection,moveSelection} from './tree-selection.js';
import {createCanvasEditor} from './canvas-editor.js';
import {assetFor} from './resource-assets.js';
import {encodeResourcePack,readResourcePack,imageAsset} from './resource-pack.js';
import {exportFrameProgress} from './tree-model.js';
import {createAnimationWorkspace} from './tree-animation-workspace.js';
import {outputDimensions,previewDimensions,selectionRegions} from './tree-view.js';
import {patternThumbnails} from './pattern-thumbnails.js';
import {arrangeShortcut} from './workspace-model.js';
import {CATALOG,BY_ID,CATEGORIES,PALETTES} from './catalog.js';
import {project,node,find,walk,cloneNode,removeNode,moveNode,sanitizeTree,pathGet,pathSet,nodeClock,expandInstances,PRESET_SCHEMA,fieldSpec,shapeDefaults,uid,POST_SPECS,animationType,ANIMATION_ENUMS,ANIMATION_BOOLS} from './tree-model.js';
import {pageHref} from './distribution.js';
import {createCurveEditor} from './curve-editor.js';
import {TreeRenderer} from './tree-renderer.js';
import {ARRANGEMENT_FAMILIES,arrangementFamily,arrangementSpec,sanitizeArrangement} from './arrangement.js';
import {EXTRA_LAYOUTS,EXTRA_SPECS} from './tree-arrangement.js';
import {download} from './encoders.js';
import {planPSD} from './tree-psd.js';
import {planContourPSD} from './tree-psd-contours.js';
import {installEditorDocking} from './dock-workspace.js';
import {colorContext,colorBackground,independentColor,normalizeHex} from './inspector-color.js';
const $=id=>document.getElementById(id),el=(tag,props={},children=[])=>{const e=document.createElement(tag);for(const [k,v]of Object.entries(props)){if(k==='text')e.textContent=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(k==='value')e.value=v;else if(k==='checked')e.checked=v;else e.setAttribute(k,v);}for(const c of children)e.append(c);return e;};
const css=el('link',{rel:'stylesheet',href:'tree.css'});if(!document.querySelector('style[data-tree-style]'))document.head.append(css);
if(document.documentElement.dataset.distribution!=='standalone')document.head.append(el('link',{rel:'stylesheet',href:'graphics-workspace.css'}));
if(document.documentElement.dataset.distribution!=='standalone')document.head.append(el('link',{rel:'stylesheet',href:'dock-workspace.css'}));
if(document.documentElement.dataset.distribution!=='standalone')document.head.append(el('link',{rel:'stylesheet',href:'inspector-color.css'}));
document.body.className='tree-editor';document.body.innerHTML=`
<header class="tree-header">
<div class="tree-brand"><strong>MOMO <span>TEXTURE FORGE</span></strong><input id="project-name" aria-label="画布名称" title="画布名称"></div>
<div class="tree-canvas-actions" role="group" aria-label="当前画布操作">
<details class="header-dropdown"><summary>文件</summary><div class="header-dropdown-panel"><button id="new-project">新建画布</button><button id="open-project">打开项目…</button><button id="save-project">保存项目</button><hr><button id="share-project">分享配置</button></div></details>
<button id="undo">撤销</button><button id="redo">重做</button><button id="project-settings">画布设置</button><button id="export-now" class="primary">导出…</button>
</div>
<div class="tree-tool-actions" role="group" aria-label="工具入口"><button id="open-graphics-library">图形库</button><button id="tree-examples">组合示例</button><details class="header-dropdown header-help"><summary>帮助</summary><div class="header-dropdown-panel"><button id="tool-help">使用说明</button><a id="detailed-help" href="https://github.com/BreezyMomo/MomoTextureForge/blob/main/README.md" target="_blank" rel="noopener noreferrer" title="打开项目 README 与图文操作教程（在新标签页打开）">详细说明 ↗</a><hr><button id="download-author-skill" title="辅助AI选择公式、SVG或位图，制作并验证可导入资源">下载创作Skill</button><button id="download-effects-skill" title="让AI讲解如何用编辑器实现效果，提供操作步骤和参数建议">下载效果指导Skill</button><hr><a id="github-repository" href="https://github.com/BreezyMomo/MomoTextureForge" target="_blank" rel="noopener noreferrer" title="查看源码、反馈问题或参与贡献（在新标签页打开）">GitHub 仓库 ↗</a></div></details></div>
<input type="file" id="project-file" accept=".json,.zip" hidden><input type="file" id="preset-file" accept=".json,.zip,.png,.jpg,.jpeg,.webp" hidden></header>
<main class="tree-workspace"><aside class="tree-left"><div class="tree-actions"><button id="add-shape">＋图形</button><button id="add-group">＋组合</button><button id="wrap-top-level" title="将所有一级节点包进一个新组合">添加顶层节点</button><button id="duplicate">复制</button><button id="delete">删除</button><small id="node-count" class="tree-node-count" title="节点数量 / 上限"></small></div><div id="component-nav" class="tree-actions" hidden></div><div id="node-tree" role="tree" aria-label="画布节点树"></div><hr><div class="tree-actions"><button id="collapse-library">收起全部</button></div><input id="shape-search" placeholder="搜索图形列表" aria-label="搜索组件"><label class="tree-library-filter"><span>图形类型</span><select id="library-filter" aria-label="组件类型"><option value="all">全部资源</option><option value="formula">公式</option><option value="image">图片</option><option value="composition">组合</option></select></label><label class="tree-library-filter tree-library-view"><span>浏览方式</span><select id="shape-library-view" aria-label="图形库浏览方式"><option value="grid">缩略图网格</option><option value="list">列表</option></select></label><div id="shape-library" class="tree-library-grid"></div></aside>
<section class="tree-preview"><nav id="breadcrumbs" aria-label="节点路径"></nav><div class="preview-heading"><strong id="preview-title">合成预览</strong><label class="preview-mode-label">贴图类型<select id="preview-channel" aria-label="预览贴图类型"><option value="color">颜色</option><option value="height">高度</option><option value="normal">法线</option><option value="rgba">自定义 RGBA</option></select></label><label class="preview-mode-label">预览模式<select id="preview-mode" aria-label="预览模式"><option value="canvas">二维画布</option><option value="material">三维材质</option></select></label><span id="render-status">加载中</span><div class="preview-actions"><button id="return-work" hidden>返回画布</button><button id="preview-add" hidden>添加此组件</button><button id="preview-reset" hidden>恢复资源初始状态</button><button id="preview-save" hidden>保存为新组件</button><button id="preview-update" hidden>更新原组件</button><button id="preview-undo-update" hidden>撤销更新</button><button id="save-selected-component" aria-label="保存选中节点到图形库" title="保存选中的节点及其子节点">保存选中节点到图形库</button><button id="save-whole-library" title="将当前画布上的所有节点保存为一个组合资源">保存整个画布到图形库</button><button id="save-project-resource">另存到图形列表</button><button id="update-project-resource">更新到图形列表</button><button id="solo" aria-pressed="false">单独预览</button></div></div><div id="normal-preview-settings" class="normal-preview-settings" role="group" aria-label="法线生成参数" hidden></div><div id="material-preview-controls" hidden></div><div id="canvas-stage" class="checker"><div id="tree-preview-surface"><canvas id="tree-canvas" aria-label="节点树贴图预览"></canvas><svg id="selection-guide" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="选中节点区域" hidden></svg></div><div id="material-preview" hidden></div></div><div id="preview-error" role="alert" hidden><span></span><button id="retry-render">重试预览</button></div><div id="guide-note" class="tree-note"></div><div id="preview-2d-toolbar" class="tree-toolbar"><label>查看缩放<select id="zoom"><option value="fit">适应窗口</option><option value="0.25">25%</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%（适应大小）</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option><option value="3">300%</option><option value="4">400%</option></select></label><label>背景<select id="background"><option value="checker">棋盘格</option><option value="black">黑色</option><option value="white">白色</option></select></label><label><input type="checkbox" id="show-guides">节点区域</label><label><input type="checkbox" id="show-pivot" checked>显示轴心</label><button id="tile-preview" aria-pressed="false">平铺检查</button><button id="pan-preview" aria-pressed="false">移动画布</button><button id="grab-uv" aria-pressed="false">操控 UV</button></div><div class="tree-timeline" role="group" aria-label="动画播放控制"><button id="play">播放</button><button id="restart-play">重新播放</button><label class="play-duration">播放时长 <input id="play-duration" type="number" min="0.05" max="600" step="0.05" aria-label="播放时长（秒）" title="当前范围从0到1的播放时长，与画布导出时长同步"> 秒</label><label>当前范围进度 <output id="time-value">0.000</output></label><input id="tree-time" type="range" min="0" max="1" step="0.001" value="0" aria-label="当前范围滑动进度"><span id="local-time"></span></div><details id="animation-panel"><summary>动画编辑与时间轴</summary><div id="node-animation-editor"></div></details><p id="preview-hint" class="tree-hint">单击选择 · 拖动移动 · 双击进入组合 · 空白拖动框选 · Space 移动画布 · Alt 切换重叠节点 · Esc 取消拖动</p></section>
<aside class="tree-inspector"><div id="selected-heading"></div><div id="selected-path" class="tree-note"></div><div id="inspector-color-quick" class="inspector-color-quick" hidden></div><nav id="inspector-tabs"></nav><div id="inspector"></div></aside></main><div id="tree-toast" role="status"></div><div id="global-panel" class="tree-modal" role="dialog" aria-modal="true" aria-labelledby="global-title" hidden><section><header><h2 id="global-title"></h2><button id="close-global" aria-label="关闭面板">关闭</button></header><div id="global-controls"></div></section></div>`;
let state=project();state.root.children=[];
let quickColorExpanded=false;
let selected=state.root.id,time=0,formulaSeconds=0,section='shape',solo=false,playing=false,tiled=false,busy=false,history=[],future=[],pending=false,globalPanel=null,formTarget='inspector',dragged=null,exportKind='png',componentPreview=null,cancelExport=false,contourThreshold=50,contourSmooth=true;
const shelf=new GraphicShelf();let shelfStorageError=null;
const recentKey='momo-texture-tree:recent:v1';let recent=[];try{recent=JSON.parse(localStorage.getItem(recentKey)||'[]');}catch{}
let selectedIds=new Set([selected]),selectionPrimary=selected,selectionAnchor=selected,canvasEditor=null;
function reconcileSelection(){if(selectionPrimary!==selected){selectedIds=new Set(selected===state.root.id?[]:[selected]);selectionPrimary=selected;}selectedIds=new Set([...selectedIds].filter(id=>id!==state.root.id&&find(state.root,id)));}
function setSelection(ids,primary=ids.at(-1)){if(ids.length>1)solo=false;selectedIds=new Set(ids);selected=primary??state.root.id;selectionPrimary=selected;revealAncestors(selected);refresh();}
function multiSelect(id,e={}){reconcileSelection();if(e.shiftKey){const order=[...$('node-tree').querySelectorAll('[data-node-id]')].map(x=>x.dataset.nodeId);setSelection([...new Set([...(e.ctrlKey||e.metaKey?selectedIds:[]),...rangeSelection(order,selectionAnchor,id)])],id);}else if(e.ctrlKey||e.metaKey){const ids=new Set(selectedIds);ids.has(id)?ids.delete(id):ids.add(id);setSelection([...ids],ids.has(id)?id:[...ids].at(-1));selectionAnchor=id;}else{selectionAnchor=id;setSelection([id],id);}}
function selectedRoots(){reconcileSelection();return selectionRoots(state.root,selectedIds);}
function remember(id){recent=[id,...recent.filter(x=>x!==id)].slice(0,24);try{localStorage.setItem(recentKey,JSON.stringify(recent));}catch{}}
const previewSessions=new Map();let workSession=null,sessionScroll=null;
function captureSession(){return {state,selected,selection:[...selectedIds],time,section,solo,tiled,history,future,localAnimationPreview,zoom:$('zoom').value,background:$('background').value,scroll:[$('canvas-stage').scrollLeft,$('canvas-stage').scrollTop]};}
function restoreSession(c){({state,selected,time,section,solo,tiled,history,future,localAnimationPreview}=c);selectedIds=new Set((c.selection??[selected]).filter(id=>find(state.root,id)));if(selected!==state.root.id)selectedIds.add(selected);selectionPrimary=selected;state=shelf.bind(state);canvasEditor?.reset();$('zoom').value=c.zoom;$('background').value=c.background;$('canvas-stage').className=c.background;$('canvas-stage').classList.toggle('material-mode',materialMode());$('tree-time').value=time;$('tile-preview').setAttribute('aria-pressed',String(tiled));sessionScroll=c.scroll;$('play').textContent=playing?'暂停':'播放';animationEditMode='normal';animationEditor.setScope(state.root.id);}
function cachePreview(){if(componentPreview)componentPreview.session=captureSession();}
function projectOwner(){return workSession?.state??state;}
function originalPreset(){return componentPreview&&projectOwner().projectResources.find(p=>'preset:'+p.id===componentPreview.id);}
function previewButtons(){const linked=linkedProjectResource(projectOwner().projectResources,current());$('save-project-resource').textContent=linked?'另存到图形列表':'保存到图形列表';$('save-project-resource').hidden=!!componentPreview;$('preview-update').textContent='更新到图形列表';$('preview-save').textContent='另存到图形列表';$('update-project-resource').hidden=!!componentPreview||!linked;$('preview-update').hidden=!originalPreset();$('preview-undo-update').hidden=!(originalPreset()&&componentPreview.previousUpdate);$('solo').hidden=!!componentPreview;for(const id of ['return-work','preview-add','preview-reset','preview-save'])$(id).hidden=!componentPreview;$('preview-add').textContent='添加到画布';$('save-project').disabled=!!componentPreview;$('share-project').disabled=!!componentPreview;}
function browse(p){if(busy)return;cachePreview();if(!componentPreview)workSession=captureSession();let entry=previewSessions.get(p.id);if(!entry){const draft=project();draft.name=p.name;draft.root.name='资源试编辑';draft.root.children=[cloneNode(p.preset.root)];draft.root.children[0].resourceRef=p.preset.id;entry={id:p.id,name:p.name,original:structuredClone(draft),session:{...captureSession(),state:draft,selected:draft.root.children[0]?.id??draft.root.id,time:0,solo:false,tiled:false,history:[],future:[],localAnimationPreview:null}};previewSessions.set(p.id,entry);}entry.name=p.name;componentPreview=entry;restoreSession(entry.session);solo=false;remember(p.id);previewButtons();refresh();}
function returnWork(){if(busy)return;if(componentPreview){cachePreview();componentPreview=null;restoreSession(workSession);workSession=null;previewButtons();refresh();}else requestRender();}
function previewComponent(){if(!state.root.children.length)throw Error('请先添加内容节点');if(state.root.children.length===1)return cloneNode(state.root.children[0]);const result=cloneNode(state.root);result.name=componentPreview.name;return result;}
$('return-work').onclick=returnWork;$('preview-add').onclick=()=>{if(!componentPreview||busy)return;if(!state.root.children.length){notify('请先添加内容节点');return;}const copy=cloneNode(previewComponent());returnWork();insert(copy);};
$('preview-reset').onclick=()=>{if(!componentPreview)return;edit(()=>{state=structuredClone(componentPreview.original);selected=state.root.children[0].id;});};
$('preview-save').onclick=()=>{if(componentPreview)state.root.children.length?saveComponent(previewComponent(),state.root.children.length>1):notify('请先添加内容节点');};
function storePresetReplacement(existing,root){const owner=projectOwner();root.resourceRef=existing.id;owner.projectResources=owner.projectResources.map(p=>p.id===existing.id?replaceProjectResource(p,root):p);persistSharedResources();localStorage.setItem(storageKey,serializeLocalProject(canvasProject(owner)));libraryThumbs.invalidate('preset:'+existing.id);library();previewButtons();}
$('preview-update').onclick=async()=>{if(busy)return;const existing=originalPreset();if(!existing)return;
 if(!await confirmGraphicAction(`确认更新组件“${existing.name}”？\n将用当前整个试编辑结果覆盖图形列表中的原组件。\n已添加到画布中的实例不会改变。`))return;
 try{const previous={root:structuredClone(existing.root),forest:existing.forest===true,original:structuredClone(componentPreview.original)};const replacement=cloneNode(previewComponent());replacement.name=existing.name;storePresetReplacement(existing,replacement,state.root.children.length>1);componentPreview.previousUpdate=previous;componentPreview.original=structuredClone(state);previewButtons();notify('已更新原组件；已有实例未改变');}catch(e){notify('更新失败：'+e.message);}
};
$('preview-undo-update').onclick=()=>{if(busy)return;const existing=originalPreset(),previous=componentPreview?.previousUpdate;if(!existing||!previous)return;try{storePresetReplacement(existing,previous.root,previous.forest);componentPreview.original=previous.original;delete componentPreview.previousUpdate;previewButtons();notify('已撤销图形列表更新，当前试编辑内容保留');}catch(e){notify('撤销更新失败：'+e.message);}};

const collapsedNodes=new Set(),advancedOpen=new Set(),typeMemory=new Map();
function revealAncestors(id){let entry=find(state.root,id);while(entry?.parent){collapsedNodes.delete(entry.parent.id);entry=find(state.root,entry.parent.id);}}
const storageKey='momo-texture-tree:draft:v1';
const notify=text=>{$('tree-toast').textContent=text;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('tree-toast').textContent='',5000);};
try{const saved=localStorage.getItem(storageKey);if(saved){state=sanitizeTree(restoreLocalProject(JSON.parse(saved)));selected=state.root.id;}}catch(error){notify('未恢复无效草稿：'+error.message);}
try{const saved=localStorage.getItem(GRAPHIC_LIST_KEY);shelf.entries=saved===null?state.projectResources:restoreGraphicList(saved);}catch(e){shelfStorageError=e.message;shelf.entries=state.projectResources;notify('未恢复常用图形列表：'+e.message);}state=shelf.bind(state);
try{if(location.hash.startsWith('#tree=')){const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(location.hash.slice(6)),c=>c.charCodeAt(0))));const incoming=sanitizeTree(data);state=shelf.bind(incoming);selected=state.root.id;}}catch(e){notify('分享配置无效：'+e.message);}
$('preview-channel').value=state.output.mode;
let materialPreview=null;
const materialMode=()=>$('preview-mode').value==='material';
function previewModeChanged(){
 const material=materialMode();$('tree-preview-surface').hidden=material;$('material-preview').hidden=!material;$('material-preview-controls').hidden=!material;$('preview-2d-toolbar').hidden=material;$('canvas-stage').classList.toggle('material-mode',material);
 $('preview-hint').textContent=material?'拖动旋转视角 · 颜色显示平贴花纹，法线显示中性材质的凹凸受光 · 导出内容在导出面板单独选择':'单击选择 · 拖动移动 · 双击进入组合 · 空白拖动框选 · Space 移动画布 · Alt 切换重叠节点 · Esc 取消拖动';
 requestRender();
}
$('preview-mode').onchange=previewModeChanged;
$('preview-channel').onchange=()=>{renderPreviewSettings();requestRender();};
let renderer=new TreeRenderer(document.createElement('canvas'));
const display=$('tree-canvas').getContext('2d');
function watchContext(){renderer.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showRenderError('图形上下文丢失，等待恢复后可重试');});renderer.canvas.addEventListener('webglcontextrestored',()=>{$('retry-render').click();});}watchContext();
const current=()=>find(state.root,selected)?.node??state.root;
let resourcePersist=Promise.resolve();
function persistSharedResources(){if(shelfStorageError)throw Error('常用图形列表读取失败，已保留原存储数据：'+shelfStorageError);localStorage.setItem(GRAPHIC_LIST_KEY,serializeGraphicList(shelf.entries));const dependencies=projectDependencyIds(projectOwner()),snapshot=[...resources].filter(([id])=>dependencies.has(id));resourcePersist=resourcePersist.then(()=>writeResources(snapshot)).catch(e=>notify('资源保存失败：'+e.message));}
function persist(){if(componentPreview){cachePreview();return;}try{persistSharedResources();localStorage.setItem(storageKey,serializeLocalProject(canvasProject(state)));}catch{notify('自动保存失败，请保存项目文件');}}
function validatedState(p){const result=sanitizeTree(shelf.bind(p));shelf.entries=result.projectResources;return shelf.bind(result);}
function recordHistory(before){shelf.record(before);history.push(before);}
function edit(fn,{rebuild=true}={}){if(busy)return false;const before=structuredClone(state),previousSelection=selected;try{fn();state=validatedState(state);if(selected!==previousSelection)revealAncestors(selected);recordHistory(before);if(history.length>60)history.shift();future=[];if(!find(state.root,selected))selected=state.root.id;persist();if(rebuild)refresh();else requestRender();return true;}catch(error){shelf.entries=before.projectResources;state=shelf.bind(before);notify(error.message);refresh();return false;}}
let previewDragging=false,previewIdleTimer;
document.addEventListener('pointerdown',e=>{if(e.target.closest('input[type=range],canvas,svg'))previewDragging=true;});
const finishPreviewDrag=()=>{if(previewDragging){previewDragging=false;requestRender();}};
document.addEventListener('pointerup',finishPreviewDrag);document.addEventListener('pointercancel',finishPreviewDrag);window.addEventListener('blur',finishPreviewDrag);
let inspectorVariant='',localAnimationPreview=null,animationEditMode='normal',animationGesture=null;
function stopAnimation(){playing=false;$('play').textContent='播放';}
function setAnimationMode(mode){stopAnimation();animationEditMode=mode;$('animation-panel').open=true;refresh();}
function beginAnimationGesture(){stopAnimation();animationGesture??=structuredClone(state);}
function endAnimationGesture(){if(!animationGesture)return;const before=animationGesture;animationGesture=null;try{state=validatedState(state);if(JSON.stringify(state)!==JSON.stringify(before)){recordHistory(before);if(history.length>60)history.shift();future=[];}persist();refresh();}catch(e){state=before;notify(e.message);refresh();}}
function cancelAnimationGesture(){if(animationGesture){state=animationGesture;animationGesture=null;refresh();}}
function seekAnimationScope(id,t){stopAnimation();formulaSeconds=t*state.output.seconds;if(id===state.root.id){localAnimationPreview=null;time=t;}else localAnimationPreview={id,time:t};requestRender();}
function assignAnimated(n,path,value){
 if(animationEditMode==='record'&&fieldSpec(n,path)){recordValue(n,path,animationClock(n.id).progress,value);return;}
 if(animationEditMode==='normal'&&n.tracks?.[path]&&!n.tracks[path].muted&&n.animationEnabled!==false)throw Error('此参数由动画控制，请开启录制或选择编辑基础值');
 pathSet(n,path,value);
}
function animationValue(n,path){return animationEditMode==='base'?pathGet(n,path):pathGet(animationClock(n.id).node,path);}
function decorateAnimated(input,n,path){input.dataset.animationPath=path;input.dataset.animationNode=n.id;input.disabled=animationEditMode==='normal'&&!!n.tracks[path]&&!n.tracks[path].muted&&n.animationEnabled!==false;}
function syncParameterStates(){
 const n=current();if(n===state.root)return;const evaluated=animationEditMode==='base'?n:animationClock(n.id).node,seen=new Set();
 for(const input of document.querySelectorAll('#inspector [data-animation-path],#inspector-color-quick [data-animation-path]')){
  const path=input.dataset.animationPath,info=parameterState(n,evaluated,path,animationEditMode);
  input.disabled=info.locked;input.dataset.originalTitle??=input.title;
  input.title=[input.dataset.originalTitle,info.locked?'此参数由动画控制，可开启录制修改关键帧，或切换基础值。':'',info.dependency].filter(Boolean).join('\n');
  if(!input.closest('#inspector'))continue;
  const row=input.closest('.tree-field,.tree-check');if(!row)continue;
  const id='parameter-state-'+n.id+'-'+path.replaceAll('.','-');input.setAttribute('aria-describedby',id);
  if(seen.has(row))continue;seen.add(row);
  row.querySelector('[aria-label^="重置 "]')?.toggleAttribute('disabled',info.locked);
  let hint=row.querySelector('.parameter-state');if(!hint){hint=el('span',{class:'parameter-state',id});row.append(hint);}
  const signature=JSON.stringify(info);if(hint.dataset.state===signature)continue;hint.dataset.state=signature;hint.hidden=!info.animation&&!info.dependency;hint.replaceChildren();
  if(info.animation){hint.append(el('span',{class:'parameter-state-badge',text:info.animation}));if(info.locked)for(const [mode,text]of [['record','录制修改'],['base','编辑基础值']])hint.append(el('button',{type:'button',text,onclick:e=>{e.stopPropagation();setAnimationMode(mode);}}));}
  if(info.dependency)hint.append(el('span',{class:'parameter-dependency',text:info.dependency}));
 }
}
function inspectorVariantKey(n){const context=colorContext(state.root,n.id,x=>animationClock(x.id).node);return JSON.stringify([context?.source?.id,context?.override?.id,context&&intrinsicColor(context.local),n.id,n.arrange[0],n.arrange[30],n.arrange[33]>1,n.arrange[39],n.color.mode,n.color.fill,n.shapeClock?.follow,n.type==='Star'?n.params[5]:n.type==='Gear'?n.params[8]:null,n.seamless,n.arrangeExtra.gradient,n.arrangeExtra.flow,n.arrangeExtra.weave]);}
function syncAnimatedFields(){const n=current(),value=animationEditMode==='base'?n:animationClock(n.id).node,progress=animationClock(n.id).progress;if(!previewDragging&&inspectorVariant!==inspectorVariantKey(value))inspector();
 syncColorQuick();
 for(const input of document.querySelectorAll('#inspector [data-animation-path],#inspector-color-quick [data-animation-path]')){if(document.activeElement===input)continue;const path=input.dataset.animationPath,v=pathGet(value,path);if(input.type==='checkbox')input.checked=!!v;else input.value=input.hasAttribute('data-packed-color')?'#'+Math.round(v).toString(16).padStart(6,'0'):input.hasAttribute('data-color-hex')?String(v).toUpperCase():String(input.dataset.animationScale?Math.round(v*Number(input.dataset.animationScale)*100)/100:input.dataset.animationFamily?arrangementFamily(v):v);}
 for(const b of $('inspector').querySelectorAll('[data-key-path]')){const path=b.dataset.keyPath,track=n.tracks[path],here=track?.keys.some(k=>sameTime(k[0],progress));b.textContent=here?'◆':track?'◈':'◇';b.classList.toggle('key-at-cursor',!!here);b.title=here?'当前位置已有关键帧，点击更新':track?'参数已有动画，点击在当前位置记录':'添加此参数动画';}
 syncParameterStates();
}
function keyButton(n,path,label){return el('button',{'data-key-path':path,text:n.tracks[path]?'◈':'◇','aria-label':label+'关键帧',onclick:()=>{stopAnimation();edit(()=>{const live=find(state.root,n.id)?.node;if(live)recordValue(live,path,animationClock(n.id).progress,animationValue(live,path));});}});}
function animatedCheck(label,path){const n=current(),input=el('input',{type:'checkbox',checked:animationValue(n,path),onchange:()=>edit(()=>{const live=current();if(path==='shapeClock.follow'&&!input.checked&&!live.tracks['shapeClock.value'])assignAnimated(live,'shapeClock.value',formulaTime(animationClock(live.id).node,formulaSeconds));assignAnimated(live,path,input.checked);}),'aria-label':label});decorateAnimated(input,n,path);controls().append(el('label',{class:'tree-check'},[input,document.createTextNode(label),keyButton(n,path,label)]));}
function animatedChoice(label,path,options){const n=current(),input=choice(label,animationValue(n,path),options,v=>edit(()=>assignAnimated(current(),path,v)));decorateAnimated(input,n,path);input.parentElement.append(keyButton(n,path,label));}

function animationPreviewProject(){if(!localAnimationPreview&&animationEditMode!=='base')return state;const p=structuredClone(state);if(localAnimationPreview){const n=find(p.root,localAnimationPreview.id)?.node;if(n){n.timing={...n.timing,frozen:true,at:localAnimationPreview.time,before:'hold',after:'hold',outside:'hold'};if(n.id===p.root.id)n.previewProgress=localAnimationPreview.time;}}if(animationEditMode==='base'){for(const id of selectedIds){const n=find(p.root,id)?.node;if(n)n.animationEnabled=false;}}return p;}
function animationClock(id){const root=animationPreviewProject().root;return nodeClock(root,id,time)??nodeClock(root,root.id,time);}
function animationLabel(path,n=current()){if(path.startsWith('params.'))return BY_ID.get(n.type)?.parameters.find(p=>p.slot===+path.split('.')[1])?.label??path;if(path.startsWith('uv.'))return ['UV缩放','UV旋转','UV偏移X','UV偏移Y','UV滚动速度','UV滚动方向','UV漩涡'][+path.split('.')[1]]??path;if(path.startsWith('post.'))return POST_SPECS[+path.split('.')[1]]?.[0]??path;if(path.startsWith('arrange.'))return arrangementSpec(n.arrange[0],+path.split('.')[1],n.arrange)?.label??path;return ({'shapeClock.follow':'自动播放','shapeClock.speed':'运动速度','shapeClock.offset':'时间偏移（秒）','shapeClock.value':'图形时间','contour.mode':'轮廓方式','contour.radius':'轮廓宽度','transform.x':'位置 X','transform.y':'位置 Y','transform.width':'区域宽','transform.height':'区域高','transform.rotation':'旋转','transform.pivotX':'轴心 X','transform.pivotY':'轴心 Y',opacity:'透明度',enabled:'显示节点','color.low':'暗部颜色','color.high':'亮部颜色','color.mode':'配色模式','color.fill':'着色方式',blend:'混合方式','transform.fit':'区域适配','transform.mirrorX':'水平镜像',seamless:'无缝重复',polar:'极坐标',invert:'反相',instancePhase:'实例相位'})[path]??path;}
const animationEditor=createAnimationWorkspace($('node-animation-editor'),{
 getRoot:()=>state.root,isVirtualRoot:n=>n.id===state.root.id,selectNode:id=>select(id,true),progressNode:id=>animationClock(id).progress,
 seekNode:seekAnimationScope,getNode:current,getProgress:()=>animationClock(selected).progress,isLocal:()=>localAnimationPreview?.id===selected,
 label:animationLabel,change:fn=>edit(fn),seek:t=>seekAnimationScope(selected,t),returnWork:()=>{localAnimationPreview=null;requestRender();},
 editMode:()=>animationEditMode,setEditMode:setAnimationMode,value:(id,path)=>animationValue(find(state.root,id).node,path),
 discardGesture:()=>{animationGesture=null;},beginGesture:beginAnimationGesture,previewGesture:fn=>{fn();requestRender();},endGesture:endAnimationGesture,cancelGesture:cancelAnimationGesture,
 isInteracting:()=>previewDragging,notify,confirm:message=>window.confirm(message),frames:()=>Math.max(1,state.output.seconds*state.output.fps),togglePlay:()=>$('play').click()
});
let lastAnimationNode=null,lastAnimationKeyCount=0;
function updateAnimationEditor(){const n=current(),count=Object.values(n.tracks).reduce((s,t)=>s+t.keys.length,0);if(lastAnimationNode!==n.id){lastAnimationKeyCount=count;lastAnimationNode=n.id;}else if(count>lastAnimationKeyCount)$('animation-panel').open=true;lastAnimationKeyCount=count;animationEditor.update();}
function requestRender(){if(previewDragging){clearTimeout(previewIdleTimer);previewIdleTimer=setTimeout(finishPreviewDrag,180);}if(pending||busy)return;pending=true;requestAnimationFrame(()=>{pending=false;if(!busy)render();});}
function showRenderError(message){playing=false;$('play').textContent='播放';$('preview-error').hidden=false;$('preview-error').querySelector('span').textContent=message+' · 已保留上次成功画面';$('render-status').textContent='预览更新失败';}
function render(){try{
 canvasHitCache.clear();
 const source=animationPreviewProject(),preview={...source,output:{...source.output,mode:$('preview-channel').value}};const stage=$('canvas-stage'),zoom=$('zoom').value==='fit'?1:Number($('zoom').value);
 const quick=previewDragging||playing;
 if(materialMode()){
  materialPreview??=createMaterialPreview($('material-preview'),{controls:$('material-preview-controls'),onError:showRenderError,onStatus:text=>$('render-status').textContent=text});
  materialPreview.update(preview,{time,formulaSeconds,solo:solo?selected:null,quick,renderer});
 }else{
 const dims=previewDimensions(state.canvas.ratio,Math.max(64,(stage.clientWidth||512)-56),Math.max(64,(stage.clientHeight||512)-56),zoom,tiled?2:1,window.devicePixelRatio||1,Math.min(renderer.base.maxSize,quick?1024:2048));
 let reduced=false;
 try{renderer.draw(preview,dims.width,dims.height,{time,formulaSeconds,solo:solo?selected:null,quality:quick?1:2});}catch(error){
  if(!error.message.includes('纹理预算')||Math.max(dims.width,dims.height)<=256)throw error;
  try{renderer.draw(preview,dims.width,dims.height,{time,formulaSeconds,solo:solo?selected:null,quality:1});}catch(fallbackError){if(!fallbackError.message.includes('纹理预算'))throw fallbackError;dims.width=Math.max(1,Math.round(dims.width/2));dims.height=Math.max(1,Math.round(dims.height/2));renderer.draw(preview,dims.width,dims.height,{time,formulaSeconds,solo:solo?selected:null,quality:1});}reduced=true;
 }
 // Leaf passes may resize their hidden canvas; only publish a fully rendered frame.
 const canvas=$('tree-canvas'),copies=tiled?2:1,width=dims.width*copies,height=dims.height*copies;if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
 display.clearRect(0,0,width,height);for(let y=0;y<copies;y++)for(let x=0;x<copies;x++)display.drawImage(renderer.canvas,x*dims.width,y*dims.height);
 $('render-status').textContent=`${quick?'交互预览':'高清预览'} ${dims.width}×${dims.height}${reduced?'（复杂画布降低采样精度）':''} · ${renderer.lastMs.toFixed(1)} ms`;
 }
 $('preview-error').hidden=true;
 $('preview-title').textContent=componentPreview?'资源试编辑 · '+componentPreview.name:localAnimationPreview?'动画预览 · '+(find(state.root,localAnimationPreview.id)?.node.name??'画布'):solo?'单独预览 · '+current().name:'合成预览';$('solo').classList.toggle('active',solo);$('solo').setAttribute('aria-pressed',String(solo));$('solo').textContent=solo?'返回整体预览':'单独预览';
 updateActualCount();
 const c=nodeClock(preview.root,selected,time);$('local-time').textContent=`节点局部 ${c.local.toFixed(3)} → 动画 ${c.progress.toFixed(3)}${c.visible?'':' · 隐藏'}`;const scopeTime=animationClock(animationEditor.getScope()).progress;$('time-value').textContent=scopeTime.toFixed(3);$('tree-time').value=scopeTime;
 sizePreview();if(sessionScroll){[$('canvas-stage').scrollLeft,$('canvas-stage').scrollTop]=sessionScroll;sessionScroll=null;}drawGuides();syncAnimatedFields();updateAnimationEditor();
 }catch(error){showRenderError(error.message);}}
function refresh(){state=shelf.bind(state);reconcileSelection();if(localAnimationPreview&&!find(state.root,localAnimationPreview.id))localAnimationPreview=null;if(!find(state.root,selected))selected=state.root.id;library();previewButtons(); $('project-name').value=state.name;$('play-duration').value=state.output.seconds;const noNode=selected===state.root.id;if($('group-selected'))$('group-selected').disabled=noNode;for(const id of ['duplicate','delete','save-selected-component'])$(id).disabled=noNode;tree();inspector();if(globalPanel)renderGlobalPanel();renderPreviewSettings();requestRender();$('undo').disabled=!history.length;$('redo').disabled=!future.length;}
function select(id,keepTimeline=false){selectionAnchor=id;setSelection(id===state.root.id?[]:[id],id);}
function tree(){
 const nav=$('component-nav');nav.hidden=!componentPreview;nav.replaceChildren();if(componentPreview)nav.append(el('button',{text:'← 返回画布',onclick:returnWork}),el('span',{text:componentPreview.name}));
 const root=$('node-tree');root.onclick=e=>{if(e.target===root)select(state.root.id);};root.setAttribute('aria-multiselectable','true');root.replaceChildren();let count=0;walk(state.root,()=>count++);
 function row(n,depth=0,mask=false){
  const branch=n.children.length>0||!!n.mask,expanded=!collapsedNodes.has(n.id);
  const line=el('div',{class:'tree-node'+(selectedIds.has(n.id)?' selected':'')+(n.id===selected?' primary-selected':''),role:'treeitem','aria-selected':selectedIds.has(n.id),'aria-level':depth+1,style:`padding-left:${depth*14}px`});
  if(branch)line.setAttribute('aria-expanded',String(expanded));
  if(n.id!==state.root.id)line.append(el('span',{class:'node-drag-handle',text:'⠿',draggable:'true','aria-label':'拖动 '+n.name,title:'拖动改父级或排序：中间移入组合，上下边缘调整顺序'}));
  line.append(el('button',{text:n.enabled?'●':'○','aria-label':'显示 '+n.name,onclick:()=>edit(()=>{const value=!n.enabled;for(const target of selectedIds.has(n.id)?selectedRoots():[n])target.enabled=value;})}));
  if(branch)line.append(el('button',{class:'tree-disclosure',text:expanded?'▾':'▸','aria-label':(expanded?'收起 ':'展开 ')+n.name,'aria-expanded':expanded,onclick:()=>{if(expanded)collapsedNodes.add(n.id);else collapsedNodes.delete(n.id);tree();}}));
  else line.append(el('span',{class:'tree-disclosure-placeholder','aria-hidden':'true'}));
  line.append(el('button',{text:(mask?'◐ ':({over:n.kind==='group'?'▣ ':'◇ ',add:'＋ ',max:'↑ ',multiply:'× ',subtract:'− ',screen:'◩ ',difference:'≠ ',overlay:'▧ ',softlight:'◒ ',dodge:'☀ ',mask:'◐ ',inverseMask:'◑ '}[n.blend]??'◇ '))+n.name,onclick:e=>multiSelect(n.id,e),'aria-label':'选择 '+n.name}));attachDrag(line,n);root.append(line);
  if(expanded){n.children.forEach(c=>row(c,depth+1));if(n.mask)row(n.mask,depth+1,true);}
 }
 state.root.children.forEach(c=>row(c));if(state.root.mask)row(state.root.mask,0,true);$('node-count').textContent=`${count-1}/255`;
 const path=[];let entry=find(state.root,selected);while(entry){if(entry.node!==state.root)path.unshift(entry.node);entry=entry.parent?find(state.root,entry.parent.id):null;}
 $('breadcrumbs').replaceChildren(...path.map(n=>el('button',{text:n.name,onclick:()=>select(n.id)})));
 canvasEditor?.navigation();
 const drop=el('div',{class:'tree-root-drop',text:'拖到此处移至顶层','aria-label':'顶层投放区',onclick:()=>{select(state.root.id);}});root.append(drop);
 drop.ondragover=e=>{if(busy||!find(state.root,dragged)?.parent)return;e.preventDefault();drop.classList.add('active');if(e.dataTransfer)e.dataTransfer.dropEffect='move';};
 drop.ondragleave=()=>drop.classList.remove('active');
 drop.ondrop=e=>{e.preventDefault();drop.classList.remove('active');const id=dragged;dragged=null;if(busy||!find(state.root,id)?.parent)return;edit(()=>{moveSelection(state.root,selectedIds,state.root.id);selected=id;revealAncestors(id);});};

}
function controls(){return typeof formTarget==='string'?$(formTarget):formTarget;}
function heading(text){controls().append(el('h3',{text}));}
function updateActualCount(){const count=renderer.lastCounts.get(selected);if($('actual-count')){const n=animationClock(selected).node,scatter=[7,12].includes(n.arrange[0]);$('actual-count').textContent=count===undefined?'':`实际生成 ${count} 份${scatter?' / 目标 '+n.arrange[3]+' 份':''}${scatter&&n.scatterAvoidOverlap&&count<n.arrange[3]?'；空间不足或密度限制，可减小尺寸/间距、扩大布局区域':''}`;}}
function arrangementRecords(a,n,t,original,aspect){return renderer.records(n,t,{original,aspect});}
function check(label,value,onchange){const input=el('input',{type:'checkbox',checked:value,onchange:()=>onchange(input.checked),'aria-label':label});controls().append(el('label',{class:'tree-check'},[input,document.createTextNode(label)]));return input;}
function choice(label,value,options,onchange){const input=el('select',{'aria-label':label},options.map(([v,t])=>el('option',{value:v,text:t})));input.value=String(value);input.onchange=()=>onchange(input.value);controls().append(el('label',{class:'tree-field'},[document.createTextNode(label),input]));return input;}
function colorInput(label,value,assign,path=null){
 const n=current();if(path)value=animationValue(n,path);const input=el('input',{type:'color',value,'aria-label':label});if(path)decorateAnimated(input,n,path);let before=null,last=value;
 const update=()=>{if(busy){input.value=last;return;}if(input.value===last)return;before??=structuredClone(state);stopAnimation();try{if(path)assignAnimated(current(),path,input.value);else assign(input.value);last=input.value;requestRender();}catch(e){notify(e.message);input.value=last;}};
 const commit=()=>{if(!before)return;const previous=before;before=null;
  try{state=validatedState(state);if(JSON.stringify(state)!==JSON.stringify(previous)){recordHistory(previous);if(history.length>60)history.shift();future=[];}persist();refresh();}
  catch(error){state=previous;notify(error.message);refresh();}
 };
 input.oninput=update;input.onchange=()=>{update();commit();};input.onblur=commit;return input;
}
function field(label,path,min,max,step=.01,{target=current(),key=true}={}){
 const targetId=target.id,resolve=()=>targetId?find(state.root,targetId)?.node:state;target=resolve();const animatable=!!targetId&&key&&!!fieldSpec(target,path);
 const assign=value=>{const live=resolve();if(!live)return;if(path==='output.width'||path==='output.height')Object.assign(state.output,outputDimensions(state.canvas.ratio,value,path.split('.')[1]));else if(path==='canvas.ratio'){state.canvas.ratio=value;Object.assign(state.output,outputDimensions(value,state.output.width));}else{
  if(live.transform?.lockAspect&&['transform.width','transform.height'].includes(path)){const other='transform.'+(path.endsWith('width')?'height':'width'),base=animatable?animationValue(live,path):pathGet(live,path),ov=animatable?animationValue(live,other):pathGet(live,other),ratio=base?ov/base:1;value=Math.min(ratio>0?Math.min(1,1/ratio):1,value);assignAnimated(live,other,value*ratio);}
  if(animatable)assignAnimated(live,path,value);else pathSet(live,path,value);
 }};
 const value=animatable?animationValue(target,path):pathGet(target,path),input=el('input',{type:'number',min,max,step,value,'aria-label':label}),slider=el('input',{type:'range',min,max,step,value,'aria-label':label+'滑动条'});
 const line=el('div',{class:'tree-field tree-number-field'},[el('label',{text:label}),slider,input]);if(animatable){decorateAnimated(input,target,path);decorateAnimated(slider,target,path);}
 let before=null;
 slider.oninput=()=>{if(busy)return;stopAnimation();before??=structuredClone(state);try{assign(Number(slider.value));input.value=slider.value;requestRender();}catch(e){notify(e.message);}};
 const commit=()=>{if(!before)return;const previous=before;before=null;const keepFocus=document.activeElement===slider;try{state=validatedState(state);if(JSON.stringify(state)!==JSON.stringify(previous)){recordHistory(previous);if(history.length>60)history.shift();future=[];}persist();refresh();if(keepFocus)[...document.querySelectorAll('input[type=range]')].find(e=>e.getAttribute('aria-label')===label+'滑动条')?.focus();}catch(e){state=previous;notify(e.message);refresh();}};
 slider.onchange=commit;slider.onblur=commit;input.onchange=()=>{stopAnimation();edit(()=>assign(Math.max(min,Math.min(max,Number(input.value)))));};
 if(targetId)line.append(el('button',{text:'↺',title:'恢复默认值（录制时记录为关键帧）','aria-label':'重置 '+label,onclick:()=>edit(()=>assign(pathGet(node(target.kind,target.type),path)))}));
 if(animatable){if(target.tracks[path]){line.classList.add('animated-field');}line.append(keyButton(target,path,label));}controls().append(line);
}
function enumField(label,path,options){const n=current(),spec=fieldSpec(n,path);field(label,path,spec?.[0]??0,spec?.[1]??1,1);const row=controls().lastElementChild;row.querySelector('input[type=range]').remove();row.querySelector('input[type=number]').remove();const select=el('select',{'aria-label':label},options.map(([v,t])=>el('option',{value:v,text:t})));select.value=String(animationValue(n,path));decorateAnimated(select,n,path);select.onchange=()=>edit(()=>assignAnimated(current(),path,+select.value));row.insertBefore(select,row.children[1]);}
function extraField(key){const [label,min,max,step]=EXTRA_SPECS[key];field(label,'arrangeExtra.'+key,min,max,step);}
function extraLayoutControls(n,m){
 if([13,14].includes(m)){
  enumField('沿线采样方式','arrange.30',[[0,'按数量等距'],[1,'按间距']]);if(n.arrange[30])field('沿线间距','arrange.31',.005,1,.005);else field('实例数量','arrange.3',1,LAYOUT_LIMITS.instances,1);
  field('实例尺寸','arrange.4',.01,1,.005);enumField('实例朝向','arrange.19',[[0,'保持方向'],[1,'沿轮廓切线（纵轴）'],[2,'垂直轮廓（纵轴）']]);extraField('offset');
  if(m===13)for(const key of ['width','height','corner'])extraField(key);
  else{extraField('threshold');extraField('contourOffset');animatedCheck('显示轮廓来源','arrangeExtra.showSource');note('组合的第一个子节点是轮廓来源，其余子节点是装饰。读取来源的透明度轮廓（固定256像素采样）；不透明图片可先切为亮度遮罩。可沿多个闭合轮廓和孔洞排列。');}
   if(n.kind==='group'){choice('实例内容',n.instanceContent,[['all','整个装饰组合'],['random-child','随机一个装饰'],['cycle-child','按顺序循环装饰']],v=>edit(()=>n.instanceContent=v));if(n.instanceContent==='random-child')field('杂排种子','arrange.11',1,LAYOUT_LIMITS.seed,1);}
  field('整体旋转 °','arrange.6',-360,360,1);field('排列中心 X','arrange.13',-1.5,1.5,.01);field('排列中心 Y','arrange.14',-1.5,1.5,.01);
 }else if(m===15){
   animatedChoice('编排样式','arrangeExtra.weave',[['herringbone','人字纹'],['basket','篮式编织']]);field('重复块列数','arrange.1',1,LAYOUT_LIMITS.weaveBlocks,1);field('重复块行数','arrange.2',1,LAYOUT_LIMITS.weaveBlocks,1);field('整体旋转 °','arrange.6',-360,360,1);note('每块由4×4格组成，单元按2:1长砖铺排，最多512份。内容随长砖区域拉伸；开无缝重复可跨边缘接续。');
   if(n.kind==='group'){choice('实例内容',n.instanceContent,[['all','整个组合'],['random-child','随机一个子节点'],['cycle-child','按顺序循环（取模）']],v=>edit(()=>n.instanceContent=v));if(n.instanceContent==='random-child')field('杂排种子','arrange.11',1,LAYOUT_LIMITS.seed,1);}
 }else{
  field('网格列数','arrange.1',1,LAYOUT_LIMITS.grid,1);field('网格行数','arrange.2',1,LAYOUT_LIMITS.grid,1);field('拼接种子','arrange.11',1,LAYOUT_LIMITS.seed,1);
  note('组合的直接子节点是候选图块。声明每块连接哪几边，系统只选择相邻接口匹配的组合；开启无缝重复时也匹配首尾边。图块内容随格子拉伸，接口需画在边的中点。无解时会提示补充图块。');
  if(n.kind==='group')advanced('图块接口配置',()=>{for(const child of n.children){const options=Array.from({length:16},(_,mask)=>[mask,mask?[[1,'右'],[2,'上'],[4,'左'],[8,'下']].filter(([bit])=>mask&bit).map(([,name])=>name).join(' + '):'无接口 / 空白']);choice(child.name+'接口',child.tileEdges,options,v=>edit(()=>child.tileEdges=+v));}});
 }
}
function layoutModifiers(n,m){
 if(m===16)return;
 advanced('排列变化：渐变与流场',()=>{
  if([7,12].includes(m)&&n.scatterAvoidOverlap){note('防堆叠开启时暂不应用渐变与流场，避免尺寸或位置变化破坏间距；关闭防堆叠后恢复设置。');return;}
  animatedChoice('渐变分布','arrangeExtra.gradient',[['none','关闭'],['x','从左到右'],['y','从下到上'],['radial','从中心向外'],['index','按实例顺序']]);
  if(n.arrangeExtra.gradient!=='none'){animatedCheck('反向渐变','arrangeExtra.reverse');for(const key of ['scaleFrom','scaleTo','opacityFrom','opacityTo','rotationFrom','rotationTo'])extraField(key);}
  animatedChoice('流场方式','arrangeExtra.flow',[['none','关闭'],['wave','波浪偏移'],['vortex','旋涡扭转']]);
  if(n.arrangeExtra.flow!=='none'){extraField('flowAmount');if(n.arrangeExtra.flow==='wave')extraField('flowFrequency');extraField('flowPhase');animatedCheck('跟随流场转向','arrangeExtra.flowTurn');}
  note('作用于每个排列实例；相位可录制关键帧。位置渐变跨平铺边界可能出现节奏突变。');
 });
}

function advanced(label,build){const parent=formTarget,details=el('details',{class:'arrangement-advanced'},[el('summary',{text:label})]);details.open=advancedOpen.has(label);const remember=()=>{if(details.open)advancedOpen.add(label);else advancedOpen.delete(label);};details.ontoggle=()=>{if(details.isConnected)remember();};details.firstElementChild.onclick=event=>{event.preventDefault();details.open=!details.open;remember();};controls().append(details);formTarget=details;try{build();}finally{formTarget=parent;}}
function curveControl(n,field,start){let before;const id=n.id;controls().append(createCurveEditor(()=>find(state.root,id).node[field].slice(start,start+8),{canEdit:()=>!busy,begin:()=>{before=structuredClone(state);},point:(i,x,y)=>{const target=find(state.root,id).node;try{assignAnimated(target,field+'.'+(start+i*2),x);assignAnimated(target,field+'.'+(start+i*2+1),y);requestRender();}catch(e){notify(e.message);}},end:()=>{if(before){recordHistory(before);future=[];before=null;persist();refresh();}}}));}
function note(text){controls().append(el('p',{class:'tree-note',text}));}
function progressCurve(n){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 220 140');svg.classList.add('animation-curve');svg.setAttribute('aria-label','时间重映射曲线');controls().append(svg);
 const add=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);return e;},points=n.timing.curve.length?n.timing.curve:[[0,0],[1,1]];
 const path=add('polyline',{fill:'none',stroke:'#d7b272','stroke-width':2});const plot=()=>path.setAttribute('points',points.map(p=>`${10+p[0]*200},${130-p[1]*120}`).join(' '));plot();
 points.forEach((p,i)=>{const h=add('circle',{cx:10+p[0]*200,cy:130-p[1]*120,r:5,fill:'#8ddcf0'});h.onpointerdown=e=>{beginAnimationGesture();n.timing.curve=points;h.setPointerCapture?.(e.pointerId);h.onpointermove=e=>{const r=svg.getBoundingClientRect(),x=((e.clientX-r.left)*220/r.width-10)/200,y=(130-(e.clientY-r.top)*140/r.height)/120;p[0]=Math.max(i?points[i-1][0]+.001:0,Math.min(i<points.length-1?points[i+1][0]-.001:1,x));p[1]=Math.max(0,Math.min(1,y));h.setAttribute('cx',10+p[0]*200);h.setAttribute('cy',130-p[1]*120);plot();requestRender();};h.onpointerup=()=>{h.onpointermove=null;endAnimationGesture();};h.onpointercancel=cancelAnimationGesture;};});
}
function inspector(){buildInspector();syncParameterStates();}
function buildInspector(){const n=current();inspectorVariant=inspectorVariantKey(animationClock(n.id).node);if(n===state.root){$('inspector-color-quick').hidden=true;$('inspector-color-quick').replaceChildren();$('selected-heading').textContent='未选择节点';$('selected-path').textContent='';$('inspector-tabs').replaceChildren();$('inspector').replaceChildren();note('选择内容节点以编辑参数，或添加顶层并列节点。');return;}$('selected-heading').textContent=(n.kind==='group'?'组合 · ':'图形 · ')+n.name;$('inspector-tabs').replaceChildren(...[['shape','图形'],['color','颜色'],['layout','变换/排列'],['animation','动画'],['composite','合成']].map(([id,label])=>el('button',{text:label,class:section===id?'active':'',onclick:()=>{section=id;if(id==='animation')$('animation-panel').open=true;inspector();}})));$('inspector').replaceChildren();$('selected-path').textContent=(selectedIds.size>1?'已选 '+selectedIds.size+' 个节点；右侧参数编辑主选节点，画布移动与工具栏操作作用于全部。 ':'')+[...$('breadcrumbs').querySelectorAll('button')].map(b=>b.textContent).join(' / ');
 renderColorQuick(n);
 const modebar=el('div',{class:'animation-tools inspector-animation-mode'});for(const [v,title]of [['record','● 录制'],['base','基础值']])modebar.append(el('button',{text:title,class:animationEditMode===v?(v==='record'?'active recording':'active'):'','aria-label':'参数模式 '+title,'aria-pressed':String(animationEditMode===v),title:v==='record'?(animationEditMode==='record'?'关闭录制，返回普通编辑':'开启录制：修改参数时记录关键帧'):(animationEditMode==='base'?'退出基础值编辑':'编辑基础值（关闭录制）'),onclick:()=>setAnimationMode(animationEditMode===v?'normal':v)}));controls().append(modebar);if(animationEditMode==='base')note('正在编辑基础值：暂时旁路本节点参数动画，退出后恢复动画；保存与导出仍包含完整动画。');
 if(componentPreview)note('试编辑：参数与节点修改仅保留在本次会话，点击“添加到画布”后才插入；可保存为新组件。');
 if(section==='shape'){
  const name=el('input',{value:n.name,'aria-label':'节点名称'});name.onchange=()=>edit(()=>n.name=name.value);controls().append(el('label',{class:'tree-field'},[document.createTextNode('名称'),name]));animatedCheck('显示节点','enabled');
  if(n.kind==='group'){note(`组合内有 ${n.children.length} 个普通子节点。选中树中的任何节点可直接编辑。`);return;}
  choice('基础图形',n.type,CATALOG.filter(p=>projectShapeIds().has(p.id)||p.id===n.type).map(p=>[p.id,p.id.startsWith('asset_')?p.zh+' · 自定义':p.zh+' · '+p.id]),v=>edit(()=>{typeMemory.set(n.id+':'+n.type,{params:[...n.params],tracks:structuredClone(Object.fromEntries(Object.entries(n.tracks).filter(([k])=>k.startsWith('params.'))))});n.type=v;const cached=typeMemory.get(n.id+':'+v);n.params=cached?[...cached.params]:shapeDefaults(v);for(const key of Object.keys(n.tracks))if(key.startsWith('params.'))delete n.tracks[key];if(cached)Object.assign(n.tracks,structuredClone(cached.tracks));remember('shape:'+v);}));
  note('图形尺寸在节点区域内部计算。羽化为主动柔边，0 表示仅保留抗锯齿；已有画布可点羽化旁的 ↺ 恢复清晰边缘。');
  controls().append(el('button',{text:'重置图形参数',onclick:()=>edit(()=>shapeDefaults(n.type).forEach((v,i)=>assignAnimated(n,'params.'+i,v)))}));
  controls().append(el('button',{text:'随机参数',onclick:()=>edit(()=>{for(const p of BY_ID.get(n.type).parameters){if(p.label==='羽化')continue;assignAnimated(n,'params.'+p.slot,Math.round((p.min+Math.random()*(p.max-p.min))/p.step)*p.step);}})}));
  const editor=BY_ID.get(n.type).definition.editor.kind;
  if(editor==='gear'){enumField('齿形模式','params.8',[[0,'直边齿'],[1,'圆齿']]);}if(editor==='gear'&&n.params[8]<.5)enumField('齿形','params.6',[[1,'方齿'],[0,'三角齿'],[.4,'梯形齿'],[n.params[6],'当前齿顶']]);
  if(editor==='star')enumField('星形轮廓','params.5',[[0,'直边星'],[1,'圆角星'],[2,'旧版波瓣']]);
  if(editor==='bezier')enumField('端点形状','params.12',[[0,'圆头'],[1,'平头']]);
  if(n.type==='BezierRibbon')curveControl(n,'params',0);
  const modeOptions={Halftone:[4,'灰度来源',[[0,'径向'],[1,'线性'],[2,'噪声']]],RingPulse:[4,'衰减模式',[[0,'平滑'],[1,'指数']]],ConeGradient:[4,'渐变方向',[[0,'正向'],[1,'反向']]],LineSegment:[5,'端点',[[0,'平头'],[1,'圆头']]]}[n.type];if(modeOptions)enumField(modeOptions[1],'params.'+modeOptions[0],modeOptions[2]);
  if(isImage(n.type)){choice('图片比例',n.imageFit??'contain',[['contain','保持原图比例'],['stretch','随区域拉伸']],v=>edit(()=>n.imageFit=v));note('保持原图比例在节点区域内部适配，不缩小整个组合或排列范围；需要故意拉伸图片时再切换。节点区域边框仍表示分配范围。');enumField('图片显示','params.0',[[0,'原色与透明度'],[1,'亮度遮罩'],[2,'透明度遮罩']]);note('原色模式保留图片颜色；遮罩模式可使用节点配色。图片随组件资源包一起保存。');}
  for(const p of BY_ID.get(n.type).parameters.filter(p=>!(isImage(n.type)&&p.slot===0)&&!(modeOptions&&p.slot===modeOptions[0])&&!(editor==='gear'&&(p.slot===8||n.params[8]>=.5&&[5,6].includes(p.slot)||n.params[8]<.5&&p.slot===9))&&!(editor==='star'&&(p.slot===5||p.slot===1&&n.params[5]!==1))&&!(editor==='bezier'&&p.slot===12))){if(p.type==='select')enumField(p.label,'params.'+p.slot,p.options.map(o=>[o.value,o.label]));else if(p.type==='color'){const input=el('input',{type:'color',value:'#'+Math.round(animationValue(n,'params.'+p.slot)).toString(16).padStart(6,'0'),'aria-label':p.label,oninput:e=>edit(()=>assignAnimated(n,'params.'+p.slot,parseInt(e.target.value.slice(1),16)))});input.dataset.packedColor='true';decorateAnimated(input,n,'params.'+p.slot);controls().append(el('label',{class:'tree-field'},[document.createTextNode(p.label),input]));}else field(p.label,'params.'+p.slot,p.label==='羽化'?0:p.min,p.max,p.step);}
  if(BY_ID.get(n.type)?.usesTime){heading('图形内置动画');animatedCheck('自动播放','shapeClock.follow');if(animationValue(n,'shapeClock.follow')){field('运动速度','shapeClock.speed',-10,10,.01);field('时间偏移（秒）','shapeClock.offset',-600,600,.01);}else field('图形时间（秒）','shapeClock.value',-36000,36000,.01);note('自动运动按累计秒数 × 速度 + 偏移计算，时间轴循环时持续运动。关闭后可定格或添加时间关键帧；不保证首尾无缝。');}
  heading('图形内部 UV');controls().append(el('button',{text:'复位 UV',onclick:()=>edit(()=>[1,0,0,0,0,0,0].forEach((v,i)=>assignAnimated(n,'uv.'+i,v)))}));for(const [i,label,min,max,step]of [[0,'UV缩放',.1,8,.01],[1,'UV旋转',-360,360,1],[2,'UV偏移X',-2,2,.01],[3,'UV偏移Y',-2,2,.01],[4,'UV滚动速度',-2,2,.01],[5,'UV滚动方向 °',-360,360,1],[6,'UV漩涡',-6.28,6.28,.01]])field(label,'uv.'+i,min,max,step);animatedCheck('极坐标采样','polar');
 }
 if(section==='layout'){
  if(n.id===state.root.id){heading('固定画布');note('画布始终占据完整 0～1 画布，金色框即最终裁剪与导出边界。需要整体移动、旋转或缩放内容，请放入子组合后调整。');}else{
  heading('节点占用区域');note('宽高相对于父级区域；位置与轴心使用 0～1 坐标。区域决定内容分配范围，图形半径和排列实例大小只调整区域内部。');check('锁定区域宽高比例',n.transform.lockAspect,v=>edit(()=>n.transform.lockAspect=v));for(const [key,label,min,max,step]of [['x','位置 X',-2,2,.01],['y','位置 Y',-2,2,.01],['width','区域宽',0,1,.01],['height','区域高',0,1,.01],['rotation','旋转 °',-3600,3600,1],['pivotX','轴心 X',0,1,.01],['pivotY','轴心 Y',0,1,.01]])field(label,'transform.'+key,min,max,step);
  animatedCheck('水平镜像','transform.mirrorX');
  animatedChoice('区域适配','transform.fit',[['stretch','随区域拉伸'],['contain','保持比例']]);}
  animatedCheck('节点无缝重复','seamless');if(n.seamless&&n.kind==='shape'){choice('图形接缝处理',n.seamMode,[[0,'自动：周期 / 形状重复'],[1,'通用：边缘融合']],v=>edit(()=>n.seamMode=+v));note(seamlessDescription(n,n.seamMode));if(seamlessKind(n.type,n.seamMode)===0)field('融合宽度','seamBlend',.05,.45,.01,{key:false});}else if(n.seamless)note('重复组合结果；子节点的接缝处理需要分别开启。');
  heading('区域内的内容排列');note('排列重复整个节点内容；网格先分配单元格，再在每格绘制图形或子树。');const layoutSelect=choice('排列方式',arrangementFamily(animationValue(n,'arrange.0')),[...ARRANGEMENT_FAMILIES,...EXTRA_LAYOUTS],v=>edit(()=>{if([14,16].includes(+v)&&n.kind!=='group')throw Error('请先创建组合，再选择沿轮廓或规则拼接');assignAnimated(n,'arrange.0',+v);if(+v===8)assignAnimated(n,'arrange.33',1);if([13,14].includes(+v)){n.arrange[3]=48;n.arrange[4]=.04;n.arrange[19]=1;}if(+v===14){if(!n.children.length)n.children.push(node('shape','Star'));if(n.children.length===1){const marker=node('shape','Circle');marker.name='轮廓装饰';n.children.push(marker);}}if(+v===15)n.arrange[1]=n.arrange[2]=2;}));decorateAnimated(layoutSelect,n,'arrange.0');layoutSelect.dataset.animationFamily='true';layoutSelect.parentElement.append(keyButton(n,'arrange.0','排列方式'));if(n.kind!=='group'){for(const option of layoutSelect.options)if([14,16].includes(+option.value)){option.disabled=true;option.textContent+='（需组合）';}note('沿图形轮廓、规则拼接需要选中组合：先创建组合，再把来源或候选图块放入组合。');}const m=animationValue(n,'arrange.0');
  if(m===8)enumField('数量分布','arrange.58',[[1,'按间距均匀分布'],[0,'每圈等数量']]);
  if([1,4,11].includes(m))enumField('网格类型','arrange.0',[[1,'矩形'],[4,'斜向'],[11,'六角']]);
  if([5,9].includes(m))enumField('螺旋类型','arrange.0',[[5,'黄金角'],[9,'规则']]);
  if([7,12].includes(m))enumField('密度分布','arrange.0',[[7,'整个区域'],[12,'密度图案']]);
  if(m===6)curveControl(n,'arrange',20);
  if(m){
   if(m>=13)extraLayoutControls(n,m);else{
   choice('实例比例',n.arrangeFit,[['contain','保持设计比例'],['stretch','随区域拉伸']],v=>edit(()=>n.arrangeFit=v));note('保持设计比例：排列区域随画布变化，每份图案按所在区域短边适配，不把整组缩进正方形。需要拉伸效果时可切换；防堆叠间距按短边尺度计算，改变比例可能重新分布。');
   if([7,12].includes(m)){check('防堆叠',n.scatterAvoidOverlap,v=>edit(()=>n.scatterAvoidOverlap=v));if(n.scatterAvoidOverlap){const gap=el('input',{type:'number',min:0,max:.5,step:.005,value:n.scatterGap,'aria-label':'额外间距',onchange:()=>edit(()=>n.scatterGap=+gap.value)});controls().append(el('label',{class:'tree-field'},[document.createTextNode('额外间距'),gap]));note('按实际选中图形的可见范围和本次尺寸避让，不再为透明留白和最大随机尺寸预留整块空间。额外间距与最小中心距离仍生效；放不下时减少实际数量。细长/空心图形仍按外包圆保守判断。');}}
   if(n.kind==='group'){choice('实例内容',n.instanceContent,[['all','整个组合'],['random-child','随机一个子节点'],['cycle-child','按顺序循环（取模）']],v=>edit(()=>n.instanceContent=v));if(n.instanceContent==='random-child'){note('每个排列位置从已启用的直接子节点中等概率选一个，允许重复。子组合按整体参与；动画暂时隐藏的子节点仍保留原位置。改变种子可重新杂排。');field('杂排种子','arrange.11',1,LAYOUT_LIMITS.seed,1);}else if(n.instanceContent==='cycle-child')note('按排列点的生成顺序，依次选择节点树中已启用的直接子节点：1、2、3、1、2、3……。跳过未启用节点，子组合视为一项；调整子节点顺序或数量会改变对应关系。同一点序号的选择不随种子或时间变化，种子仍可影响随机散布的位置。');}
   controls().append(el('div',{class:'tree-actions'},[el('button',{text:'居中',onclick:()=>edit(()=>{assignAnimated(n,'arrange.13',0);assignAnimated(n,'arrange.14',0);})}),el('button',{text:[1,4].includes(m)?'铺满网格':[3,7,12].includes(m)?'铺满区域':'分布适配',title:[3,7,12].includes(m)?'将布局半径设为0.5、中心偏移归零；保留尺寸、数量和旋转等设置。防堆叠仍限制实际数量。':'调整布局适配区域',onclick:()=>edit(()=>{const next=arrangeShortcut(animationClock(n.id).node.arrange,'fill');for(let i=0;i<next.length;i++)if(next[i]!==animationValue(n,'arrange.'+i))assignAnimated(n,'arrange.'+i,next[i]);})})]));
   const slots=[...([1,4,11].includes(m)?[1,2]:m===6&&n.arrange[30]?[]:[3]),...([1,4].includes(m)?[6]:[4,5,6]),...({5:[16,17,18,19],6:[30,...(n.arrange[30]?[31]:[]),20,21,22,23,24,25,26,27,28,29,18,19],7:[32,18,19],8:[33,34,36,15,...(n.arrange[33]>1?[18]:[]),19],9:[35,36,18,19],10:[34,37],11:[38],12:[32,40,41,18,19]}[m]??[])];
   for(const slot of slots){const spec=arrangementSpec(m,slot,n.arrange),options=slot===19?[[0,'保持方向'],[1,[6,9].includes(m)?'沿路径切线':'朝向圆心外'],[2,[6,9].includes(m)?'垂直路径':'沿圆周切线']]:slot===30?[[0,'按数量等距'],[1,'按间距']]:slot===37?[[0,'仅放射旋转'],[1,'旋转 + 镜像成对']]:slot===38?[[0,'横向错列'],[1,'纵向错列']]:null;if(options)enumField(spec.label,'arrange.'+slot,options);else field(spec.label,'arrange.'+slot,spec.min,spec.max,spec.step);}
   advanced('高级：随机扰动与位置',()=>{for(const slot of [...([7,12].includes(m)?[]:[8]),9,10,11,...(m===1?[12]:[]),13,14]){const spec=arrangementSpec(m,slot,n.arrange);field(spec.label,'arrange.'+slot,spec.min,spec.max,spec.step);}});
   if(m===12){choice('密度图案',n.arrange[39],CATALOG.map((p,i)=>({p,i})).filter(({p,i})=>projectShapeIds().has(p.id)||i===n.arrange[39]).map(({p,i})=>[i,p.zh]),v=>edit(()=>{n.arrange[39]=+v;n.arrange.splice(42,16,...CATALOG[v].defaults);}));for(const p of CATALOG[n.arrange[39]].parameters)field('密度 · '+p.label,'arrange.'+(42+p.slot),p.min,p.max,p.step);}
   }
   layoutModifiers(n,m);
   field('每份动画相位偏移','instancePhase',-1,1,.01);controls().append(el('p',{id:'actual-count',class:'tree-note'}),el('button',{text:'展开为独立节点',onclick:()=>edit(()=>{const e=nodeClock(state.root,n.id,time);state.root=expandInstances(state.root,n.id,time,renderer.records(e.node,e.progress,{original:n,aspect:selectionRegions(animationPreviewProject(),n.id,time,{records:arrangementRecords}).regions[0]?.aspect??state.canvas.ratio}));})}));updateActualCount();note('展开固定当前排列布局，保留内容动画；可一次撤销。网格每格拥有独立0～1内容区域。');
  }
 }
 if(section==='color')renderColorPanel(n);
 if(section==='composite'){
  animatedChoice('混合方式','blend',[['over','正常'],['add','相加'],['max','最大值'],['multiply','相乘'],['subtract','相减'],['screen','滤色'],['difference','差值'],['overlay','叠加'],['softlight','柔光'],['dodge','颜色减淡'],['mask','遮罩'],['inverseMask','反向遮罩']]);
  heading('轮廓处理');animatedChoice('轮廓方式','contour.mode',[['none','关闭'],['outline','外描边'],['dilate','膨胀'],['erode','收缩']]);field('轮廓宽度（区域短边比例）','contour.radius',0,.1,.001);note('作用于当前节点的最终轮廓；组合会先合成子节点再处理。外描边只保留外侧边线，宽度不随导出分辨率改变。');
  advanced('后处理：亮度、色阶与反相',()=>{controls().append(el('button',{text:'复位后处理',onclick:()=>edit(()=>{n.post=POST_SPECS.map(p=>p[3]);n.invert=false;})}));POST_SPECS.forEach(([label,min,max],i)=>field(label,'post.'+i,min,max,.01));animatedCheck('反相图案','invert');
    controls().append(el('button',{text:'复位图像滤镜',onclick:()=>edit(()=>n.postFx=fxDefaults())}));FX_SPECS.forEach(([label,min,max,def,step],i)=>field(label,'postFx.'+i,min,max,step));note('依次应用模糊、Bloom、锐化、色散和卡通色阶。半径按512像素画布计，导出时等比缩放。卡通色阶设为0可关闭。');});
  if(n.mask)check('反相蒙版',n.maskInvert,v=>edit(()=>n.maskInvert=v));
  note(n.mask?'旧版蒙版子树：'+n.mask.name+'。在节点树中选择它编辑。':(['mask','inverseMask'].includes(n.blend)?'此节点只作遮罩：影响同组内排在它前面的内容，后续节点不受影响。遮罩保留覆盖区域，反向遮罩挖去覆盖区域。':'将图形或组合的合成方式设为遮罩，可裁切同组中排在它前面的内容。'));if(n.mask)controls().append(el('button',{text:'移除蒙版',onclick:()=>edit(()=>n.mask=null)}));
 }
 if(section==='animation'){
  heading('在父级中播放');for(const [k,label]of [['start','父级区间开始'],['end','父级区间结束']])field(label,'timing.'+k,0,1,.001,{key:false});
  choice('播放方式',n.timing.loop?(n.timing.pingpong?'pingpong':'loop'):'once',[['once','播放一次'],['loop','循环'],['pingpong','往返']],v=>edit(()=>{n.timing.loop=v!=='once';n.timing.pingpong=v==='pingpong';if(v==='once')n.timing.cycles=1;}));
  if(n.timing.loop)field(n.timing.pingpong?'单程次数（2次为一次往返）':'重复次数','timing.cycles',.01,64,.01,{key:false});
  for(const [key,title]of [['before','开始前'],['after','结束后']])choice(title,n.timing[key]??n.timing.outside,[['hold','保持边界状态'],['hide','隐藏']],v=>edit(()=>n.timing[key]=v));
  note('时间条安排本节点在父级中的播放时机；拉伸时间条改变播放速度，子节点的本地关键帧保持不变。');
  advanced('高级时间控制',()=>{
   for(const [k,label,min,max] of [['from','源动画开始进度',0,1],['to','源动画结束进度',0,1],['offset','父级时间相位偏移',-1,1]])field(label,'timing.'+k,min,max,.01,{key:false});
   check('固定动画百分比',n.timing.frozen,v=>edit(()=>n.timing.frozen=v));if(n.timing.frozen)field('固定进度','timing.at',0,1,.001,{key:false});
   choice('时间推进插值',n.timing.ease,[['linear','线性'],['smooth','缓入缓出'],['hold','保持']],v=>edit(()=>n.timing.ease=v));
   heading('时间重映射');note('横轴是本地时间，纵轴是源动画进度。此曲线会影响本节点及子节点的时间，不是参数数值曲线。');
   progressCurve(n);
   n.timing.curve.forEach((key,i)=>{const row=el('div',{class:'tree-key-row'});for(const [j,label]of [[0,'局部时间'],[1,'动画百分比']]){const input=el('input',{type:'number',min:0,max:1,step:.01,value:key[j],'aria-label':label+' '+i});input.onchange=()=>edit(()=>key[j]=+input.value);row.append(input);}row.append(el('button',{text:'×',onclick:()=>edit(()=>n.timing.curve.splice(i,1))}));controls().append(row);});
   controls().append(el('button',{text:'添加进度映射点',onclick:()=>edit(()=>{if(!n.timing.curve.length)n.timing.curve=[[0,0],[1,1]];else{let best=[0,0];for(let i=1;i<n.timing.curve.length;i++)if(n.timing.curve[i][0]-n.timing.curve[i-1][0]>best[1])best=[i,n.timing.curve[i][0]-n.timing.curve[i-1][0]];if(best[1]>0){const [a,b]=[n.timing.curve[best[0]-1],n.timing.curve[best[0]]];n.timing.curve.push([(a[0]+b[0])/2,(a[1]+b[1])/2]);}}})}),el('button',{text:'重置时间曲线',onclick:()=>edit(()=>n.timing.curve=[])}));
  });
  heading('本节点参数动画');check('启用本节点参数动画',n.animationEnabled,v=>edit(()=>n.animationEnabled=v));controls().append(el('button',{text:'清空本节点关键帧',onclick:()=>edit(()=>n.tracks={})}));note('开启录制后，直接调参数即可创建关键帧；普通模式显示动画求值，基础值模式单独调整基础状态。');

  controls().append(el('button',{text:'进入本节点动画',onclick:()=>{$('animation-panel').open=true;animationEditor.enter(n.id);}}));note('在底部轨道中选择菱形，可拖动时间、编辑数值、插值与作用方式，或删除关键帧。局部预览不会修改父级时间规则。');
 }
}

function insert(n){return edit(()=>{state.root.children.push(n);selected=n.id;});}
const libraryThumbs=patternThumbnails(null);
const libraryOpen=new Set();
function rememberLibraryGroup(details){const key='closed:'+details.dataset.category;if(details.open)libraryOpen.delete(key);else libraryOpen.add(key);}
function syncLibraryToggle(){const groups=[...$('shape-library').children].filter(e=>e.tagName==='DETAILS');$('collapse-library').textContent=groups.some(e=>e.open)?'收起全部':'展开全部';$('collapse-library').disabled=!groups.length;}
function projectShapeIds(){const ids=new Set();for(const r of projectOwner().projectResources)walk(r.root,n=>{if(n.kind==='shape')ids.add(n.type);});return ids;}
function library(){
 const q=$('shape-search').value.trim().toLowerCase(),filter=$('library-filter').value,container=$('shape-library');for(const group of container.children)if(group.tagName==='DETAILS')rememberLibraryGroup(group);libraryThumbs.reset();container.replaceChildren();container.className='tree-library-'+$('shape-library-view').value;
 const items=projectOwner().projectResources.filter(p=>p.name.toLowerCase().includes(q)&&(filter==='all'||p.kind===filter));
 for(const category of new Set(items.map(p=>p.category||'图形列表'))){const details=el('details',{'data-category':category});details.open=!libraryOpen.has('closed:'+category);details.ontoggle=()=>{if(!details.isConnected)return;rememberLibraryGroup(details);syncLibraryToggle();};details.append(el('summary',{text:category}));const cards=el('div',{class:'tree-pattern-cards'});details.append(cards);container.append(details);
 for(const p of items.filter(p=>(p.category||'图形列表')===category)){const id='preset:'+p.id,image=el('img',{width:72,height:72,alt:p.name+'预览'}),card=el('div',{class:'tree-pattern-card'});card.append(el('button',{class:'component-inspect','aria-label':'查看 '+p.name,onclick:()=>browse({id,name:p.name,kind:'preset',preset:p})},[image,el('span',{class:'tree-pattern-text',text:p.name})]),el('button',{text:'＋ 添加','aria-label':'添加 '+p.name,onclick:()=>{const copy=cloneNode(p.root);copy.resourceRef=p.id;insert(copy);}}));
 const more=el('details',{class:'component-more'},[el('summary',{text:'更多'}),el('div',{class:'tree-note',text:'版本：'+p.versionId}),el('div',{class:'tree-note',text:'个人修改：'+p.personalRevision}),el('button',{text:'重命名','aria-label':'重命名 '+p.name,onclick:()=>renameListItem(p.id)}),el('button',{text:'保存到图形库',onclick:()=>graphicsLibrary.publish(p.root,p.source)}),el('button',{text:'从图形列表移除',onclick:()=>{if(componentPreview)returnWork();libraryThumbs.release();edit(()=>state.projectResources=state.projectResources.filter(r=>r.id!==p.id));previewSessions.delete(id);library();renderer.destroy();renderer=new TreeRenderer(document.createElement('canvas'));watchContext();requestRender();}})]);card.append(more);cards.append(card);libraryThumbs.observe(image,id,p.root);}}
 if(!items.length)container.append(el('p',{class:'tree-note',text:'图形列表中暂无匹配项。点击顶部“图形库”选择资源。'}));syncLibraryToggle();
}
$('shape-library-view').onchange=library;$('library-filter').onchange=library;
const graphicsLibrary=createGraphicsLibrary({notify,onInsert:async(root,meta)=>{if(busy)throw Error('请等待当前操作完成');returnWork();const copy=cloneNode(root);copy.name=meta.name??copy.name;delete copy.resourceRef;if(!insert(copy))throw Error($('tree-toast').textContent||'未能添加到画布');await resourcePersist;},getResources:()=>projectOwner().projectResources,onLoad:async(root,meta,update=false)=>{returnWork();const matches=state.projectResources.filter(r=>r.resourceId===meta.resourceId);if(matches.some(r=>r.versionId===meta.versionId))return;const old=update?matches.filter(r=>r.versionId<meta.versionId).sort((a,b)=>b.versionId-a.versionId)[0]:null;const entry=createProjectResource(root,meta);if(old){entry.id=old.id;entry.root.resourceRef=old.id;libraryThumbs.invalidate('preset:'+old.id);previewSessions.delete('preset:'+old.id);}edit(()=>{if(old)state.projectResources=state.projectResources.map(r=>r.id===old.id?entry:r);else state.projectResources.push(entry);});await resourcePersist;library();},onPublished:async(root,meta,update)=>{if(!update||!root.resourceRef)return;const owner=projectOwner();owner.projectResources=owner.projectResources.map(r=>r.id===root.resourceRef?publishedProjectResource(r,meta,root):r);persistSharedResources();localStorage.setItem(storageKey,serializeLocalProject(canvasProject(owner)));library();},onComposition:meta=>{const p=state.projectResources.find(r=>r.resourceId===meta.resourceId&&r.versionId===meta.versionId);if(p)browse({id:'preset:'+p.id,name:p.name,kind:'preset',preset:p});}});
$('download-author-skill').onclick=()=>downloadSkill('author');
$('download-effects-skill').onclick=()=>downloadSkill('effects');
$('open-graphics-library').onclick=()=>graphicsLibrary.open();
$('save-whole-library').onclick=()=>graphicsLibrary.publish(state.root);
$('save-project-resource').onclick=()=>saveComponent(current());
$('update-project-resource').onclick=async()=>{const existing=linkedProjectResource(projectOwner().projectResources,current());if(!existing){previewButtons();return saveComponent(current());}if(!await confirmGraphicAction('更新图形列表中的“'+existing.name+'”？已有其他实例保持原样。'))return;const root=cloneNode(current());edit(()=>state.projectResources=state.projectResources.map(r=>r.id===existing.id?replaceProjectResource(r,root):r));libraryThumbs.invalidate('preset:'+existing.id);previewSessions.delete('preset:'+existing.id);library();};
let exportController=null;
function exportStage(message){const status=$('export-stage');if(status)status.textContent=message;}
async function exportImage(kind){
 if(busy)return;busy=true;cancelExport=false;exportController=new AbortController();playing=false;$('play').textContent='播放';const p=structuredClone(state),o=p.output;Object.assign(o,outputDimensions(p.canvas.ratio,o.width));if(globalPanel)renderGlobalPanel();
 const check=()=>{if(cancelExport)throw Error('导出已取消');},pause=async()=>{await new Promise(r=>setTimeout(r,0));check();};
 const render=(w,h,t=time,seconds=formulaSeconds)=>{check();if(kind==='png'){exportStage('正在逐步合成原尺寸PNG，及时释放临时图像，请稍候…');return renderer.draw(p,w,h,{time:t,formulaSeconds:seconds,read:true,stream:true});}try{return renderer.draw(p,w,h,{time:t,formulaSeconds:seconds,read:true});}catch(error){if(!error.message.includes('纹理预算'))throw error;return renderer.draw(p,w,h,{time:t,formulaSeconds:seconds,read:true,quality:1});}};
 const encode=(kind,payload)=>{check();exportStage('正在编码和打包文件…');return runExportWorker('encode-'+kind,payload,{}, {signal:exportController.signal});};
 async function sequence(w,h,format){
  if(o.frames>10000)throw Error('总帧数超过 10000，请降低 FPS 或播放秒数');
  const cols=Math.min(o.columns,o.frames),aw=w*cols,ah=h*Math.ceil(o.frames/cols),entries=[];
  if(format!=='frames'&&(aw>8192||ah>8192||aw*ah>16777216))throw Error('图集超过尺寸预算，请降低单帧尺寸或帧数');
  if(w*h*o.frames>33554432)throw Error('序列帧超过总像素预算');const atlas=format==='frames'?null:new Float32Array(aw*ah*4);
  for(let i=0;i<o.frames;i++){const pix=render(w,h,exportFrameProgress(o,i),exportFrameProgress(o,i)*o.seconds);if(atlas){for(let y=0;y<h;y++)atlas.set(pix.subarray(y*w*4,(y+1)*w*4),((Math.floor(i/cols)*h+y)*aw+(i%cols)*w)*4);}else entries.push({name:`frame-${String(i).padStart(4,'0')}.png`,data:await encode('png',{pixels:pix,width:w,height:h,depth:o.depth})});exportStage(`正在渲染并编码帧 ${i+1}/${o.frames}`);await pause();}
  exportStage('正在打包文件…');await pause();return {data:format==='frames'?await encode('zip',{entries}):format==='exr'?await encode('exr',{pixels:atlas,width:aw,height:ah,zip:o.exrZip}):await encode('png',{pixels:atlas,width:aw,height:ah,depth:o.depth}),width:aw,height:ah};
 }
 try{
  await pause();
  if((['exr','atlas-exr'].includes(kind)||o.depth===16&&!['copy','psd','psd-vector','svg'].includes(kind))&&!renderer.float)throw Error('当前设备不支持浮点渲染，无法导出高精度数据');
  if(kind==='svg'){const result=await runExportWorker('svg',p,{time,width:o.width,height:o.height,threshold:contourThreshold/100,smooth:contourSmooth},{signal:exportController.signal,stage:exportStage,render:(project,w,h,t)=>{check();return renderer.draw(project,w,h,{time:t,formulaSeconds,read:true});}});check();download(new TextEncoder().encode(result.svg),p.name+'.svg','image/svg+xml');notify('已导出SVG轮廓：'+result.stats.paths+' 条路径'+(result.stats.complexityWarning?'；'+result.stats.complexityWarning:''));return;}
  if(kind==='psd-vector'){const result=await runExportWorker('psd-vector',p,{time,width:o.width,height:o.height,threshold:contourThreshold/100,smooth:contourSmooth},{signal:exportController.signal,stage:exportStage,render:(project,w,h,t)=>{check();return renderer.draw(project,w,h,{time:t,formulaSeconds,read:true});}});check();download(result.bytes,p.name+'-矢量轮廓.psd','image/vnd.adobe.photoshop');notify(`已导出 ${result.stats.vectors} 个形状图层、${result.stats.paths} 条路径${contourSmooth?'；'+result.stats.fittedPaths+' 条平滑、'+result.stats.preservedPaths+' 条保留原轮廓':''}；羽化、渐变已简化`+(result.stats.complexityWarning?'；'+result.stats.complexityWarning:''));return;}
  if(kind==='psd'){const result=await runExportWorker('psd',p,{time,width:o.width,height:o.height,threshold:contourThreshold/100,smooth:contourSmooth},{signal:exportController.signal,stage:exportStage,render:(project,w,h,t)=>{check();return renderer.draw(project,w,h,{time:t,formulaSeconds,read:true});}});check();download(result.bytes,p.name+'.psd','image/vnd.adobe.photoshop');notify(`PSD 已导出：${result.stats.vectors} 个形状、${result.stats.pixels} 个像素图层${result.stats.merged?'，'+result.stats.merged+' 处效果合成':''}`);return;}
  if(['exr','png','copy'].includes(kind)){exportStage('正在渲染并编码图片…');await pause();const pix=render(o.width,o.height),data=kind==='exr'?await encode('exr',{pixels:pix,width:o.width,height:o.height,zip:o.exrZip}):await encode('png',{pixels:pix,width:o.width,height:o.height,depth:kind==='copy'?8:o.depth});check();if(kind==='copy'){try{await navigator.clipboard.write([new ClipboardItem({'image/png':new Blob([data],{type:'image/png'})})]);}catch{download(data,p.name+'.png');notify('浏览器不允许复制，已下载 PNG8');return;}}else download(data,p.name+'.'+kind);}
  else if(['batch','batch-atlas'].includes(kind)){const entries=[];for(const size of kind==='batch'?[256,512,1024]:[64,128,256]){const ratio=size/Math.max(o.width,o.height),w=Math.max(1,Math.round(o.width*ratio)),h=Math.max(1,Math.round(o.height*ratio));entries.push({name:size+'.png',data:kind==='batch'?await encode('png',{pixels:render(w,h),width:w,height:h,depth:o.depth}):(await sequence(w,h,'png')).data});await pause();}download(await encode('zip',{entries}),p.name+'-'+kind+'.zip');}
  else{const result=await sequence(o.width,o.height,kind==='frames'?'frames':kind==='atlas-exr'?'exr':'png');check();if(kind==='atlas-preview'){const url=URL.createObjectURL(new Blob([result.data],{type:'image/png'}));const img=el('img',{src:url,alt:'完整画布图集预览',style:'max-width:100%;object-fit:contain'});img.onload=()=>URL.revokeObjectURL(url);$('global-controls').append(img);notify(`图集预览 ${result.width} × ${result.height}`);return;}download(result.data,p.name+(kind==='frames'?'-frames.zip':kind==='atlas-exr'?'-atlas.exr':'-atlas.png'));}
  notify('导出完成');
 }catch(e){notify(e.message);}finally{exportController=null;busy=false;if(globalPanel&&kind!=='atlas-preview')renderGlobalPanel();else if(globalPanel){$('export-progress')?.remove();$('confirm-export').disabled=false;$('confirm-export').textContent='开始导出';[...$('global-controls').querySelectorAll('button')].find(b=>b.textContent==='取消导出')?.remove();}requestRender();}
}
$('tree-examples').onclick=()=>window.open(pageHref('examples'),'_blank','noopener');
$('new-project').onclick=()=>{returnWork();edit(()=>{state=project();state.root.children=[];selected=state.root.id;animationEditMode='normal';localAnimationPreview=null;time=0;});};$('project-name').onchange=()=>edit(()=>state.name=$('project-name').value);$('add-shape').onclick=()=>graphicsLibrary.open();$('add-group').onclick=()=>insert(node('group'));$('wrap-top-level').onclick=()=>edit(()=>{const group=node('group');group.name='组合';group.children=state.root.children;state.root.children=[group];selected=group.id;});$('duplicate').onclick=()=>edit(()=>{const ids=duplicateSelection(state.root,selectedIds);selectedIds=new Set(ids);selected=selectionPrimary=ids.at(-1)??state.root.id;});$('delete').onclick=()=>edit(()=>deleteSelection(state.root,selectedIds));
function restoreHistory(from,to){if(!from.length||busy)return;const current=structuredClone(state),target=from.pop();state=shelf.restore(target,current);to.push(current);if(!find(state.root,selected))selected=state.root.id;persist();refresh();}
$('undo').onclick=()=>restoreHistory(history,future);$('redo').onclick=()=>restoreHistory(future,history);
async function saveComponent(source){const name=await requestGraphicName('保存到图形列表',source.id===state.root.id?state.name:source.name);if(name===null||busy)return;const entry=createProjectResource(source,{name});if(componentPreview){projectOwner().projectResources.push(entry);persistSharedResources();localStorage.setItem(storageKey,serializeLocalProject(canvasProject(projectOwner())));}else edit(()=>{state.projectResources.push(entry);const original=find(state.root,source.id)?.node;if(original)original.resourceRef=entry.id;});library();previewButtons();notify('已保存到图形列表');}
async function renameListItem(id){const old=projectOwner().projectResources.find(r=>r.id===id);if(!old||busy)return;const name=await requestGraphicName('重命名图形列表条目',old.name);if(name===null||name===old.name||busy)return;const active=componentPreview?.id;if(componentPreview)returnWork();edit(()=>state.projectResources=state.projectResources.map(r=>r.id===id?renameProjectResource(r,name):r));const cached=previewSessions.get('preset:'+id);if(cached){cached.name=name;for(const draft of [cached.original,cached.session.state])for(const child of draft.root.children)if(child.name===old.name)child.name=name;}if(active){const entry=state.projectResources.find(r=>'preset:'+r.id===active);if(entry)browse({id:active,name:entry.name,kind:'preset',preset:entry});}library();previewButtons();notify('已重命名图形列表条目');}
async function exportPack(payload,name,options){try{download(await encodeResourcePack(payload,options),name+'.zip','application/zip');}catch(e){notify(e.message);}}
async function loadPackFile(file){if(file.size>64*1024*1024)throw Error('文件超过64MB');if(/\.zip$/i.test(file.name))return readResourcePack(await file.arrayBuffer());if(file.type.startsWith('image/')){const asset=await imageAsset(file);return readResourcePack(await encodeResourcePack({schema:'momo.texture-assets/v1'},{assets:[[asset.definition.id,asset]]}));}if(file.size>4000000)throw Error('JSON超过4MB');return {payload:JSON.parse(await file.text()),prepared:[],register(){},persist(){},rollback(){}};}
function validatePackGraphics(pack){let test;try{if(pack.prepared.length){test=new TreeRenderer(document.createElement('canvas'));for(const [id]of pack.prepared){const p=project();p.root.children=[node('shape',id)];test.draw(p,32,32,{time:.25,quality:1});p.root.children[0].seamless=true;test.draw(p,32,32,{time:.25,quality:1});}}}finally{test?.destroy();}}
$('save-project').onclick=()=>exportPack(canvasProject(state),state.name);$('open-project').onclick=()=>$('project-file').click();$('project-file').onchange=async()=>{let pack;try{const file=$('project-file').files[0];if(!file)return;pack=await loadPackFile(file);pack.register();const p=sanitizeTree(pack.payload);validatePackGraphics(pack);await pack.persist();returnWork();edit(()=>{state=p;selected=p.root.id;animationEditMode='normal';localAnimationPreview=null;time=0;});library();}catch(e){pack?.rollback();notify(e.message);}finally{$('project-file').value='';}};
$('save-selected-component').onclick=()=>graphicsLibrary.publish(current(),projectOwner().projectResources.find(r=>r.id===current().resourceRef)?.source);
$('export-now').onclick=()=>openGlobal('export');$('project-settings').onclick=()=>openGlobal('project');$('close-global').onclick=()=>{globalPanel=null;$('global-panel').hidden=true;renderPreviewSettings();$('export-now').focus();};$('solo').onclick=()=>{solo=!solo;if(solo)select(selected);$('solo').textContent=solo?'返回整体预览':'单独预览';requestRender();};$('shape-search').oninput=library;
function sizePreview(){if(materialMode())return;const stage=$('canvas-stage'),surface=$('tree-preview-surface'),dims=previewDimensions(state.canvas.ratio,Math.max(64,(stage.clientWidth||512)-56),Math.max(64,(stage.clientHeight||512)-56),$('zoom').value==='fit'?1:Number($('zoom').value));surface.style.width=dims.displayWidth+'px';surface.style.height=dims.displayHeight+'px';surface.classList.toggle('tiled',tiled);}
const PreviewObserver=globalThis.ResizeObserver??window.ResizeObserver;
if(PreviewObserver)new PreviewObserver(()=>{sizePreview();requestRender();}).observe($('canvas-stage'));
$('tree-time').oninput=()=>seekAnimationScope(animationEditor.getScope(),+$('tree-time').value);$('zoom').onchange=()=>{sizePreview();requestRender();};
// Viewing zoom never changes authored UVs or export dimensions.
$('canvas-stage').addEventListener('wheel',e=>{
 if(materialMode())return;
 e.preventDefault();if(busy||uvDrag||panStart||canvasEditor?.interacting()||!e.deltaY)return;
 const stage=$('canvas-stage'),surface=$('tree-preview-surface'),select=$('zoom'),steps=[.25,.5,.75,1,1.25,1.5,2,3,4],zoom=select.value==='fit'?1:Number(select.value);
 const next=e.deltaY<0?steps.find(v=>v>zoom):[...steps].reverse().find(v=>v<zoom);if(next===undefined)return;
 const before=surface.getBoundingClientRect(),u=(e.clientX-before.left)/Math.max(1,before.width),v=(e.clientY-before.top)/Math.max(1,before.height);
 select.value=String(next);sizePreview();const after=surface.getBoundingClientRect();stage.scrollLeft+=after.left+u*after.width-e.clientX;stage.scrollTop+=after.top+v*after.height-e.clientY;requestRender();
},{passive:false});
$('show-guides').onchange=drawGuides;
$('show-pivot').onchange=drawGuides;
$('retry-render').onclick=()=>{try{materialPreview?.destroy();materialPreview=null;if(renderer.gl.isContextLost()){renderer.destroy();renderer=new TreeRenderer(document.createElement('canvas'));watchContext();}else renderer.clearCache();requestRender();}catch(e){showRenderError(e.message);}};
$('animation-panel').ontoggle=()=>requestRender();
$('background').onchange=()=>{$('canvas-stage').className=$('background').value;$('canvas-stage').classList.toggle('material-mode',materialMode());};
$('tile-preview').onclick=()=>{tiled=!tiled;$('tile-preview').setAttribute('aria-pressed',String(tiled));requestRender();};
$('play-duration').onchange=()=>{const value=$('play-duration').valueAsNumber;if(!Number.isFinite(value)||value<=0){$('play-duration').value=state.output.seconds;return;}edit(()=>state.output.seconds=Math.max(.05,Math.min(600,value)));};
$('restart-play').onclick=()=>{seekAnimationScope(animationEditor.getScope(),0);$('play').click();};
$('play').onclick=()=>{if(animationEditMode==='base'){animationEditMode='normal';inspector();}if(!playing&&animationEditor.getScope()!==state.root.id&&!localAnimationPreview)localAnimationPreview={id:animationEditor.getScope(),time:animationClock(animationEditor.getScope()).progress};playing=!playing;$('play').textContent=playing?'暂停':'播放';requestRender();};let last=performance.now();function tick(now){const dt=(now-last)/1000;last=now;if(playing&&!busy){formulaSeconds+=dt;if(localAnimationPreview)localAnimationPreview.time=(localAnimationPreview.time+dt/state.output.seconds)%1;else time=(time+dt/state.output.seconds)%1;$('tree-time').value=time;requestRender();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
document.addEventListener('keydown',e=>{if(e.defaultPrevented||document.querySelector('dialog[open]'))return;if(e.key==='Escape'&&componentPreview){returnWork();return;}if(e.key==='Escape'&&globalPanel){$('close-global').click();return;}if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||busy||globalPanel)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();$('redo').click();return;}if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.code==='Space'){e.preventDefault();$('play').click();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$(e.shiftKey?'redo':'undo').click();}if(e.key==='Escape'&&globalPanel)$('close-global').click();});try{persistSharedResources();}catch(e){notify('常用图形列表保存失败：'+e.message);}library();refresh();

// Preview selection is view state; only generation parameters belong to the saved output settings.
function normalSettings(){
 field('法线强度','output.normal',0,20,.1,{target:state,key:false});
 choice('法线算法',state.output.normalAlgorithm,[['sobel','Sobel'],['scharr','Scharr']],v=>edit(()=>state.output.normalAlgorithm=v));
 for(const [key,label]of [['normalFlipX','翻转法线 X'],['normalFlipY','翻转法线 Y'],['normalInvert','反转高度方向']])check(label,state.output[key],v=>edit(()=>state.output[key]=v));
 field('法线预平滑','output.normalSmooth',0,8,.1,{target:state,key:false});
}
function renderPreviewSettings(){
 const host=$('normal-preview-settings');host.hidden=$('preview-channel').value!=='normal'||!!globalPanel;
 if(host.hidden)return;
 const previous=formTarget;formTarget=host;host.replaceChildren();
 try{normalSettings();note('根据画布高度生成法线；原色图片使用亮度作为高度。参数会保存并用于法线导出；导出时请选择“输出内容 → 法线”。');}finally{formTarget=previous;}
}
function openGlobal(kind){globalPanel=kind;$('global-panel').hidden=false;renderGlobalPanel();renderPreviewSettings();$('close-global').focus();}
function renderGlobalPanel(){
 formTarget='global-controls';controls().replaceChildren();$('global-title').textContent=globalPanel==='project'?'画布设置':'导出完整画布';
 try{
 if(globalPanel==='project'){
  heading('画布比例');choice('常用比例',String(state.canvas.ratio),[[1,'1 : 1'],[4/3,'4 : 3'],[16/9,'16 : 9'],[3/4,'3 : 4'],[9/16,'9 : 16'],[state.canvas.ratio,'当前比例']],v=>edit(()=>{state.canvas.ratio=+v;Object.assign(state.output,outputDimensions(+v,state.output.width));}));
  field('宽 / 高','canvas.ratio',.125,8,.001,{target:state,key:false});note('画布只规定比例，不规定像素。节点仍使用各自的 0～1 空间；实际像素尺寸在导出时设置。');
  field('播放时长（秒）','output.seconds',.05,600,.05,{target:state,key:false});
 }else{
  choice('导出类型',exportKind,[['copy','复制 PNG8 图片'],['png','PNG · 当前帧'],['psd','PSD · 当前帧分层文件'],['psd-vector','PSD · 矢量轮廓（效果简化）'],['svg','SVG · 矢量轮廓（效果简化）'],['exr','EXR · 当前帧'],['frames','逐帧 PNG ZIP'],['atlas','序列帧图集 PNG'],['atlas-exr','序列帧图集 EXR'],['atlas-preview','查看序列帧图集'],['batch-atlas','三档图集 PNG ZIP'],['batch','三档尺寸 PNG ZIP']],v=>{if(busy)return;exportKind=v;renderGlobalPanel();});
  note('导出整个画布，忽略预览贴图类型、单独预览、查看缩放与辅助框。请在下方选择输出内容；宽高按画布比例联动。');
  if(!['batch','batch-atlas'].includes(exportKind))for(const [key,label]of [['width','像素宽'],['height','像素高']])field(label,'output.'+key,1,4096,1,{target:state,key:false});
  if(['frames','atlas','atlas-exr','atlas-preview','batch-atlas'].includes(exportKind)){field('每秒帧数（FPS）','output.fps',1,120,1,{target:state,key:false});field('播放秒数','output.seconds',.05,600,.05,{target:state,key:false});check('循环导出不重复尾帧',state.output.loopExport,v=>edit(()=>state.output.loopExport=v));note(`每秒 ${state.output.fps.toFixed(2)} 帧 × ${state.output.seconds} 秒 → 总计 ${state.output.frames} 帧${state.output.loopExport?'（不含结束帧）':'（含结束帧）'}。图集与逐帧图片请在使用端按相同 FPS 播放。`);}
  if(exportKind.startsWith('atlas')||exportKind==='batch-atlas')field('图集列数','output.columns',1,32,1,{target:state,key:false});
 }
 if(globalPanel!=='export'||!['psd-vector','svg'].includes(exportKind)){
 heading('画布输出外观');choice('输出内容',state.output.mode,[['color','颜色'],['height','高度'],['normal','法线'],['rgba','自定义 RGBA 通道']],v=>edit(()=>state.output.mode=v));
 if(['normal','rgba'].includes(state.output.mode)){
  normalSettings();
 }
 if(state.output.mode==='rgba')for(let i=0;i<4;i++)choice('RGBA'[i]+' 通道',state.output.channels[i],['高度','反相高度','法线X','法线Y','法线Z','0','1','0.5','透明度','法线斜率'].map((label,i)=>[i,label]),v=>edit(()=>state.output.channels[i]=+v));
 }
 const bg=colorInput('画布背景颜色',state.output.background,value=>state.output.background=value);controls().append(el('label',{class:'tree-field'},[document.createTextNode('背景颜色'),bg]));
 check('透明背景',state.output.alpha,v=>edit(()=>state.output.alpha=v));
 if(globalPanel==='export'){
  if(['exr','atlas-exr'].includes(exportKind))check('EXR ZIP 无损压缩',state.output.exrZip,v=>edit(()=>state.output.exrZip=v));
  if(!['exr','atlas-exr','copy','psd','psd-vector','svg'].includes(exportKind))choice('PNG精度',state.output.depth,[[8,'8位'],[16,'16位']],v=>edit(()=>state.output.depth=+v));
  const o=state.output,d=outputDimensions(state.canvas.ratio,o.width),frames=['frames','atlas','atlas-exr','atlas-preview','batch-atlas'].includes(exportKind)?o.frames:1;
  if(['psd-vector','svg'].includes(exportKind)){
   note(`${exportKind==='svg'?'SVG':'PSD'} 矢量轮廓 · ${d.width} × ${d.height} · 当前进度 ${time.toFixed(3)}。每个导出部分写成可编辑路径＋单色填充的形状图层。`);
   const threshold=el('input',{type:'number','aria-label':'轮廓透明度阈值',min:0,max:99,step:1,value:contourThreshold,onchange:e=>{if(busy)return;contourThreshold=Math.max(0,Math.min(99,Math.round(Number(e.target.value)||0)));renderGlobalPanel();}});threshold.disabled=busy;controls().append(el('label',{class:'tree-field'},[document.createTextNode('透明度阈值（%）'),threshold]));
   const smoothing=el('input',{type:'checkbox','aria-label':'轮廓平滑',checked:contourSmooth,onchange:e=>{if(busy)return;contourSmooth=e.target.checked;renderGlobalPanel();}});smoothing.disabled=busy;controls().append(el('label',{class:'tree-check'},[smoothing,document.createTextNode('轮廓平滑（亚像素边界）')]));
   note(contourSmooth?'非零阈值使用亚像素插值，在预算内精细采样，再逐条拟合轮廓。平滑允许约1像素边缘偏差；局部细节受影响时保留该轮廓，不会直接退回整个排列。':'关闭平滑：精确保留非空像素单元边界，放大后可见阶梯边缘。');
   note('默认 50%：沿半透明边缘插值定位轮廓，减少淡边凸起。设为 0% 可恢复“非空即保留”，但可能包含细碎边缘。羽化与像素级半透明变成硬轮廓；渐变/多色变成单色，保留节点整体透明度。');
   note('轮廓精度由导出采样尺寸决定。噪声可能变成整块区域；遮罩结果变成孔洞，不能再单独编辑遮罩。高度、法线及通道输出不参与轮廓判定。');
   try{const plan=planContourPSD(state,{time,width:d.width,height:d.height});note(`预计最多 ${plan.stats.pixels+(plan.background?1:0)} 个形状图层；空区域略过。`);for(const warning of plan.warnings)note(warning);}catch(e){note(e.message);}
  }else if(exportKind==='psd'){
   note(`PSD · RGB 8位 · ${d.width} × ${d.height} · 当前进度 ${time.toFixed(3)}。保留可拆分的节点层级；隐藏节点不导出。`);
   note('纯色、硬边且无 UV/排列/蒙版效果的圆形、圆环和椭圆保留为可编辑形状；其他图形为像素图层。组合变换、组透明度与遮罩等效果会合成相应部分，并以“合成”标注。形状重新渲染时边缘抗锯齿可能略有不同。');
   try{const plan=planPSD(state,{time,width:d.width,height:d.height});note(`预计 ${plan.stats.vectors} 个形状图层、${plan.stats.pixels} 个像素图层、${Math.max(0,plan.stats.groups-1)} 个组合。拆层若无法保持外观，将保留完整合成。`);for(const warning of plan.warnings)note(warning);}catch(e){note(e.message);}
  }else note(exportKind==='batch-atlas'?'输出摘要：单帧最长边 64 / 128 / 256，保持比例，3 张图集打包。':exportKind==='batch'?'输出摘要：最长边 256 / 512 / 1024，保持画布比例，PNG '+o.depth+'位，3 张图片打包。':`输出摘要：${d.width} × ${d.height} / 帧 · ${['exr','atlas-exr'].includes(exportKind)?'EXR 16位浮点（Half）':'PNG '+(exportKind==='copy'?8:o.depth)+'位'} · ${frames} 帧${!['frames','atlas','atlas-exr','atlas-preview','batch-atlas'].includes(exportKind)?' · 当前进度 '+time.toFixed(3):' / '+o.seconds+' 秒 · '+o.fps.toFixed(2)+' FPS'}${exportKind.startsWith('atlas')?' · 图集 '+d.width*Math.min(o.columns,o.frames)+' × '+d.height*Math.ceil(o.frames/Math.min(o.columns,o.frames)):''}`);
  const button=el('button',{id:'confirm-export',class:'primary',text:busy?'正在导出…':'开始导出',onclick:()=>exportImage(exportKind)});button.disabled=busy;controls().append(button);if(busy){for(const input of controls().querySelectorAll('input,select'))input.disabled=true;controls().append(el('div',{id:'export-progress',role:'status','aria-live':'polite'},[el('progress',{'aria-label':'导出处理中'}),el('span',{id:'export-stage',text:'正在准备导出…'}),el('span',{class:'tree-note',text:'复杂图形可能需要较长时间，请稍候。'})]),el('button',{text:'取消导出',onclick:()=>{cancelExport=true;exportController?.abort();exportStage('正在取消…');}}));controls().lastElementChild.scrollIntoView({block:'nearest'});}
 }
 }finally{formTarget='inspector';}
}
function attachDrag(line,n){
 line.draggable=n.id!==state.root.id;line.dataset.nodeId=n.id;
 line.ondragstart=e=>{if(busy||n.id===state.root.id){e.preventDefault();return;}if(!selectedIds.has(n.id))multiSelect(n.id);dragged=n.id;e.dataTransfer?.setData('text/plain',n.id);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';};
 const clear=()=>document.querySelectorAll('.drop-before,.drop-after,.drop-inside').forEach(e=>e.classList.remove('drop-before','drop-after','drop-inside'));
 const placement=e=>{const r=line.getBoundingClientRect(),f=(e.clientY-r.top)/Math.max(1,r.height);return n.kind==='group'&&f>.25&&f<.75?'inside':f<.5?'before':'after';};
 const valid=where=>{const source=find(state.root,dragged),dest=find(state.root,n.id);return source?.parent&&dest&&n.id!==dragged&&!selectedRoots().some(s=>find(s,n.id))&&(where==='inside'?n.kind==='group':dest.parent&&dest.parent.mask!==dest.node);};
 line.ondragover=e=>{clear();const where=placement(e);if(!valid(where))return;e.preventDefault();line.classList.add('drop-'+where);if(e.dataTransfer)e.dataTransfer.dropEffect='move';};
 line.ondragleave=()=>clear();line.ondragend=()=>{dragged=null;clear();document.querySelector('.tree-root-drop')?.classList.remove('active');};
 line.ondrop=e=>{e.preventDefault();const where=placement(e);clear();if(!valid(where)){dragged=null;return;}const id=dragged;dragged=null;edit(()=>{const dest=find(state.root,n.id),parent=where==='inside'?dest.node:dest.parent;let index=where==='inside'?parent.children.length:parent.children.indexOf(dest.node)+(where==='after'?1:0);moveSelection(state.root,selectedIds,parent.id,index);selected=id;revealAncestors(id);});};
}
function drawGuides(){
 if(materialMode()){$('selection-guide').hidden=true;$('guide-note').textContent='三维材质预览 · 导出仍使用画布贴图';return;}
 const svg=$('selection-guide');svg.replaceChildren();const showRegion=$('show-guides').checked,showPivot=$('show-pivot').checked;const hidden=(selected===state.root.id)||!(showRegion||showPivot);svg.toggleAttribute('hidden',hidden);$('guide-note').textContent='金色框：画布范围（最终输出边界）';if(hidden){canvasEditor?.draw();if(selectedIds.size>1)$('guide-note').textContent+=' · 已选 '+selectedIds.size+' 个节点，可一起拖动位置';return;}
 const {regions}=selectionRegions(animationPreviewProject(),selected,time,{solo:solo,records:arrangementRecords});
 const copies=tiled?2:1,ns='http://www.w3.org/2000/svg',add=(name,attrs)=>{const e=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);};
 const bounds=svg.getBoundingClientRect(),sx=1000/Math.max(1,bounds.width),sy=1000/Math.max(1,bounds.height);
 for(let row=0;row<copies;row++)for(let col=0;col<copies;col++)for(const r of regions){
  const point=p=>[(p[0]+col)*1000/copies,(1-p[1]+row)*1000/copies];
  const c=point(r.center),p=point(r.pivot);
  if(showRegion){add('polygon',{points:r.corners.map(point).map(p=>p.join(',')).join(' '),class:'region-box'});add('path',{d:`M${c[0]-5},${c[1]}h10 M${c[0]},${c[1]-5}v10`,class:'region-center'});}
  if(showPivot){
   const d=`M${p[0]-12*sx},${p[1]}h${24*sx} M${p[0]},${p[1]-12*sy}v${24*sy}`;
   for(const style of ['pivot-outline','pivot-marker']){add('ellipse',{cx:p[0],cy:p[1],rx:7*sx,ry:7*sy,class:style});add('path',{d,class:style});}
  }
 }
 canvasEditor?.draw();
 $('guide-note').textContent=regions.length?`金色框：画布范围${showRegion?' · 蓝色框：选中节点 · + 中心':''}${showPivot?' · 十字圆环：轴心':''} · 无缝副本不额外描框`:'当前节点隐藏或区域为零';if(selectedIds.size>1)$('guide-note').textContent+=' · 已选 '+selectedIds.size+' 个节点，可一起拖动位置';else if(regions.length>1)$('guide-note').textContent+=' · 副本共享同一个源节点';
}
$('global-panel').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const buttons=[...$('global-panel').querySelectorAll('button,input,select')].filter(x=>!x.disabled),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});

function currentColorContext(){return colorContext(state.root,selected,n=>animationClock(n.id).node);}
function intrinsicColor(n){return n.kind==='shape'&&['inherit','preserve'].includes(n.color.mode)&&(isImage(n.type)&&n.params[0]<.5||!!BY_ID.get(n.type)?.definition.generator);}
function openColorPanel(){section='color';inspector();document.querySelector('.tree-inspector').scrollTop=0;}
function goColorSource(id){section='color';select(id);document.querySelector('.tree-inspector').scrollTop=0;}
function colorStatus(context){const {local,source,children}=context;if(children)return '保留各子节点颜色';if(intrinsicColor(local))return isImage(local.type)?'使用图片原色':'使用生成器原色';if(['own','remap'].includes(local.color.mode))return local.color.mode==='remap'?'组合统一配色':'独立配色';return source?'继承自：'+source.name:'使用默认黑白配色';}
function adoptNodeColor(n){const context=currentColorContext(),color=independentColor(context);edit(()=>{for(const key of ['mode','fill','low','high'])assignAnimated(n,'color.'+key,color[key]);if(color.stops)n.color.stops=structuredClone(color.stops);else delete n.color.stops;});}
function renderColorQuick(n){
 const host=$('inspector-color-quick'),context=currentColorContext(),local=context.local,own=['own','remap'].includes(local.color.mode);host.hidden=false;host.replaceChildren();
 const body=el('div',{class:'color-quick-body',id:'color-quick-body'}),arrow=el('span',{class:'color-quick-arrow','aria-hidden':'true'}),toggle=el('button',{class:'color-quick-toggle','aria-controls':'color-quick-body'},[arrow,el('strong',{text:'颜色'}),el('span',{class:'color-quick-mini','aria-hidden':'true'}),el('span',{class:'color-quick-summary'})]);
 const setExpanded=()=>{body.hidden=!quickColorExpanded;host.classList.toggle('is-expanded',quickColorExpanded);toggle.setAttribute('aria-expanded',String(quickColorExpanded));toggle.setAttribute('aria-label',quickColorExpanded?'收起颜色快捷区':'展开颜色快捷区');arrow.textContent=quickColorExpanded?'▾':'▸';};toggle.onclick=()=>{quickColorExpanded=!quickColorExpanded;setExpanded();};setExpanded();
 const link=el('button',{class:'color-settings-link',text:'颜色设置 →',onclick:openColorPanel});host.append(el('div',{class:'color-quick-heading'},[toggle,link]),body);
 const row=el('div',{class:'color-quick-row'});if(own&&local.color.fill==='solid'){const picker=colorInput('快捷填充颜色',local.color.high,value=>n.color.high=value,'color.high');picker.classList.add('color-quick-picker');row.append(picker);}else row.append(el('button',{class:'color-quick-swatch','aria-label':'打开颜色设置',onclick:openColorPanel}));body.append(row,el('p',{class:'color-quick-source'}));
 const opacity=el('input',{type:'number',min:0,max:100,step:1,value:Math.round(animationValue(n,'opacity')*10000)/100,'aria-label':'快捷透明度（%）','data-animation-scale':'100',title:'当前节点整体透明度；组合控制整个组合'});decorateAnimated(opacity,n,'opacity');opacity.onchange=()=>{if(!Number.isFinite(opacity.valueAsNumber)){opacity.value=String(Math.round(animationValue(n,'opacity')*10000)/100);return;}stopAnimation();edit(()=>assignAnimated(n,'opacity',Math.max(0,Math.min(1,opacity.valueAsNumber/100))));};const slider=el('input',{type:'range',min:0,max:100,step:1,value:Math.round(animationValue(n,'opacity')*10000)/100,'aria-label':'快捷透明度滑动条','data-animation-scale':'100'});decorateAnimated(slider,n,'opacity');let before=null;
 slider.oninput=()=>{if(busy)return;stopAnimation();before??=structuredClone(state);try{assignAnimated(current(),'opacity',Number(slider.value)/100);opacity.value=slider.value;requestRender();}catch(error){notify(error.message);}};
 const commit=()=>{if(!before)return;const previous=before,focused=document.activeElement===slider;before=null;try{state=validatedState(state);if(JSON.stringify(state)!==JSON.stringify(previous)){recordHistory(previous);if(history.length>60)history.shift();future=[];}persist();refresh();if(focused)$('inspector-color-quick').querySelector('input[type=range]')?.focus();}catch(error){state=previous;notify(error.message);refresh();}};slider.onchange=commit;slider.onblur=commit;
 body.append(el('div',{class:'color-quick-opacity'},[el('span',{text:'透明度'}),slider,opacity,el('span',{text:'%'})]));
 const actions=el('div',{class:'color-quick-actions'});
 if(!own){const adopt=el('button',{text:intrinsicColor(local)?'自定义着色':context.children?'为子节点设置配色':'改为独立配色',onclick:()=>adoptNodeColor(n)});decorateAnimated(adopt,n,'color.mode');actions.append(adopt);}
 if(!own&&context.source&&context.source.id!==n.id&&!intrinsicColor(local))actions.append(el('button',{text:'前往来源',onclick:()=>goColorSource(context.source.id)}));
 if(context.override)actions.append(el('button',{text:'查看上层统一配色',onclick:()=>goColorSource(context.override.id)}));if(actions.children.length)body.append(actions);syncColorQuick();
}
function syncColorQuick(){
 const host=$('inspector-color-quick');if(host.hidden||current()===state.root)return;const context=currentColorContext(),special=context.children||intrinsicColor(context.local),swatch=host.querySelector('.color-quick-swatch');
 if(swatch){swatch.classList.toggle('color-original',special);swatch.style.background=special?'':colorBackground(context.palette);swatch.textContent=special?(context.children?'子节点各自配色':'原色'):'编辑渐变 / 颜色';}
 const mini=host.querySelector('.color-quick-mini');mini.classList.toggle('color-original',special);mini.style.background=special?'':colorBackground(context.palette);host.querySelector('.color-quick-summary').textContent=Math.round(animationValue(current(),'opacity')*10000)/100+'%';
 host.querySelector('.color-quick-source').textContent=colorStatus(context)+(context.override?' · 最终受“'+context.override.name+'”统一配色影响':'');
 for(const preview of $('inspector').querySelectorAll('.color-gradient-preview'))preview.style.background=colorBackground(context.palette);
 for(const input of $('inspector').querySelectorAll('input[type=color]')){const hex=input.parentElement.querySelector('input[data-color-hex]');if(hex&&document.activeElement!==hex)hex.value=input.value.toUpperCase();}
}
function colorControl(n,label,value,assign,path=null){
 const row=el('div',{class:'color-control-row'}),input=colorInput(label,value,assign,path),hex=el('input',{type:'text',value:(path?animationValue(n,path):value).toUpperCase(),'aria-label':label+' HEX','data-color-hex':'',maxLength:7,spellcheck:'false'});
 if(path)decorateAnimated(hex,n,path);hex.oninput=()=>hex.setCustomValidity('');hex.onchange=()=>{const next=normalizeHex(hex.value);if(!next){hex.setCustomValidity('请输入3位或6位十六进制颜色，例如 #80DFFF');hex.reportValidity();return;}stopAnimation();edit(()=>path?assignAnimated(n,path,next):assign(next));};
 row.append(el('label',{text:label}));if(path)row.append(keyButton(n,path,label));else row.append(el('span'));row.append(el('div',{class:'color-control-inputs'},[input,hex]));controls().append(row);
}
function renderColorPanel(n){
 const context=currentColorContext(),mode=context.local.color.mode;field('透明度','opacity',0,1);heading('节点颜色');
 animatedChoice('配色','color.mode',[['inherit','继承父级配色'],['own','自定义配色'],...(n.kind==='group'?[['preserve','保留子节点颜色'],['remap','组合统一配色']]:[])]);
 if(context.override){const notice=el('div',{class:'color-notice',text:'最终颜色还会受上层“'+context.override.name+'”的统一配色影响。'});notice.append(el('button',{text:'前往统一配色来源',onclick:()=>goColorSource(context.override.id)}));controls().append(notice);}
 if(!['own','remap'].includes(mode)){note(colorStatus(context)+'。可通过上方快捷入口切换配色或前往来源。');if(context.children)note('为组合设置配色会影响继承它的子节点；已有独立配色的子节点保留自己的颜色。');if(intrinsicColor(context.local))note('自定义着色会按图形亮度重新映射颜色。');return;}
 animatedChoice('着色方式','color.fill',[['solid','纯色填充'],['gradient','数值渐变']]);
 if(animationValue(n,'color.fill')==='solid'){colorControl(n,'填充颜色',n.color.high,value=>n.color.high=value,'color.high');note('边缘只改变透明度，填充颜色保持一致；已有渐变设置保留。');}
 else gradientEditor(n);
 if(n.kind==='group')note(mode==='remap'?'先合成组合内容，再统一映射颜色。':'只为继承配色的子节点提供颜色，独立配色的子节点保持原样。');
}
function gradientEditor(n){
 const color=animationClock(n.id).node.color,custom=n.color.stops?.length>=2,stops=custom?n.color.stops:[{position:0,color:animationValue(n,'color.low')},{position:1,color:animationValue(n,'color.high')}];
 const preview=el('div',{class:'color-gradient-preview',role:'img','aria-label':'当前渐变颜色'});preview.style.background=colorBackground(color);controls().append(preview);
 if(!custom){heading('渐变端点');colorControl(n,'暗部颜色',n.color.low,value=>n.color.low=value,'color.low');colorControl(n,'亮部颜色',n.color.high,value=>n.color.high=value,'color.high');}
 heading('配色预设');const presets=el('div',{class:'color-preset-grid'});for(const palette of PALETTES){const strip=el('span',{class:'color-preset-strip'});strip.style.background=colorBackground({fill:'gradient',stops:palette.stops});presets.append(el('button',{class:'color-preset','aria-label':'应用配色预设 '+palette.name,onclick:()=>edit(()=>{n.color.stops=structuredClone(palette.stops);})},[strip,el('span',{text:palette.name})]));}controls().append(presets);
 if(custom)heading('渐变色标');
 if(custom)stops.forEach((stop,i)=>{
  const parent=formTarget,card=el('div',{class:'color-stop-card'});controls().append(card);formTarget=card;
  try{colorControl(n,'色标颜色 '+(i+1),stop.color,value=>n.color.stops[i].color=value);const pos=el('input',{type:'number',min:0,max:1,step:.01,value:stop.position,'aria-label':'色标位置 '+(i+1),onchange:()=>edit(()=>{n.color.stops[i].position=+pos.value;})}),del=el('button',{text:'删除色标','aria-label':'删除色标 '+(i+1),onclick:()=>edit(()=>n.color.stops=n.color.stops.filter((_,j)=>j!==i))});del.disabled=stops.length<=2;controls().append(el('label',{class:'tree-field'},[document.createTextNode('位置'),pos,del]));}finally{formTarget=parent;}
 });
 const add=el('button',{text:'增加色标',onclick:()=>edit(()=>n.color.stops=[...structuredClone(stops),{position:.5,color:'#808080'}])});add.disabled=stops.length>=8;
 controls().append(el('div',{class:'color-stops-actions'},[add,el('button',{text:'恢复双色渐变',onclick:()=>edit(()=>{const sorted=[...stops].sort((a,b)=>a.position-b.position);assignAnimated(n,'color.low',sorted[0].color);assignAnimated(n,'color.high',sorted.at(-1).color);delete n.color.stops;})})]));
 note(custom?'最多8个色标，按位置从暗到亮映射。多色色标不支持关键帧；恢复双色渐变后可录制端点颜色。':'暗部与亮部按图案数值映射；两个端点颜色可录制关键帧。');
}

$('share-project').onclick=async()=>{try{const portable=canvasProject(state);if(location.protocol==='file:'||JSON.stringify(portable).includes('asset_')){$('save-project').click();return;}const data=new TextEncoder().encode(JSON.stringify(portable));if(data.length>100000)throw Error('项目较大，请使用保存项目文件分享');const hash='#tree='+btoa(Array.from(data,b=>String.fromCharCode(b)).join(''));await navigator.clipboard.writeText(location.origin+location.pathname+hash);notify('配置链接已复制；接收者可替换为自己的工具地址，保留 #tree= 部分');}catch(e){notify(e.message);}};
$('tool-help').onclick=()=>openUserHelp({onValidate:()=>window.open(pageHref('validate'),'_blank','noopener')});
let uvDrag=null,grabUV=false;
$('grab-uv').onclick=()=>{grabUV=!grabUV;if(grabUV&&panPreview)$('pan-preview').click();$('grab-uv').setAttribute('aria-pressed',String(grabUV));$('tree-canvas').style.cursor=grabUV?'grab':'';notify(grabUV?'拖动预览调整选中图形的内部 UV；组合请先选择子图形':'已退出 UV 操控');};
$('tree-canvas').onpointerdown=e=>{if(e.button!==0||!grabUV||tiled||busy||current().kind!=='shape')return;const n=current();if(animationEditMode==='normal'&&['uv.2','uv.3'].some(p=>n.tracks[p]&&!n.tracks[p].muted)){notify('UV由动画控制，请开启录制或编辑基础值');return;}stopAnimation();uvDrag={id:selected,x:e.clientX,y:e.clientY,uv:[...animationClock(selected).node.uv],before:structuredClone(state),rect:$('tree-canvas').getBoundingClientRect()};$('tree-canvas').setPointerCapture(e.pointerId);};
$('tree-canvas').onpointermove=e=>{if(!uvDrag)return;const n=find(state.root,uvDrag.id)?.node;if(!n)return;try{assignAnimated(n,'uv.2',Math.max(-2,Math.min(2,uvDrag.uv[2]-(e.clientX-uvDrag.x)/uvDrag.rect.width)));assignAnimated(n,'uv.3',Math.max(-2,Math.min(2,uvDrag.uv[3]+(e.clientY-uvDrag.y)/uvDrag.rect.height)));requestRender();}catch(error){notify(error.message);}};
$('tree-canvas').onpointerup=e=>{if(!uvDrag)return;const before=uvDrag.before;uvDrag=null;if($('tree-canvas').hasPointerCapture?.(e.pointerId))$('tree-canvas').releasePointerCapture(e.pointerId);try{state=validatedState(state);if(JSON.stringify(before)!==JSON.stringify(state)){recordHistory(before);future=[];}persist();refresh();}catch(error){state=before;notify(error.message);refresh();}};
$('tree-canvas').onpointercancel=()=>{if(uvDrag){state=uvDrag.before;uvDrag=null;refresh();}};


$('collapse-library').onclick=()=>{const groups=[...$('shape-library').children].filter(e=>e.tagName==='DETAILS'),open=!groups.some(e=>e.open);groups.forEach(d=>{d.open=open;rememberLibraryGroup(d);});syncLibraryToggle();};

let panPreview=false,panStart=null;$('pan-preview').onclick=()=>{panPreview=!panPreview;if(panPreview&&grabUV)$('grab-uv').click();$('pan-preview').setAttribute('aria-pressed',String(panPreview));};
$('canvas-stage').addEventListener('pointerdown',e=>{if(materialMode()||!panPreview||grabUV)return;const stage=$('canvas-stage');panStart={x:e.clientX,y:e.clientY,left:stage.scrollLeft,top:stage.scrollTop};stage.setPointerCapture(e.pointerId);});
$('canvas-stage').addEventListener('pointermove',e=>{if(!panStart)return;const stage=$('canvas-stage');stage.scrollLeft=panStart.left+panStart.x-e.clientX;stage.scrollTop=panStart.top+panStart.y-e.clientY;});
$('canvas-stage').addEventListener('pointerup',()=>panStart=null);$('canvas-stage').addEventListener('pointercancel',()=>panStart=null);

// Batch operations share the same state transaction and undo entry as the inspector.
const groupSelected=el('button',{id:'group-selected',text:'组合所选',title:'Ctrl/Cmd+G；将同级所选节点组成一个组合',onclick:()=>edit(()=>{selected=groupSelection(state.root,selectedIds);})});
groupSelected.disabled=selected===state.root.id;$('wrap-top-level').after(groupSelected);
const selectionTools=el('div',{class:'tree-actions selection-tools'},[
 el('button',{text:'显示所选',onclick:()=>edit(()=>{for(const n of selectedRoots())n.enabled=true;})}),
 el('button',{text:'隐藏所选',onclick:()=>edit(()=>{for(const n of selectedRoots())n.enabled=false;})}),
 el('span',{class:'tree-note',text:'Ctrl 多选 · Shift 连选 · 拖动排序'})
]);$('node-tree').after(selectionTools);
let canvasBefore=null,pickRenderer=null,temporaryPan=null;const canvasHitCache=new Map();
function canvasHit(id,p){
 let pixels=canvasHitCache.get(id);const size=256,w=Math.round(state.canvas.ratio>=1?size:size*state.canvas.ratio),h=Math.round(state.canvas.ratio>=1?size/state.canvas.ratio:size);
 if(!pixels){
  const preview=structuredClone(animationPreviewProject());
  const isolate=n=>{if(n.id===id){n.blend='over';return true;}n.children=n.children.filter(isolate);const maskContains=n.mask&&find(n.mask,id);if(maskContains){const target=n.mask;n.mask=null;isolate(target);n.children=[target];}n.blend='over';return n.children.length>0;};
  isolate(preview.root);preview.output.mode='color';preview.output.alpha=true;
  pickRenderer??=new TreeRenderer(document.createElement('canvas'));pixels=pickRenderer.draw(preview,w,h,{time,formulaSeconds,solo:solo?id:null,quality:1,read:true});canvasHitCache.set(id,pixels);
 }
 const x=Math.floor(p[0]*w),y=Math.floor((1-p[1])*h);return x>=0&&y>=0&&x<w&&y<h&&pixels[(y*w+x)*4+3]>.02;
}
canvasEditor=createCanvasEditor($('tree-preview-surface'),{
 project:animationPreviewProject,time:()=>time,solo:()=>solo,records:arrangementRecords,primary:()=>selected,ids:()=>[...selectedIds],nodes:selectedRoots,
 blocked:()=>materialMode()||busy||tiled||grabUV||panPreview,busy:()=>busy,leaveOtherTools:()=>{if(grabUV)$('grab-uv').click();if(panPreview)$('pan-preview').click();},
 select:setSelection,toggle:id=>multiSelect(id,{ctrlKey:true}),refresh,render:requestRender,notify,hit:canvasHit,
 pan:on=>{if(on){temporaryPan={pan:panPreview,uv:grabUV};if(!panPreview)$('pan-preview').click();}else{if(!temporaryPan?.pan&&panPreview)$('pan-preview').click();if(temporaryPan?.uv&&!grabUV)$('grab-uv').click();temporaryPan=null;panStart=null;}},
 check:(ids,paths)=>{for(const id of ids){const n=find(state.root,id).node;if(animationEditMode==='normal'&&n.animationEnabled!==false&&paths.some(key=>n.tracks['transform.'+key]&&!n.tracks['transform.'+key].muted))throw Error('所选参数由动画控制，请开启录制或编辑基础值');}},
 begin:()=>{stopAnimation();canvasBefore=structuredClone(state);},
 apply:changes=>{
  // Validate every node before writing any, including limits enforced by loading.
  for(const {values}of changes)for(const [key,v]of Object.entries(values)){const limit=['x','y'].includes(key)?[-2,2]:key==='rotation'?[-3600,3600]:[0,1];if(!Number.isFinite(v)||v<limit[0]-1e-8||v>limit[1]+1e-8)throw Error('已到达参数范围边界，本次拖动已取消');}
  for(const {id,values,progress}of changes){const n=find(state.root,id).node;for(const [key,v]of Object.entries(values)){const path='transform.'+key;if(animationEditMode==='record')recordValue(n,path,progress,v);else assignAnimated(n,path,v);}}
 },
 end:()=>{if(!canvasBefore)return;const before=canvasBefore;canvasBefore=null;try{state=validatedState(state);if(JSON.stringify(state)!==JSON.stringify(before)){recordHistory(before);if(history.length>60)history.shift();future=[];}persist();refresh();}catch(e){state=before;notify(e.message);refresh();}},
 cancel:()=>{if(canvasBefore){state=canvasBefore;canvasBefore=null;refresh();}}
});
for(const id of ['grab-uv','pan-preview'])$(id).addEventListener('click',()=>canvasEditor.deactivate());
requestRender();

// Native disclosures retain keyboard navigation; dismiss before opening dialogs.
installEditorDocking({onChange:()=>{sizePreview();requestRender();},onMessage:notify});
const headerDropdowns=[...document.querySelectorAll('.header-dropdown')];
document.addEventListener('click',event=>{
 for(const menu of headerDropdowns){
  if(!menu.contains(event.target)||(event.target.closest('button')&&!menu.classList.contains('dock-layout-menu')))menu.open=false;
 }
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 for(const menu of headerDropdowns)if(menu.open){menu.open=false;menu.querySelector('summary').focus();event.preventDefault();}
});
