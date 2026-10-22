import {documentationURL,repositoryURL} from './documentation-links.js';
import {installHeaderToolbar} from './header-toolbar.js';
import {graphicSearchText} from './graphic-name.js';
import {messageError} from './message-catalog.js';
import {uiOption,uiError,uiText,localizeApplicationMarkup,uiFormat} from './ui-language.js';
import {installLanguageSelector} from './language-settings.js';
import {parameterLabel,onLanguageChange,interfaceLanguage} from './language.js';
import {parameterRole} from './parameter-metadata.js';
import {createEffectPreview} from './effect-preview.js';
import {mountStartupContent} from './startup.js';
import {parameterState} from './parameter-state.js';
import {ARRANGEMENT_LIMITS as LAYOUT_LIMITS} from './arrangement-limits.js';
import {createMaterialPreview} from './material-preview.js';
import {FX_SPECS,fxDefaults} from './post-fx.js';
import {openUserHelp} from './user-help.js';
import {openSupportDialog} from './support-dialog.js';
import {downloadSkill} from './skill-downloads.js';
import {runExportWorker} from './export-job.js';
import {projectDependencyIds,serializeLocalProject,restoreLocalProject} from './project-dependencies.js';
import {GRAPHIC_LIST_KEY,GraphicShelf,serializeGraphicList,restoreGraphicList,canvasProject} from './persistent-graphic-list.js';
import {createProjectResource,replaceProjectResource,publishedProjectResource,linkedProjectResource,renameProjectResource} from './project-resources.js';
import {createGraphicsLibrary,confirmGraphicAction,requestGraphicMetadata} from './graphics-workspace.js';
import {resources} from './resource-assets.js';
import {writeResources} from './resource-storage.js';
const isImage=id=>resources.get(id)?.kind==='image';
import {seamlessDescription,seamlessKind} from './seamless.js';
import {formulaTime} from './formula-time.js';
import {libraryVisible,libraryAliases,libraryVariants,libraryVariantNode} from './library-policy.js';
import {recordValue,sameTime,animatablePaths} from './animation-editing.js';
import {selectionRoots,rangeSelection,duplicateSelection,deleteSelection,groupSelection,moveSelection} from './tree-selection.js';
import {batchValues,validateSelectionValues,layoutSelection} from './selection-editing.js';
import {evaluateNode} from './tree-model.js';
import {createSelectionInspector,SELECTION_TABS} from './selection-inspector.js';
import {createCanvasEditor} from './canvas-editor.js';
import {assetFor} from './resource-assets.js';
import {encodeResourcePack,readResourcePack,imageAsset} from './resource-pack.js';
import {exportFrameProgress} from './tree-model.js';
import {createAnimationWorkspace} from './tree-animation-workspace.js';
import {outputDimensions,previewDimensions,selectionRegions} from './tree-view.js';
import {patternThumbnails} from './pattern-thumbnails.js';
import {arrangeShortcut} from './workspace-model.js';
import {graphicLabel} from './graphic-label.js';
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
document.body.className='tree-editor';mountStartupContent(`
<header class="tree-header">
<div class="tree-brand"><strong>MOMO <span>TEXTURE FORGE</span></strong><input id="project-name" aria-label="画布名称" data-i18n-aria-label="editor.canvasName" title="画布名称" data-i18n-title="editor.canvasName"></div>
<div class="tree-canvas-actions" role="group" aria-label="当前画布操作" data-i18n-aria-label="editor.canvasActions">
<details id="header-file-menu" class="header-dropdown"><summary><span data-i18n="menu.file">文件</span></summary><div class="header-dropdown-panel"><button id="new-project"><span data-i18n="editor.newCanvas">新建画布</span></button><button id="open-project"><span data-i18n="editor.openProject">打开项目…</span></button><button id="save-project"><span data-i18n="editor.saveProject">保存项目</span></button><hr><button id="share-project"><span data-i18n="editor.shareConfiguration">分享配置</span></button></div></details>
<span class="header-history"><button id="undo" class="header-icon-button" aria-label="撤销" data-i18n-aria-label="common.undo" title="撤销 (Ctrl/⌘+Z)" data-i18n-title="header.undoShortcut"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12h-3"/></svg></button><button id="redo" class="header-icon-button" aria-label="重做" data-i18n-aria-label="common.redo" title="重做 (Ctrl/⌘+Shift+Z · Ctrl+Y)" data-i18n-title="header.redoShortcut"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m16 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12h3"/></svg></button></span><button id="project-settings"><span data-i18n="editor.canvasSettings">画布设置</span></button><button id="export-now" class="primary"><span data-i18n="editor.export">导出…</span></button>
</div>
<div class="tree-resource-actions" role="group" aria-label="创作资源" data-i18n-aria-label="header.resources"><button id="open-graphics-library"><span data-i18n="menu.graphicsLibrary">图形库</span></button><button id="tree-examples"><span data-i18n="menu.examples">组合示例</span></button><details id="header-resource-menu" class="header-dropdown" hidden><summary aria-label="更多资源" data-i18n-aria-label="header.moreResources" title="更多资源" data-i18n-title="header.moreResources"></summary><div class="header-dropdown-panel"></div></details></div>
<div class="tree-tool-actions" role="group" aria-label="工具入口" data-i18n-aria-label="editor.tools"><select id="language-settings"></select><button id="support-project" title="微信扫码赞赏，支持工具持续开发" data-i18n-title="editor.scanWithWeChatToSupportContinuedDevelopment"><svg class="header-support-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg><span data-i18n="menu.support">投币支持</span></button><details class="header-dropdown header-help"><summary><span data-i18n="menu.help">帮助</span></summary><div class="header-dropdown-panel"><button id="tool-help"><span data-i18n="editor.quickGuide">使用说明</span></button><a id="detailed-help" href="https://github.com/BreezyMomo/MomoTextureForge/blob/main/README.md" target="_blank" rel="noopener noreferrer" title="打开项目 README 与图文操作教程（在新标签页打开）" data-i18n-title="editor.openTheREADMEAndIllustratedTutorialsInANewTab"><span data-i18n="editor.detailedGuide">详细说明 ↗</span></a><hr><button id="download-author-skill" title="辅助AI选择公式、SVG或位图，制作并验证可导入资源" data-i18n-title="editor.helpAICreateAndValidateFormulaSVGOrBitmapResources"><span data-i18n="editor.authoringSkill">下载创作Skill</span></button><button id="download-effects-skill" title="让AI讲解如何用编辑器实现效果，提供操作步骤和参数建议" data-i18n-title="editor.helpAIExplainEditorWorkflowsAndParameterSettings"><span data-i18n="editor.effectsSkill">下载效果指导Skill</span></button><hr><a id="github-repository" href="https://github.com/BreezyMomo/MomoTextureForge" target="_blank" rel="noopener noreferrer" title="查看源码、反馈问题或参与贡献（在新标签页打开）" data-i18n-title="editor.viewTheSourceReportIssuesOrContributeOpensANewTab"><span data-i18n="editor.githubRepository">GitHub 仓库 ↗</span></a><a id="gitee-repository" href="https://gitee.com/BreezyMomo/MomoTextureForge" target="_blank" rel="noopener noreferrer" title="访问国内源码镜像与文档（在新标签页打开）" data-i18n-title="editor.openTheSourceMirrorAndDocumentationOpensANewTab"><span data-i18n="editor.giteeRepository">Gitee 仓库 ↗</span></a></div></details></div>
<input type="file" id="project-file" accept=".json,.zip" hidden><input type="file" id="preset-file" accept=".json,.zip,.png,.jpg,.jpeg,.webp" hidden></header>
<main class="tree-workspace"><aside class="tree-left"><div class="tree-actions"><button id="add-shape"><span data-i18n="editor.shape">＋图形</span></button><button id="add-group"><span data-i18n="editor.group">＋组合</span></button><button id="wrap-top-level" title="将所有一级节点包进一个新组合" data-i18n-title="editor.wrapAllTopLevelNodesInANewGroup"><span data-i18n="editor.wrapAllInGroup">添加顶层节点</span></button><button id="duplicate"><span data-i18n="common.duplicate">复制</span></button><button id="delete"><span data-i18n="common.delete">删除</span></button><small id="node-count" class="tree-node-count" title="节点数量 / 上限" data-i18n-title="editor.nodeCountLimit"></small></div><div id="component-nav" class="tree-actions" hidden></div><div id="node-tree" role="tree" aria-label="画布节点树" data-i18n-aria-label="editor.canvasNodeTree"></div><hr><div class="tree-actions"><button id="collapse-library"><span data-i18n="editor.collapseAll">收起全部</span></button></div><input id="shape-search" placeholder="搜索图形列表" data-i18n-placeholder="editor.searchGraphics" aria-label="搜索组件" data-i18n-aria-label="editor.searchComponents"><label class="tree-library-filter"><span><span data-i18n="editor.graphicType">图形类型</span></span><select id="library-filter" aria-label="组件类型" data-i18n-aria-label="editor.componentType"><option value="all" data-i18n="editor.allResources">全部资源</option><option value="formula" data-i18n="editor.formula">公式</option><option value="image" data-i18n="editor.image">图片</option><option value="composition" data-i18n="common.group">组合</option></select></label><label class="tree-library-filter tree-library-view"><span><span data-i18n="editor.view">浏览方式</span></span><select id="shape-library-view" aria-label="图形库浏览方式" data-i18n-aria-label="editor.libraryView"><option value="grid" data-i18n="editor.thumbnailGrid">缩略图网格</option><option value="list" data-i18n="editor.list">列表</option></select></label><div id="shape-library" class="tree-library-grid"></div></aside>
<section class="tree-preview"><nav id="breadcrumbs" aria-label="节点路径" data-i18n-aria-label="editor.nodePath"></nav><div class="preview-heading"><strong id="preview-title"><span data-i18n="editor.compositePreview">合成预览</span></strong><label class="preview-mode-label"><span data-i18n="editor.textureChannel">贴图类型</span><select id="preview-channel" aria-label="预览贴图类型" data-i18n-aria-label="editor.previewTextureChannel"><option value="color" data-i18n="inspector.color">颜色</option><option value="height" data-i18n="editor.height">高度</option><option value="normal" data-i18n="editor.normal">法线</option><option value="rgba" data-i18n="editor.customRGBA">自定义 RGBA</option></select></label><label class="preview-mode-label"><span data-i18n="editor.previewMode">预览模式</span><select id="preview-mode" aria-label="预览模式" data-i18n-aria-label="editor.previewMode"><option value="canvas" data-i18n="editor.dCanvas">二维画布</option><option value="material" data-i18n="editor.dMaterial">三维材质</option><option value="effect" data-i18n="editor.effectPreview">特效预览</option></select></label><span id="render-status"><span data-i18n="editor.loading">加载中</span></span><div class="preview-actions"><button id="return-work" hidden><span data-i18n="editor.returnToCanvas">返回画布</span></button><button id="preview-add" hidden><span data-i18n="editor.addComponent">添加此组件</span></button><button id="preview-reset" hidden><span data-i18n="editor.resetResource">恢复资源初始状态</span></button><button id="preview-save" hidden><span data-i18n="editor.saveAsNewComponent">保存为新组件</span></button><button id="preview-update" hidden><span data-i18n="editor.updateComponent">更新原组件</span></button><button id="preview-undo-update" hidden><span data-i18n="editor.undoUpdate">撤销更新</span></button><button id="save-selected-component" aria-label="保存选中节点到图形库" data-i18n-aria-label="editor.saveSelectionToLibrary" title="保存选中的节点及其子节点" data-i18n-title="editor.saveTheSelectedNodeAndItsChildren"><span data-i18n="editor.saveSelectionToLibrary">保存选中节点到图形库</span></button><button id="save-whole-library" title="将当前画布上的所有节点保存为一个组合资源" data-i18n-title="editor.saveEveryNodeOnTheCanvasAsAComposition"><span data-i18n="editor.saveCanvasToLibrary">保存整个画布到图形库</span></button><button id="save-project-resource"><span data-i18n="editor.saveAsGraphic">另存到图形列表</span></button><button id="update-project-resource"><span data-i18n="editor.updateGraphic">更新到图形列表</span></button><button id="solo" aria-pressed="false"><span data-i18n="editor.soloPreview">单独预览</span></button></div></div><div id="normal-preview-settings" class="normal-preview-settings" role="group" aria-label="法线生成参数" data-i18n-aria-label="editor.normalMapSettings" hidden></div><div id="material-preview-controls" hidden></div><div id="effect-preview-controls" hidden></div><div id="canvas-stage" class="checker"><div id="tree-preview-surface"><canvas id="tree-canvas" aria-label="节点树贴图预览" data-i18n-aria-label="editor.nodeCompositionPreview"></canvas><svg id="selection-guide" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="选中节点区域" data-i18n-aria-label="editor.selectedNodeBounds" hidden></svg></div><div id="material-preview" hidden></div><div id="effect-preview" hidden></div></div><div id="preview-error" role="alert" hidden><span></span><button id="retry-render"><span data-i18n="editor.retryPreview">重试预览</span></button></div><div id="guide-note" class="tree-note"></div><div id="preview-2d-toolbar" class="tree-toolbar"><label><span data-i18n="editor.zoom">查看缩放</span><select id="zoom"><option value="fit" data-i18n="editor.fitWindow">适应窗口</option><option value="0.25">25%</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1" data-i18n="editor.fitSize">100%（适应大小）</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option><option value="3">300%</option><option value="4">400%</option></select></label><label><span data-i18n="editor.background">背景</span><select id="background"><option value="checker" data-i18n="editor.checkerboard">棋盘格</option><option value="black" data-i18n="editor.black">黑色</option><option value="white" data-i18n="editor.white">白色</option></select></label><label><input type="checkbox" id="show-guides"><span data-i18n="editor.nodeBounds">节点区域</span></label><label><input type="checkbox" id="show-pivot" checked><span data-i18n="editor.showPivot">显示轴心</span></label><button id="tile-preview" aria-pressed="false"><span data-i18n="editor.tilePreview">平铺检查</span></button><label><span data-i18n="editor.tileCount">平铺数量</span><select id="tile-grid" aria-label="平铺检查布局" data-i18n-aria-label="editor.tilePreviewLayout" title="选择预设并开启平铺检查，仅影响预览" data-i18n-title="editor.chooseATilingPresetPreviewOnly"><option value="2">2×2</option><option value="3">3×3</option><option value="4">4×4</option></select></label><button id="pan-preview" aria-pressed="false"><span data-i18n="editor.panCanvas">移动画布</span></button><button id="grab-uv" aria-pressed="false"><span data-i18n="editor.editUV">操控 UV</span></button></div><div class="tree-timeline" role="group" aria-label="动画播放控制" data-i18n-aria-label="editor.animationPlayback"><button id="play"><span data-i18n="playback.play">播放</span></button><button id="restart-play"><span data-i18n="editor.restart">重新播放</span></button><label class="play-duration"><span data-i18n="editor.duration">播放时长</span> <input id="play-duration" type="number" min="0.05" max="600" step="0.05" aria-label="播放时长（秒）" data-i18n-aria-label="editor.durationSeconds" title="当前范围从0到1的播放时长，与画布导出时长同步" data-i18n-title="editor.durationForTheCurrentScopeSharedWithCanvasExport"> <span data-i18n="editor.s">秒</span></label><label><span data-i18n="editor.scopeProgress">当前范围进度</span> <output id="time-value">0.000</output></label><input id="tree-time" type="range" min="0" max="1" step="0.001" value="0" aria-label="当前范围滑动进度" data-i18n-aria-label="editor.scopeProgressSlider"><span id="local-time"></span></div><details id="animation-panel"><summary><span data-i18n="editor.animationEditorTimeline">动画编辑与时间轴</span></summary><div id="node-animation-editor"></div></details><p id="preview-hint" class="tree-hint"><span data-i18n="editor.clickToSelectDragToMoveDoubleClickToEnterA">单击选择 · 拖动移动 · 双击进入组合 · 空白拖动框选 · Space 移动画布 · Alt 切换重叠节点 · Esc 取消拖动</span></p></section>
<aside class="tree-inspector"><div id="selected-heading"></div><div id="selected-path" class="tree-note"></div><div id="inspector-color-quick" class="inspector-color-quick" hidden></div><nav id="inspector-tabs"></nav><div id="inspector"></div></aside></main><div id="tree-toast" role="status"></div><div id="global-panel" class="tree-modal" role="dialog" aria-modal="true" aria-labelledby="global-title" hidden><section><header><h2 id="global-title"></h2><button id="close-global" aria-label="关闭面板" data-i18n-aria-label="editor.closePanel"><span data-i18n="common.close">关闭</span></button></header><div id="global-controls"></div></section></div>`);
localizeApplicationMarkup(document.head);localizeApplicationMarkup(document.body);
let state=project();state.root.children=[];
let quickColorExpanded=false;
let selected=state.root.id,time=0,formulaSeconds=0,section='shape',solo=false,playing=false,tiled=false,tileGrid=2,busy=false,history=[],future=[],pending=false,globalPanel=null,formTarget='inspector',dragged=null,exportKind='png',componentPreview=null,cancelExport=false,contourThreshold=50,contourSmooth=true;
const shelf=new GraphicShelf();let shelfStorageError=null;
const recentKey='momo-texture-tree:recent:v1';let recent=[];try{recent=JSON.parse(localStorage.getItem(recentKey)||'[]');}catch{}
let selectedIds=new Set([selected]),selectionPrimary=selected,selectionAnchor=selected,canvasEditor=null,batchInspector=null,editPrimary=false,alignmentReference='selection';
function reconcileSelection(){if(selectionPrimary!==selected){selectedIds=new Set(selected===state.root.id?[]:[selected]);selectionPrimary=selected;}selectedIds=new Set([...selectedIds].filter(id=>id!==state.root.id&&find(state.root,id)));}
function setSelection(ids,primary=ids.at(-1)){if(ids.length>1)solo=false;editPrimary=false;selectedIds=new Set(ids);selected=primary??state.root.id;selectionPrimary=selected;revealAncestors(selected);refresh();}
function multiSelect(id,e={}){reconcileSelection();if(e.shiftKey){const order=[...$('node-tree').querySelectorAll('[data-node-id]')].map(x=>x.dataset.nodeId);setSelection([...new Set([...(e.ctrlKey||e.metaKey?selectedIds:[]),...rangeSelection(order,selectionAnchor,id)])],id);}else if(e.ctrlKey||e.metaKey){const ids=new Set(selectedIds);ids.has(id)?ids.delete(id):ids.add(id);setSelection([...ids],ids.has(id)?id:[...ids].at(-1));selectionAnchor=id;}else{selectionAnchor=id;setSelection([id],id);}}
function selectedRoots(){reconcileSelection();return selectionRoots(state.root,selectedIds);}
function remember(id){recent=[id,...recent.filter(x=>x!==id)].slice(0,24);try{localStorage.setItem(recentKey,JSON.stringify(recent));}catch{}}
const previewSessions=new Map();let workSession=null,sessionScroll=null;
function captureSession(){return {state,selected,selection:[...selectedIds],time,section,solo,tiled,tileGrid,history,future,localAnimationPreview,zoom:$('zoom').value,background:$('background').value,scroll:[$('canvas-stage').scrollLeft,$('canvas-stage').scrollTop]};}
function restoreSession(c){({state,selected,time,section,solo,tiled,history,future,localAnimationPreview}=c);selectedIds=new Set((c.selection??[selected]).filter(id=>find(state.root,id)));if(selected!==state.root.id)selectedIds.add(selected);selectionPrimary=selected;tileGrid=c.tileGrid??2;$('tile-grid').value=String(tileGrid);state=shelf.bind(state);canvasEditor?.reset();$('zoom').value=c.zoom;$('background').value=c.background;$('canvas-stage').className=c.background;$('canvas-stage').classList.toggle('material-mode',materialMode());$('canvas-stage').classList.toggle('effect-mode',effectMode());$('tree-time').value=time;$('tile-preview').setAttribute('aria-pressed',String(tiled));sessionScroll=c.scroll;$('play').textContent=uiText(playing?"playback.pause":"playback.play");animationEditMode='normal';animationEditor.setScope(state.root.id);}
function cachePreview(){if(componentPreview)componentPreview.session=captureSession();}
function projectOwner(){return workSession?.state??state;}
function originalPreset(){return componentPreview&&projectOwner().projectResources.find(p=>'preset:'+p.id===componentPreview.id);}
function previewButtons(){const linked=linkedProjectResource(projectOwner().projectResources,current());$('save-project-resource').textContent=(linked ? uiText("editor.saveAsGraphic") : uiText("editor.saveToGraphics"));$('save-project-resource').hidden=!!componentPreview;$('preview-update').textContent=uiText("editor.updateGraphic");$('preview-save').textContent=uiText("editor.saveAsGraphic");$('update-project-resource').hidden=!!componentPreview||!linked;$('preview-update').hidden=!originalPreset();$('preview-undo-update').hidden=!(originalPreset()&&componentPreview.previousUpdate);$('solo').hidden=!!componentPreview;for(const id of ['return-work','preview-add','preview-reset','preview-save'])$(id).hidden=!componentPreview;$('preview-add').textContent=uiText("editor.addToCanvas");$('save-project').disabled=!!componentPreview;$('share-project').disabled=!!componentPreview;}
function browse(p){if(busy)return;cachePreview();if(!componentPreview)workSession=captureSession();let entry=previewSessions.get(p.id);if(!entry){const draft=project();draft.name=p.name;draft.root.name='资源试编辑';draft.root.children=[cloneNode(p.preset.root)];draft.root.children[0].name=graphicLabel(p.preset);draft.root.children[0].resourceRef=p.preset.id;entry={id:p.id,name:p.name,original:structuredClone(draft),session:{...captureSession(),state:draft,selected:draft.root.children[0]?.id??draft.root.id,time:0,solo:false,tiled:false,history:[],future:[],localAnimationPreview:null}};previewSessions.set(p.id,entry);}entry.name=p.name;componentPreview=entry;restoreSession(entry.session);solo=false;remember(p.id);previewButtons();refresh();}
function returnWork(){if(busy)return;if(componentPreview){cachePreview();componentPreview=null;restoreSession(workSession);workSession=null;previewButtons();refresh();}else requestRender();}
function previewComponent(){if(!state.root.children.length)throw messageError("editor.addSomeContentNodesFirst");if(state.root.children.length===1)return cloneNode(state.root.children[0]);const result=cloneNode(state.root);result.name=componentPreview.name;return result;}
$('return-work').onclick=returnWork;$('preview-add').onclick=()=>{if(!componentPreview||busy)return;if(!state.root.children.length){notify(uiText("editor.addSomeContentNodesFirst"));return;}const copy=cloneNode(previewComponent());returnWork();insert(copy);};
$('preview-reset').onclick=()=>{if(!componentPreview)return;edit(()=>{state=structuredClone(componentPreview.original);selected=state.root.children[0].id;});};
$('preview-save').onclick=()=>{if(componentPreview)state.root.children.length?saveComponent(previewComponent(),state.root.children.length>1):notify(uiText("editor.addSomeContentNodesFirst"));};
function storePresetReplacement(existing,root){const owner=projectOwner();root.resourceRef=existing.id;owner.projectResources=owner.projectResources.map(p=>p.id===existing.id?replaceProjectResource(p,root):p);persistSharedResources();localStorage.setItem(storageKey,serializeLocalProject(canvasProject(owner)));libraryThumbs.invalidate('preset:'+existing.id);library();previewButtons();}
$('preview-update').onclick=async()=>{if(busy)return;const existing=originalPreset();if(!existing)return;
 if(!await confirmGraphicAction(uiFormat("editor.updateComponentValueThisReplacesTheOriginalGraphicWithTheEntire",existing.name)))return;
 try{const previous={root:structuredClone(existing.root),forest:existing.forest===true,original:structuredClone(componentPreview.original)};const replacement=cloneNode(previewComponent());replacement.name=existing.name;storePresetReplacement(existing,replacement,state.root.children.length>1);componentPreview.previousUpdate=previous;componentPreview.original=structuredClone(state);previewButtons();notify(uiText("editor.componentUpdatedExistingInstancesAreUnchanged"));}catch(e){notify((uiText("editor.updateFailed") + e.message));}
};
$('preview-undo-update').onclick=()=>{if(busy)return;const existing=originalPreset(),previous=componentPreview?.previousUpdate;if(!existing||!previous)return;try{storePresetReplacement(existing,previous.root,previous.forest);componentPreview.original=previous.original;delete componentPreview.previousUpdate;previewButtons();notify(uiText("editor.graphicUpdateUndoneCurrentPreviewRetained"));}catch(e){notify((uiText("editor.couldNotUndoTheUpdate") + e.message));}};

const collapsedNodes=new Set(),advancedOpen=new Set(),typeMemory=new Map();
function revealAncestors(id){let entry=find(state.root,id);while(entry?.parent){collapsedNodes.delete(entry.parent.id);entry=find(state.root,entry.parent.id);}}
const storageKey='momo-texture-tree:draft:v1';
const notify=text=>{$('tree-toast').textContent=text;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('tree-toast').textContent='',5000);};
try{const saved=localStorage.getItem(storageKey);if(saved){state=sanitizeTree(restoreLocalProject(JSON.parse(saved)));selected=state.root.id;}}catch(error){notify((uiText("editor.invalidDraftWasNotRestored") + error.message));}
try{const saved=localStorage.getItem(GRAPHIC_LIST_KEY);shelf.entries=saved===null?state.projectResources:restoreGraphicList(saved);}catch(e){shelfStorageError=e.message;shelf.entries=state.projectResources;notify((uiText("editor.couldNotRestoreSavedGraphics") + e.message));}state=shelf.bind(state);
try{if(location.hash.startsWith('#tree=')){const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(location.hash.slice(6)),c=>c.charCodeAt(0))));const incoming=sanitizeTree(data);state=shelf.bind(incoming);selected=state.root.id;}}catch(e){notify((uiText("editor.invalidSharedConfiguration") + e.message));}
$('preview-channel').value=state.output.mode;
let materialPreview=null,effectPreview=null;
const materialMode=()=>$('preview-mode').value==='material',effectMode=()=>$('preview-mode').value==='effect',canvasMode=()=>$('preview-mode').value==='canvas';
function previewModeChanged(){
 const material=materialMode(),effect=effectMode();$('tree-preview-surface').hidden=!canvasMode();$('effect-preview').hidden=!effect;$('effect-preview-controls').hidden=!effect;$('material-preview').hidden=!material;$('material-preview-controls').hidden=!material;$('preview-2d-toolbar').hidden=!canvasMode();$('canvas-stage').classList.toggle('material-mode',material);$('canvas-stage').classList.toggle('effect-mode',effect);
 $('preview-hint').textContent=(effect ? uiText("editor.compareAlphaAndAdditiveBlendingForTheSameFramePlayOr") : (material ? uiText("editor.dragToOrbitColorShowsTheSurfacePatternNormalsShowLighting") : uiText("editor.clickToSelectDragToMoveDoubleClickToEnterA")));
 requestRender();
}
$('preview-mode').onchange=previewModeChanged;
$('preview-channel').onchange=()=>{renderPreviewSettings();requestRender();};
let renderer=new TreeRenderer(document.createElement('canvas'));
const display=$('tree-canvas').getContext('2d');
function watchContext(){renderer.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showRenderError(uiText("editor.graphicsContextLostRetryAfterItRecovers"));});renderer.canvas.addEventListener('webglcontextrestored',()=>{$('retry-render').click();});}watchContext();
const current=()=>find(state.root,selected)?.node??state.root;
let resourcePersist=Promise.resolve();
function persistSharedResources(){if(shelfStorageError)throw messageError("errors.couldNotReadSavedGraphicsOriginalStorageRetained", shelfStorageError);localStorage.setItem(GRAPHIC_LIST_KEY,serializeGraphicList(shelf.entries));const dependencies=projectDependencyIds(projectOwner()),snapshot=[...resources].filter(([id])=>dependencies.has(id));resourcePersist=resourcePersist.then(()=>writeResources(snapshot)).catch(e=>notify((uiText("editor.couldNotSaveResource") + e.message)));}
function persist(){if(componentPreview){cachePreview();return;}try{persistSharedResources();localStorage.setItem(storageKey,serializeLocalProject(canvasProject(state)));}catch{notify(uiText("editor.autosaveFailedSaveAProjectFile"));}}
function validatedState(p){const result=sanitizeTree(shelf.bind(p));shelf.entries=result.projectResources;return shelf.bind(result);}
function recordHistory(before){shelf.record(before);history.push(before);}
function edit(fn,{rebuild=true}={}){if(busy)return false;const before=structuredClone(state),previousSelection=selected;try{fn();state=validatedState(state);if(selected!==previousSelection)revealAncestors(selected);recordHistory(before);if(history.length>60)history.shift();future=[];if(!find(state.root,selected))selected=state.root.id;persist();if(rebuild)refresh();else requestRender();return true;}catch(error){shelf.entries=before.projectResources;state=shelf.bind(before);notify(uiError(error));refresh();return false;}}
let previewDragging=false,previewIdleTimer;
document.addEventListener('pointerdown',e=>{if(e.target.closest('input[type=range],canvas,svg'))previewDragging=true;});
const finishPreviewDrag=()=>{if(previewDragging){previewDragging=false;requestRender();}};
document.addEventListener('pointerup',finishPreviewDrag);document.addEventListener('pointercancel',finishPreviewDrag);window.addEventListener('blur',finishPreviewDrag);
let inspectorVariant='',localAnimationPreview=null,animationEditMode='normal',animationGesture=null;
function stopAnimation(){playing=false;$('play').textContent=uiText("playback.play");}
function setAnimationMode(mode){stopAnimation();animationEditMode=mode;$('animation-panel').open=true;refresh();}
function beginAnimationGesture(){stopAnimation();animationGesture??=structuredClone(state);}
function endAnimationGesture(){if(!animationGesture)return;const before=animationGesture;animationGesture=null;try{state=validatedState(state);if(JSON.stringify(state)!==JSON.stringify(before)){recordHistory(before);if(history.length>60)history.shift();future=[];}persist();refresh();}catch(e){state=before;notify(uiError(e));refresh();}}
function cancelAnimationGesture(){if(animationGesture){state=animationGesture;animationGesture=null;refresh();}}
function seekAnimationScope(id,t){stopAnimation();formulaSeconds=t*state.output.seconds;if(id===state.root.id){localAnimationPreview=null;time=t;}else localAnimationPreview={id,time:t};requestRender();}
function assignAnimated(n,path,value){
 if(animationEditMode==='record'&&fieldSpec(n,path)){recordValue(n,path,animationClock(n.id).progress,value);return;}
 if(animationEditMode==='normal'&&n.tracks?.[path]&&!n.tracks[path].muted&&n.animationEnabled!==false)throw messageError("editor.animationControlsThisParameterEnableRecordingOrEditItsBaseValue");
 pathSet(n,path,value);
}
function animationValue(n,path){return animationEditMode==='base'?pathGet(n,path):pathGet(animationClock(n.id).node,path);}
function decorateAnimated(input,n,path){input.dataset.animationPath=path;input.dataset.animationNode=n.id;input.disabled=animationEditMode==='normal'&&!!n.tracks[path]&&!n.tracks[path].muted&&n.animationEnabled!==false;}
function syncParameterStates(){
 if(batchInspector){batchInspector.sync();return;}
 const n=current();if(n===state.root)return;const evaluated=animationEditMode==='base'?n:animationClock(n.id).node,seen=new Set();
 for(const input of document.querySelectorAll('#inspector [data-animation-path],#inspector-color-quick [data-animation-path]')){
  const path=input.dataset.animationPath,info=parameterState(n,evaluated,path,animationEditMode);
  input.disabled=info.locked;input.dataset.originalTitle??=input.title;
  input.title=[input.dataset.originalTitle,info.locked?uiText("editor.thisParameterIsAnimatedRecordAKeyframeOrEditTheBase"):'',info.dependency].filter(Boolean).join('\n');
  if(!input.closest('#inspector'))continue;
  const row=input.closest('.tree-field,.tree-check');if(!row)continue;
  const id='parameter-state-'+n.id+'-'+path.replaceAll('.','-');input.setAttribute('aria-describedby',id);
  if(seen.has(row))continue;seen.add(row);
  row.querySelector('[data-reset-parameter]')?.toggleAttribute('disabled',info.locked);
  let hint=row.querySelector('.parameter-state');if(!hint){hint=el('span',{class:'parameter-state',id});row.append(hint);}
  const signature=JSON.stringify(info);if(hint.dataset.state===signature)continue;hint.dataset.state=signature;hint.hidden=!info.animation&&!info.dependency;hint.replaceChildren();
  if(info.animation){hint.append(el('span',{class:'parameter-state-badge',text:info.animation}));if(info.locked)for(const [mode,text]of [['record',"editor.recordChanges"],['base',"editor.editBaseValue"]])hint.append(el('button',{type:'button',text:uiText(text),onclick:e=>{e.stopPropagation();setAnimationMode(mode);}}));}
  if(info.dependency)hint.append(el('span',{class:'parameter-dependency',text:info.dependency}));
 }
}
function inspectorVariantKey(n){const context=colorContext(state.root,n.id,x=>animationClock(x.id).node);return JSON.stringify([context?.source?.id,context?.override?.id,context&&intrinsicColor(context.local),n.id,n.arrange[0],n.arrange[30],n.arrange[33]>1,n.arrange[39],n.color.mode,n.color.fill,n.shapeClock?.follow,n.type==='Star'?n.params[5]:n.type==='Gear'?n.params[8]:null,n.boundary,n.arrangeExtra.gradient,n.arrangeExtra.flow,n.arrangeExtra.weave]);}
function syncAnimatedFields(){if(batchInspector){batchInspector.sync();return;}const n=current(),value=animationEditMode==='base'?n:animationClock(n.id).node,progress=animationClock(n.id).progress;if(!previewDragging&&inspectorVariant!==inspectorVariantKey(value))inspector();
 syncColorQuick();
 for(const input of document.querySelectorAll('#inspector [data-animation-path],#inspector-color-quick [data-animation-path]')){if(document.activeElement===input)continue;const path=input.dataset.animationPath,v=pathGet(value,path);if(input.type==='checkbox')input.checked=!!v;else input.value=input.hasAttribute('data-packed-color')?'#'+Math.round(v).toString(16).padStart(6,'0'):input.hasAttribute('data-color-hex')?String(v).toUpperCase():String(input.dataset.animationScale?Math.round(v*Number(input.dataset.animationScale)*100)/100:input.dataset.animationFamily?arrangementFamily(v):v);}
 for(const b of $('inspector').querySelectorAll('[data-key-path]')){const path=b.dataset.keyPath,track=n.tracks[path],here=track?.keys.some(k=>sameTime(k[0],progress));b.textContent=here?'◆':track?'◈':'◇';b.classList.toggle('key-at-cursor',!!here);b.title=(here ? uiText("editor.aKeyframeExistsHereClickToUpdateIt") : (track ? uiText("editor.thisParameterIsAnimatedClickToRecordAtTheCurrentTime") : uiText("editor.animateThisParameter")));}
 syncParameterStates();
}
function keyButton(n,path,label){if(!path.startsWith('params.'))label=uiText(label);return el('button',{'data-key-path':path,text:n.tracks[path]?'◈':'◇','aria-label':(label + uiText("editor.keyframe")),onclick:()=>{stopAnimation();edit(()=>{const live=find(state.root,n.id)?.node;if(live)recordValue(live,path,animationClock(n.id).progress,animationValue(live,path));});}});}
function animatedCheck(label,path){label=uiText(label);const n=current(),input=el('input',{type:'checkbox',checked:animationValue(n,path),onchange:()=>edit(()=>{const live=current();if(path==='shapeClock.follow'&&!input.checked&&!live.tracks['shapeClock.value'])assignAnimated(live,'shapeClock.value',formulaTime(animationClock(live.id).node,formulaSeconds));assignAnimated(live,path,input.checked);}),'aria-label':label});decorateAnimated(input,n,path);controls().append(el('label',{class:'tree-check'},[input,document.createTextNode(label),keyButton(n,path,label)]));}
function animatedChoice(label,path,options){const n=current(),input=choice(label,animationValue(n,path),options,v=>edit(()=>assignAnimated(current(),path,v)));decorateAnimated(input,n,path);input.parentElement.append(keyButton(n,path,label));}

function animationPreviewProject(){if(!localAnimationPreview&&animationEditMode!=='base')return state;const p=structuredClone(state);if(localAnimationPreview){const n=find(p.root,localAnimationPreview.id)?.node;if(n){n.timing={...n.timing,frozen:true,at:localAnimationPreview.time,before:'hold',after:'hold',outside:'hold'};if(n.id===p.root.id)n.previewProgress=localAnimationPreview.time;}}if(animationEditMode==='base'){for(const id of selectedIds){const n=find(p.root,id)?.node;if(n)n.animationEnabled=false;}}return p;}
function animationClock(id){const root=animationPreviewProject().root;return nodeClock(root,id,time)??nodeClock(root,root.id,time);}
function animationLabel(path,n=current()){if(!path.startsWith('params.'))return uiText(animationLabelSource(path,n));return animationLabelSource(path,n);}
function animationLabelSource(path,n=current()){if(path.startsWith('params.'))return (()=>{const spec=BY_ID.get(n.type)?.parameters.find(p=>p.slot===+path.split('.')[1]);return spec?parameterLabel(spec):path;})();if(path.startsWith('uv.'))return ["editor.uvScale","editor.uvRotation","editor.uvOffsetX","editor.uvOffsetY","editor.uvScrollSpeed","editor.uvScrollDirection","editor.uvSwirl"][+path.split('.')[1]]??path;if(path.startsWith('post.'))return POST_SPECS[+path.split('.')[1]]?.[0]??path;if(path.startsWith('arrange.'))return arrangementSpec(n.arrange[0],+path.split('.')[1],n.arrange)?.label??path;return ({'shapeClock.follow':"editor.autoplay",'shapeClock.speed':"editor.motionSpeed",'shapeClock.offset':"editor.timeOffsetS",'shapeClock.value':"editor.shapeTime",'contour.mode':"editor.contourMode",'contour.radius':"editor.contourWidth",'transform.x':"editor.positionX",'transform.y':"editor.positionY",'transform.width':"editor.regionWidth",'transform.height':"editor.regionHeight",'transform.rotation':"editor.rotation",'transform.pivotX':"editor.pivotX",'transform.pivotY':"editor.pivotY",opacity:"editor.opacity",enabled:"editor.visible",'color.low':"editor.shadowColor",'color.high':"editor.highlightColor",'color.mode':"editor.colorMode",'color.fill':"editor.colorFill",blend:"editor.blendMode",'transform.fit':"editor.regionFit",'transform.mirrorX':"editor.mirrorHorizontally",boundary:"editor.boundary",polar:"editor.polarCoordinates",invert:"editor.invert",instancePhase:"editor.instancePhase"})[path]??path;}
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
function showRenderError(message){playing=false;$('play').textContent=uiText("playback.play");$('preview-error').hidden=false;$('preview-error').querySelector('span').textContent=(message + uiText("editor.lastSuccessfulPreviewRetained"));$('render-status').textContent=uiText("editor.previewUpdateFailed");}
function render(){try{
 canvasHitCache.clear();
 const source=animationPreviewProject(),preview={...source,output:{...source.output,mode:$('preview-channel').value}};const stage=$('canvas-stage'),zoom=$('zoom').value==='fit'?1:Number($('zoom').value);
 const quick=previewDragging||playing;
 if(materialMode()){
  materialPreview??=createMaterialPreview($('material-preview'),{controls:$('material-preview-controls'),onError:showRenderError,onStatus:text=>$('render-status').textContent=text});
  materialPreview.update(preview,{time,formulaSeconds,solo:solo?selected:null,quick,renderer});
 }else if(effectMode()){
  effectPreview??=createEffectPreview($('effect-preview'),{controls:$('effect-preview-controls')});
  const dims=effectPreview.sampleSize(state.canvas.ratio,quick),transparent={...preview,output:{...preview.output,alpha:true}};
  renderer.draw(transparent,dims.width,dims.height,{time,formulaSeconds,solo:solo?selected:null,quality:quick?1:2});
  effectPreview.update(renderer.canvas);
  $('render-status').textContent=uiFormat("editor.effectPreviewValueValueValueMs",dims.width,dims.height,renderer.lastMs.toFixed(1));
 }else{
 const dims=previewDimensions(state.canvas.ratio,Math.max(64,(stage.clientWidth||512)-56),Math.max(64,(stage.clientHeight||512)-56),zoom,tiled?tileGrid:1,window.devicePixelRatio||1,Math.floor(Math.min(renderer.base.maxSize,quick?1024:2048)/(tiled?tileGrid:1)));
 let reduced=false;
 try{renderer.draw(preview,dims.width,dims.height,{time,formulaSeconds,solo:solo?selected:null,quality:quick?1:2});}catch(error){
  if(!error.message.includes('纹理预算')||Math.max(dims.width,dims.height)<=256)throw error;
  try{renderer.draw(preview,dims.width,dims.height,{time,formulaSeconds,solo:solo?selected:null,quality:1});}catch(fallbackError){if(!fallbackError.message.includes('纹理预算'))throw fallbackError;dims.width=Math.max(1,Math.round(dims.width/2));dims.height=Math.max(1,Math.round(dims.height/2));renderer.draw(preview,dims.width,dims.height,{time,formulaSeconds,solo:solo?selected:null,quality:1});}reduced=true;
 }
 // Leaf passes may resize their hidden canvas; only publish a fully rendered frame.
 const canvas=$('tree-canvas'),copies=tiled?tileGrid:1,width=dims.width*copies,height=dims.height*copies;if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
 display.clearRect(0,0,width,height);for(let y=0;y<copies;y++)for(let x=0;x<copies;x++)display.drawImage(renderer.canvas,x*dims.width,y*dims.height);
 $('render-status').textContent=`${uiText(quick?"editor.interactivePreview":"editor.fullQualityPreview")} ${dims.width}×${dims.height}${reduced?uiText("editor.reducedSamplingForComplexCanvases"):''} · ${renderer.lastMs.toFixed(1)} ms`;
 }
 $('preview-error').hidden=true;
 $('preview-title').textContent=(componentPreview ? (uiText("preview.resourceEditingPrefix") + componentPreview.name) : (localAnimationPreview ? (uiText("editor.animationPreview") + (find(state.root,localAnimationPreview.id)?.node.name??uiText("editor.canvas"))) : (solo ? (uiText("preview.soloPrefix") + current().name) : uiText("editor.compositePreview"))));$('solo').classList.toggle('active',solo);$('solo').setAttribute('aria-pressed',String(solo));$('solo').textContent=(solo ? uiText("editor.returnToComposite") : uiText("editor.soloPreview"));
 updateActualCount();
 const c=nodeClock(preview.root,selected,time);$('local-time').textContent=uiFormat("editor.nodeTimeValueAnimationValueValue",c.local.toFixed(3),c.progress.toFixed(3),(c.visible ? '' : uiText("editor.hidden")));const scopeTime=animationClock(animationEditor.getScope()).progress;$('time-value').textContent=scopeTime.toFixed(3);$('tree-time').value=scopeTime;
 sizePreview();if(sessionScroll){[$('canvas-stage').scrollLeft,$('canvas-stage').scrollTop]=sessionScroll;sessionScroll=null;}drawGuides();syncAnimatedFields();updateAnimationEditor();
 }catch(error){showRenderError(error.message);}}
function refresh(){state=shelf.bind(state);reconcileSelection();if(localAnimationPreview&&!find(state.root,localAnimationPreview.id))localAnimationPreview=null;if(!find(state.root,selected))selected=state.root.id;library();previewButtons(); $('project-name').value=state.name;$('play-duration').value=state.output.seconds;const noNode=selected===state.root.id;if($('group-selected'))$('group-selected').disabled=noNode;for(const id of ['duplicate','delete','save-selected-component'])$(id).disabled=noNode;tree();inspector();if(globalPanel)renderGlobalPanel();renderPreviewSettings();requestRender();$('undo').disabled=!history.length;$('redo').disabled=!future.length;}
function select(id,keepTimeline=false){selectionAnchor=id;setSelection(id===state.root.id?[]:[id],id);}
function tree(){
 const nav=$('component-nav');nav.hidden=!componentPreview;nav.replaceChildren();if(componentPreview)nav.append(el('button',{text:uiText("canvas.backToCanvas"),onclick:returnWork}),el('span',{text:componentPreview.name}));
 const root=$('node-tree');root.onclick=e=>{if(e.target===root)select(state.root.id);};root.setAttribute('aria-multiselectable','true');root.replaceChildren();let count=0;walk(state.root,()=>count++);
 function row(n,depth=0,mask=false){
  const branch=n.children.length>0||!!n.mask,expanded=!collapsedNodes.has(n.id);
  const line=el('div',{class:'tree-node'+(selectedIds.has(n.id)?' selected':'')+(n.id===selected?' primary-selected':''),role:'treeitem','aria-selected':selectedIds.has(n.id),'aria-level':depth+1,style:`padding-left:${depth*14}px`});
  if(branch)line.setAttribute('aria-expanded',String(expanded));
  if(n.id!==state.root.id)line.append(el('span',{class:'node-drag-handle',text:'⠿',draggable:'true','aria-label':(uiText("editor.drag") + n.name),title:uiText("editor.dragToReparentOrReorderCenterToNestEdgesToReorder")}));
  line.append(el('button',{text:n.enabled?'●':'○','aria-label':(uiText("editor.show") + n.name),onclick:()=>edit(()=>{const value=!n.enabled;for(const target of selectedIds.has(n.id)?selectedRoots():[n])target.enabled=value;})}));
  if(branch)line.append(el('button',{class:'tree-disclosure',text:expanded?'▾':'▸','aria-label':((expanded ? uiText("editor.collapse") : uiText("editor.expand")) + n.name),'aria-expanded':expanded,onclick:()=>{if(expanded)collapsedNodes.add(n.id);else collapsedNodes.delete(n.id);tree();}}));
  else line.append(el('span',{class:'tree-disclosure-placeholder','aria-hidden':'true'}));
  line.append(el('button',{text:(mask?'◐ ':({over:n.kind==='group'?'▣ ':'◇ ',add:'＋ ',max:'↑ ',multiply:'× ',subtract:'− ',screen:'◩ ',difference:'≠ ',overlay:'▧ ',softlight:'◒ ',dodge:'☀ ',mask:'◐ ',inverseMask:'◑ '}[n.blend]??'◇ '))+n.name,onclick:e=>multiSelect(n.id,e),'aria-label':(uiText("editor.select") + n.name)}));attachDrag(line,n);root.append(line);
  if(expanded){n.children.forEach(c=>row(c,depth+1));if(n.mask)row(n.mask,depth+1,true);}
 }
 state.root.children.forEach(c=>row(c));if(state.root.mask)row(state.root.mask,0,true);$('node-count').textContent=`${count-1}/255`;
 const path=[];let entry=find(state.root,selected);while(entry){if(entry.node!==state.root)path.unshift(entry.node);entry=entry.parent?find(state.root,entry.parent.id):null;}
 $('breadcrumbs').replaceChildren(...path.map(n=>el('button',{text:n.name,onclick:()=>select(n.id)})));
 canvasEditor?.navigation();
 const drop=el('div',{class:'tree-root-drop',text:uiText("editor.dropHereToMoveToTheTopLevel"),'aria-label':uiText("editor.topLevelDropZone"),onclick:()=>{select(state.root.id);}});root.append(drop);
 drop.ondragover=e=>{if(busy||!find(state.root,dragged)?.parent)return;e.preventDefault();drop.classList.add('active');if(e.dataTransfer)e.dataTransfer.dropEffect='move';};
 drop.ondragleave=()=>drop.classList.remove('active');
 drop.ondrop=e=>{e.preventDefault();drop.classList.remove('active');const id=dragged;dragged=null;if(busy||!find(state.root,id)?.parent)return;edit(()=>{moveSelection(state.root,selectedIds,state.root.id);selected=id;revealAncestors(id);});};

}
function controls(){return typeof formTarget==='string'?$(formTarget):formTarget;}
function heading(text){text=uiText(text);controls().append(el('h3',{text}));}
function updateActualCount(){const count=renderer.lastCounts.get(selected);if($('actual-count')){const n=animationClock(selected).node,scatter=[7,12].includes(n.arrange[0]);$('actual-count').textContent=(count===undefined ? '' : uiFormat("editor.generatedValueInstancesValueValue",count,(scatter ? ((uiText("editor.target") + n.arrange[3]) + uiText("editor.copies")) : ''),(scatter&&n.scatterAvoidOverlap&&count<n.arrange[3] ? uiText("editor.limitedBySpaceOrDensityReduceSizeGapOrIncreaseThe") : '')));}}
function arrangementRecords(a,n,t,original,aspect){return renderer.records(n,t,{original,aspect});}
function check(label,value,onchange){label=uiText(label);const input=el('input',{type:'checkbox',checked:value,onchange:()=>onchange(input.checked),'aria-label':label});controls().append(el('label',{class:'tree-check'},[input,document.createTextNode(label)]));return input;}
function choice(label,value,options,onchange,translateOptions=true){label=uiText(label);options=options.map(([v,t])=>[v,translateOptions?uiOption(t):t]);const input=el('select',{'aria-label':label},options.map(([v,t])=>el('option',{value:v,text:t})));input.value=String(value);input.onchange=()=>onchange(input.value);controls().append(el('label',{class:'tree-field'},[document.createTextNode(label),input]));return input;}
function colorInput(label,value,assign,path=null){
 const n=current();if(path)value=animationValue(n,path);const input=el('input',{type:'color',value,'aria-label':label});if(path)decorateAnimated(input,n,path);let before=null,last=value;
 const update=()=>{if(busy){input.value=last;return;}if(input.value===last)return;before??=structuredClone(state);stopAnimation();try{if(path)assignAnimated(current(),path,input.value);else assign(input.value);last=input.value;requestRender();}catch(e){notify(uiError(e));input.value=last;}};
 const commit=()=>{if(!before)return;const previous=before;before=null;
  try{state=validatedState(state);if(JSON.stringify(state)!==JSON.stringify(previous)){recordHistory(previous);if(history.length>60)history.shift();future=[];}persist();refresh();}
  catch(error){state=previous;notify(uiError(error));refresh();}
 };
 input.oninput=update;input.onchange=()=>{update();commit();};input.onblur=commit;return input;
}
function field(label,path,min,max,step=.01,{target=current(),key=true}={}){
 if(!path.startsWith('params.'))label=uiText(label);
 const targetId=target.id,resolve=()=>targetId?find(state.root,targetId)?.node:state;target=resolve();const parameterMatch=/^params\.(\d+)$/.exec(path),parameterDefinition=parameterMatch&&BY_ID.get(target.type)?.parameters.find(p=>p.slot===+parameterMatch[1]);if(parameterDefinition)label=parameterLabel(parameterDefinition);const animatable=!!targetId&&key&&!!fieldSpec(target,path);
 const assign=value=>{const live=resolve();if(!live)return;if(path==='output.width'||path==='output.height')Object.assign(state.output,outputDimensions(state.canvas.ratio,value,path.split('.')[1]));else if(path==='canvas.ratio'){state.canvas.ratio=value;Object.assign(state.output,outputDimensions(value,state.output.width));}else{
  if(live.transform?.lockAspect&&['transform.width','transform.height'].includes(path)){const other='transform.'+(path.endsWith('width')?'height':'width'),base=animatable?animationValue(live,path):pathGet(live,path),ov=animatable?animationValue(live,other):pathGet(live,other),ratio=base?ov/base:1;value=Math.min(ratio>0?Math.min(1,1/ratio):1,value);assignAnimated(live,other,value*ratio);}
  if(animatable)assignAnimated(live,path,value);else pathSet(live,path,value);
 }};
 const value=animatable?animationValue(target,path):pathGet(target,path),input=el('input',{type:'number',min,max,step,value,'aria-label':label}),slider=el('input',{type:'range',min,max,step,value,'aria-label':(label + uiText("editor.slider"))});
 const line=el('div',{class:'tree-field tree-number-field'},[el('label',{text:label}),slider,input]);const parameter=/^params\.(\d+)$/.exec(path),definition=parameter&&BY_ID.get(target.type)?.parameters.find(p=>p.slot===+parameter[1]);if(definition){line.title=definition.variable??definition.key;line.dataset.parameterVariable=definition.variable??definition.key;}if(animatable){decorateAnimated(input,target,path);decorateAnimated(slider,target,path);}
 let before=null;
 slider.oninput=()=>{if(busy)return;stopAnimation();before??=structuredClone(state);try{assign(Number(slider.value));input.value=slider.value;requestRender();}catch(e){notify(uiError(e));}};
 const commit=()=>{if(!before)return;const previous=before;before=null;const keepFocus=document.activeElement===slider;try{state=validatedState(state);if(JSON.stringify(state)!==JSON.stringify(previous)){recordHistory(previous);if(history.length>60)history.shift();future=[];}persist();refresh();if(keepFocus)[...document.querySelectorAll('input[type=range]')].find(e=>e.getAttribute('aria-label')===label+uiText("editor.slider"))?.focus();}catch(e){state=previous;notify(uiError(e));refresh();}};
 slider.onchange=commit;slider.onblur=commit;input.onchange=()=>{stopAnimation();edit(()=>assign(Math.max(min,Math.min(max,Number(input.value)))));};
 if(targetId)line.append(el('button',{'data-reset-parameter':path,text:'↺',title:uiText("editor.restoreDefaultRecordsAKeyframeWhileRecording"),'aria-label':(uiText("editor.reset") + label),onclick:()=>edit(()=>assign(pathGet(node(target.kind,target.type),path)))}));
 if(animatable){if(target.tracks[path]){line.classList.add('animated-field');}line.append(keyButton(target,path,label));}controls().append(line);
}
function enumField(label,path,options){const paramMatch=/^params\.(\d+)$/.exec(path),paramDefinition=paramMatch&&BY_ID.get(current().type)?.parameters.find(p=>p.slot===+paramMatch[1]);if(paramDefinition){label=parameterLabel(paramDefinition);options=paramDefinition.options?paramDefinition.options.map(o=>[o.value,parameterLabel(o)]):options.map(([v,t])=>[v,uiOption(t)]);}if(!path.startsWith('params.')){label=uiText(label);options=options.map(([v,t])=>[v,uiOption(t)]);}const n=current(),spec=fieldSpec(n,path);field(label,path,spec?.[0]??0,spec?.[1]??1,1);const row=controls().lastElementChild;row.querySelector('input[type=range]').remove();row.querySelector('input[type=number]').remove();const select=el('select',{'aria-label':label},options.map(([v,t])=>el('option',{value:v,text:t})));select.value=String(animationValue(n,path));decorateAnimated(select,n,path);select.onchange=()=>edit(()=>assignAnimated(current(),path,+select.value));row.insertBefore(select,row.children[1]);}
function extraField(key){const [label,min,max,step]=EXTRA_SPECS[key];field(label,'arrangeExtra.'+key,min,max,step);}
function extraLayoutControls(n,m){
 if([13,14].includes(m)){
  enumField(uiText("editor.pathSampling"),'arrange.30',[[0,"editor.evenlyByCount"],[1,"editor.bySpacing"]]);if(n.arrange[30])field(uiText("editor.pathSpacing"),'arrange.31',.005,1,.005);else field(uiText("editor.instanceCount"),'arrange.3',1,LAYOUT_LIMITS.instances,1);
  field(uiText("editor.instanceSize"),'arrange.4',.01,1,.005);enumField(uiText("editor.instanceOrientation"),'arrange.19',[[0,"editor.keepOrientation"],[1,"editor.alongContourTangentYAxis"],[2,"editor.normalToContourYAxis"]]);extraField('offset');
  if(m===13)for(const key of ['width','height','corner'])extraField(key);
  else{extraField('threshold');extraField('contourOffset');animatedCheck(uiText("editor.showContourSource"),'arrangeExtra.showSource');note(uiText("editor.theGroupSFirstChildSuppliesTheContourTheOthersAre"));}
   if(n.kind==='group'){choice(uiText("editor.instanceContent"),n.instanceContent,[['all',"editor.entireDecorationGroup"],['random-child',"editor.oneRandomDecoration"],['cycle-child',"editor.cycleDecorationsInOrder"]],v=>edit(()=>n.instanceContent=v));if(n.instanceContent==='random-child')field(uiText("editor.layoutSeed"),'arrange.11',1,LAYOUT_LIMITS.seed,1);}
  field(uiText("editor.layoutRotation"),'arrange.6',-360,360,1);field(uiText("editor.layoutCenterX"),'arrange.13',-1.5,1.5,.01);field(uiText("editor.layoutCenterY"),'arrange.14',-1.5,1.5,.01);
 }else if(m===15){
   animatedChoice(uiText("editor.layoutStyle"),'arrangeExtra.weave',[['herringbone',"editor.herringbone"],['basket',"editor.basketWeave"]]);field(uiText("editor.repeatBlockColumns"),'arrange.1',1,LAYOUT_LIMITS.weaveBlocks,1);field(uiText("editor.repeatBlockRows"),'arrange.2',1,LAYOUT_LIMITS.weaveBlocks,1);field(uiText("editor.layoutRotation"),'arrange.6',-360,360,1);note(uiText("editor.eachBlockContainsAGridOfBricksUpToInstancesContent"));
   if(n.kind==='group'){choice(uiText("editor.instanceContent"),n.instanceContent,[['all',"editor.entireGroup"],['random-child',"editor.oneRandomChild"],['cycle-child',"editor.cycleChildrenInOrder"]],v=>edit(()=>n.instanceContent=v));if(n.instanceContent==='random-child')field(uiText("editor.layoutSeed"),'arrange.11',1,LAYOUT_LIMITS.seed,1);}
 }else{
  field(uiText("editor.gridColumns"),'arrange.1',1,LAYOUT_LIMITS.grid,1);field(uiText("editor.gridRows"),'arrange.2',1,LAYOUT_LIMITS.grid,1);field(uiText("editor.tileSeed"),'arrange.11',1,LAYOUT_LIMITS.seed,1);
  note(uiText("editor.directChildrenAreCandidateTilesSpecifyWhichEdgesConnectNeighboringTiles"));
  if(n.kind==='group')advanced(uiText("editor.tileConnectors"),()=>{for(const child of n.children){const options=Array.from({length:16},(_,mask)=>[mask,mask?[[1,"editor.right"],[2,"editor.top"],[4,"editor.left"],[8,"editor.bottom"]].filter(([bit])=>mask&bit).map(([,name])=>uiText(name)).join(' + '):'无接口 / 空白']);choice((child.name + uiText("editor.connector")),child.tileEdges,options,v=>edit(()=>child.tileEdges=+v));}});
 }
}
function layoutModifiers(n,m){
 if(m===16)return;
 advanced(uiText("editor.layoutVariationGradientFlow"),()=>{
  if([7,12].includes(m)&&n.scatterAvoidOverlap){note(uiText("editor.gradientsAndFlowAreTemporarilyDisabledWhileOverlapAvoidanceIsEnabled"));return;}
  animatedChoice(uiText("editor.gradientDistribution"),'arrangeExtra.gradient',[['none',"common.close"],['x',"editor.leftToRight"],['y',"editor.bottomToTop"],['radial',"editor.centerOutward"],['index',"editor.byInstanceIndex"]]);
  if(n.arrangeExtra.gradient!=='none'){animatedCheck(uiText("editor.reverseGradient"),'arrangeExtra.reverse');for(const key of ['scaleFrom','scaleTo','opacityFrom','opacityTo','rotationFrom','rotationTo'])extraField(key);}
  animatedChoice(uiText("editor.flowField"),'arrangeExtra.flow',[['none',"common.close"],['wave',"editor.waveOffset"],['vortex',"editor.vortexTwist"]]);
  if(n.arrangeExtra.flow!=='none'){extraField('flowAmount');if(n.arrangeExtra.flow==='wave')extraField('flowFrequency');extraField('flowPhase');animatedCheck(uiText("editor.orientAlongFlow"),'arrangeExtra.flowTurn');}
  note(uiText("editor.affectsEachInstancePhaseCanBeAnimatedPositionGradientsMayProduce"));
 });
}

function advanced(label,build){label=uiText(label);const parent=formTarget,details=el('details',{class:'arrangement-advanced'},[el('summary',{text:label})]);details.open=advancedOpen.has(label);const remember=()=>{if(details.open)advancedOpen.add(label);else advancedOpen.delete(label);};details.ontoggle=()=>{if(details.isConnected)remember();};details.firstElementChild.onclick=event=>{event.preventDefault();details.open=!details.open;remember();};controls().append(details);formTarget=details;try{build();}finally{formTarget=parent;}}
function curveControl(n,field,start){let before;const id=n.id;controls().append(createCurveEditor(()=>find(state.root,id).node[field].slice(start,start+8),{canEdit:()=>!busy,begin:()=>{before=structuredClone(state);},point:(i,x,y)=>{const target=find(state.root,id).node;try{assignAnimated(target,field+'.'+(start+i*2),x);assignAnimated(target,field+'.'+(start+i*2+1),y);requestRender();}catch(e){notify(uiError(e));}},end:()=>{if(before){recordHistory(before);future=[];before=null;persist();refresh();}}}));}
function note(text){text=uiText(text);controls().append(el('p',{class:'tree-note',text}));}
function progressCurve(n){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 220 140');svg.classList.add('animation-curve');svg.setAttribute('aria-label',uiText("editor.timeRemappingCurve"));controls().append(svg);
 const add=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);return e;},points=n.timing.curve.length?n.timing.curve:[[0,0],[1,1]];
 const path=add('polyline',{fill:'none',stroke:'#d7b272','stroke-width':2});const plot=()=>path.setAttribute('points',points.map(p=>`${10+p[0]*200},${130-p[1]*120}`).join(' '));plot();
 points.forEach((p,i)=>{const h=add('circle',{cx:10+p[0]*200,cy:130-p[1]*120,r:5,fill:'#8ddcf0'});h.onpointerdown=e=>{beginAnimationGesture();n.timing.curve=points;h.setPointerCapture?.(e.pointerId);h.onpointermove=e=>{const r=svg.getBoundingClientRect(),x=((e.clientX-r.left)*220/r.width-10)/200,y=(130-(e.clientY-r.top)*140/r.height)/120;p[0]=Math.max(i?points[i-1][0]+.001:0,Math.min(i<points.length-1?points[i+1][0]-.001:1,x));p[1]=Math.max(0,Math.min(1,y));h.setAttribute('cx',10+p[0]*200);h.setAttribute('cy',130-p[1]*120);plot();requestRender();};h.onpointerup=()=>{h.onpointermove=null;endAnimationGesture();};h.onpointercancel=cancelAnimationGesture;};});
}
function applySelectionChanges(changes){
 validateSelectionValues(changes);
 for(const {id,values}of changes){const n=find(state.root,id)?.node;if(!n)throw messageError("editor.theSelectedNodeNoLongerExists");if(n.kind!=='group'&&([14,16].includes(values['arrange.0'])||['preserve','remap'].includes(values['color.mode'])))throw messageError("editor.selectOnlyGroupsForThisSetting");for(const path of Object.keys(values))if(animationEditMode==='normal'&&n.animationEnabled!==false&&n.tracks[path]&&!n.tracks[path].muted)throw messageError("editor.someParametersAreAnimatedEnableRecordingOrEditBaseValues");const trial=structuredClone(n);for(const [path,value]of Object.entries(values))assignAnimated(trial,path,structuredClone(value));}
 for(const {id,values,clearStops}of changes){const n=find(state.root,id).node;for(const [path,value]of Object.entries(values))assignAnimated(n,path,structuredClone(value));if(clearStops)delete n.color.stops;}
}
function changeSelection(changes){
 if(busy)return false;stopAnimation();
 if(animationGesture){try{applySelectionChanges(changes);requestRender();return true;}catch(e){notify(uiError(e));return false;}}
 return edit(()=>applySelectionChanges(changes));
}
function selectionLayoutItems(){const preview=animationPreviewProject();return selectedRoots().map(n=>{const regions=selectionRegions(preview,n.id,time,{records:arrangementRecords}).regions;return {id:n.id,region:regions.length===1?regions[0]:null};});}
function selectionLayoutReason(){const items=selectionLayoutItems();return items.length<2?"editor.selectAtLeastTwoTopLevelSelectionNodes":items.some(x=>!x.region)?"editor.selectedNodesAreHiddenOrRepeatedSelectVisibleIndependentNodesOr":'';}
function renderSelectionInspector(){
 let targets=selectedRoots(),values=new Map();const editMain=()=>{editPrimary=true;inspector();};
 const prepare=()=>{targets=selectedRoots();values=new Map();if(animationEditMode==='base'){for(const n of targets)values.set(n.id,n);return;}const ids=new Set(targets.map(n=>n.id));const visit=(n,t)=>{const e=evaluateNode(n,t);if(ids.has(n.id))values.set(n.id,e.node);for(const child of n.children)visit(child,e.progress);if(n.mask)visit(n.mask,e.progress);};visit(animationPreviewProject().root,time);};
 $('inspector-color-quick').hidden=true;$('inspector-color-quick').replaceChildren();$('selected-heading').textContent=((uiText("editor.batchEdit") + selectedIds.size) + uiText("editor.nodes"));$('selected-path').textContent=uiText("editor.onlyChangedParametersAreAppliedWhenParentAndChildAreSelected");$('inspector-tabs').replaceChildren(...SELECTION_TABS.map(([id,label])=>el('button',{text:uiText(label),class:section===id?'active':'',onclick:()=>{section=id;inspector();}})),el('button',{text:uiText("editor.editPrimarySelection"),title:current().name,onclick:editMain}));$('inspector').replaceChildren();
 batchInspector=createSelectionInspector($('inspector'),{
  nodes:()=>targets,selectedCount:()=>selectedIds.size,prepare,value:(n,path)=>pathGet(values.get(n.id)??n,path),locked:paths=>animationEditMode==='normal'&&targets.some(n=>paths.some(path=>n.animationEnabled!==false&&n.tracks[path]&&!n.tracks[path].muted)),editMode:()=>animationEditMode,mode:setAnimationMode,notify,
  evaluated:n=>values.get(n.id)??n,isImage,section:()=>section,editPrimary:editMain,rebuild:inspector,disclosures:advancedOpen,
  dependencies:paths=>[...new Set(targets.flatMap(n=>paths.map(path=>parameterState(n,values.get(n.id)??n,path,animationEditMode).dependency)).filter(Boolean))].join(' '),
  reference:()=>alignmentReference,setReference:value=>alignmentReference=value,
  begin:beginAnimationGesture,end:endAnimationGesture,cancel:cancelAnimationGesture,
  apply:(path,value)=>changeSelection(selectedRoots().map(n=>({id:n.id,values:batchValues(n,path,value,animationValue)}))),
  reset:path=>changeSelection(selectedRoots().map(n=>({id:n.id,values:batchValues(n,path,pathGet(node(n.kind,n.type),path),animationValue)}))),formulaTime:n=>formulaTime(values.get(n.id)??n,formulaSeconds),
  mutate:plan=>{try{return changeSelection(selectedRoots().map(n=>({id:n.id,...plan(n)})));}catch(e){notify(uiError(e));return false;}},
  layoutReason:selectionLayoutReason,layout:(operation,reference)=>{try{changeSelection(layoutSelection(selectionLayoutItems(),operation,reference));}catch(e){notify(uiError(e));}}
 });
}
function inspector(){batchInspector=null;if(selectedIds.size>1&&!editPrimary){inspectorVariant=inspectorVariantKey(animationClock(current().id).node);renderSelectionInspector();}else{buildInspector();if(selectedIds.size>1)$('inspector-tabs').prepend(el('button',{text:uiText("editor.returnToBatchEditing"),onclick:()=>{editPrimary=false;inspector();}}));}syncParameterStates();}
function buildInspector(){const n=current();inspectorVariant=inspectorVariantKey(animationClock(n.id).node);if(n===state.root){$('inspector-color-quick').hidden=true;$('inspector-color-quick').replaceChildren();$('selected-heading').textContent=uiText("editor.noSelection");$('selected-path').textContent='';$('inspector-tabs').replaceChildren();$('inspector').replaceChildren();note(uiText("editor.selectANodeToEditItsParametersOrAddATop"));return;}$('selected-heading').textContent=((n.kind==='group' ? uiText("inspector.groupPrefix") : uiText("inspector.shapePrefix")) + n.name);$('inspector-tabs').replaceChildren(...[['shape',"inspector.shape"],['color',"inspector.color"],['layout',"inspector.transformLayout"],['animation',"inspector.animation"],['composite',"inspector.composite"]].map(([id,label])=>el('button',{text:uiText(label),class:section===id?'active':'',onclick:()=>{section=id;if(id==='animation')$('animation-panel').open=true;inspector();}})));$('inspector').replaceChildren();$('selected-path').textContent=((selectedIds.size>1 ? ((uiText("editor.selected") + selectedIds.size) + uiText("editor.nodesTheInspectorEditsThePrimaryNodeWhileCanvasMovesAnd")) : '') + [...$('breadcrumbs').querySelectorAll('button')].map(b=>b.textContent).join(' / '));
 renderColorQuick(n);
 const modebar=el('div',{class:'animation-tools inspector-animation-mode'});for(const [v,title]of [['record',"editor.record"],['base',"editor.baseValues"]])modebar.append(el('button',{text:uiText(title),class:animationEditMode===v?(v==='record'?'active recording':'active'):'','aria-label':(uiText("editor.parameterMode") + uiText(title)),'aria-pressed':String(animationEditMode===v),title:(v==='record' ? (animationEditMode==='record' ? uiText("editor.stopRecordingAndReturnToNormalEditing") : uiText("editor.recordParameterChangesAsKeyframes")) : (animationEditMode==='base' ? uiText("editor.exitBaseValueEditing") : uiText("editor.editBaseValuesRecordingOff"))),onclick:()=>setAnimationMode(animationEditMode===v?'normal':v)}));controls().append(modebar);if(animationEditMode==='base')note(uiText("editor.editingBaseValuesNodeAnimationIsTemporarilyBypassedAnimationResumesOn"));
 if(componentPreview)note(uiText("editor.previewEditsStayInThisSessionUntilYouAddThemTo"));
 if(section==='shape'){
  const name=el('input',{value:n.name,'aria-label':uiText("editor.nodeName")});name.onchange=()=>edit(()=>n.name=name.value);controls().append(el('label',{class:'tree-field'},[document.createTextNode(uiText("editor.name")),name]));animatedCheck(uiText("editor.visible"),'enabled');
  if(n.kind==='group'){note(uiFormat("editor.thisGroupContainsValueChildrenSelectAnyNodeInTheTree",n.children.length));return;}
  choice(uiText("editor.baseShape"),n.type,CATALOG.filter(p=>projectShapeIds().has(p.id)||p.id===n.type).map(p=>[p.id,p.id.startsWith('asset_')?p.zh+' · '+uiText("editor.custom"):graphicLabel(p)+' · '+p.id]),v=>edit(()=>{typeMemory.set(n.id+':'+n.type,{params:[...n.params],tracks:structuredClone(Object.fromEntries(Object.entries(n.tracks).filter(([k])=>k.startsWith('params.'))))});n.type=v;const cached=typeMemory.get(n.id+':'+v);n.params=cached?[...cached.params]:shapeDefaults(v);for(const key of Object.keys(n.tracks))if(key.startsWith('params.'))delete n.tracks[key];if(cached)Object.assign(n.tracks,structuredClone(cached.tracks));remember('shape:'+v);}));
  note(uiText("editor.shapeSizeIsEvaluatedInsideTheNodeRegionFeatherAddsSoft"));
  if(n.type==='PuzzlePiece')note(uiText("editor.theBodyFillsTheBlueBoundsTabsMayExtendOutsidePair"));
  controls().append(el('button',{text:uiText("editor.resetShapeParameters"),onclick:()=>edit(()=>shapeDefaults(n.type).forEach((v,i)=>assignAnimated(n,'params.'+i,v)))}));
  controls().append(el('button',{text:uiText("editor.randomize"),onclick:()=>edit(()=>{for(const p of BY_ID.get(n.type).parameters){if(parameterRole(p)==='feather')continue;assignAnimated(n,'params.'+p.slot,Math.round((p.min+Math.random()*(p.max-p.min))/p.step)*p.step);}})}));
  const editor=BY_ID.get(n.type).definition.editor.kind;
  if(n.type==='PuzzlePiece'){enumField(uiText("editor.connectorStyle"),'params.9',BY_ID.get(n.type).parameters.find(p=>p.slot===9).options.map(o=>[o.value,parameterLabel(o)]));field(uiText("editor.connectorRoundness"),'params.10',0,1,.01);
   advanced(uiText("editor.bodyCornersSquare"),()=>{note(uiText("editor.setEachCornerIndependentlyIsSquareLargerValuesIncreaseRoundingRounded"));for(const p of BY_ID.get(n.type).parameters.filter(p=>p.slot>=11))field(parameterLabel(p),'params.'+p.slot,p.min,p.max,p.step);});
  }
  if(editor==='gear'){enumField(uiText("editor.toothProfileMode"),'params.8',[[0,"editor.straightTeeth"],[1,"editor.roundedTeeth"]]);}if(editor==='gear'&&n.params[8]<.5)enumField(uiText("editor.toothProfile"),'params.6',[[1,"editor.squareTeeth"],[0,"editor.triangleTeeth"],[.4,"editor.trapezoidTeeth"],[n.params[6],"editor.currentToothTip"]]);
  if(editor==='star')enumField(uiText("editor.starProfile"),'params.5',[[0,"editor.straightStar"],[1,"editor.roundedStar"],[2,"editor.legacyLobes"]]);
  if(editor==='bezier')enumField(uiText("editor.capShape"),'params.12',[[0,"editor.roundCaps"],[1,"editor.flatCaps"]]);
  if(n.type==='BezierRibbon')curveControl(n,'params',0);
  const modeOptions={Halftone:[4,"editor.grayscaleSource",[[0,"editor.radial"],[1,"editor.linear"],[2,"editor.noise"]]],RingPulse:[4,"editor.falloffMode",[[0,"editor.smooth"],[1,"editor.exponential"]]],ConeGradient:[4,"editor.gradientDirection",[[0,"editor.forward"],[1,"editor.reverse"]]],LineSegment:[5,"editor.caps",[[0,"editor.flatCaps"],[1,"editor.roundCaps"]]]}[n.type];if(modeOptions)enumField(modeOptions[1],'params.'+modeOptions[0],modeOptions[2]);
  if(isImage(n.type)){choice(uiText("editor.imageAspect"),n.imageFit??'contain',[['contain',"editor.preserveImageAspect"],['stretch',"editor.stretchToRegion"]],v=>edit(()=>n.imageFit=v));note(uiText("editor.aspectFittingHappensInsideTheNodeRegionWithoutShrinkingTheEntire"));enumField(uiText("validation.imageMode"),'params.0',[[0,"editor.colorAndAlpha"],[1,"editor.luminanceMask"],[2,"editor.alphaMask"]]);note(uiText("editor.colorModePreservesImageColorsMasksCanUseNodeColorsThe"));}
  for(const p of BY_ID.get(n.type).parameters.filter(p=>!(n.type==='PuzzlePiece'&&p.slot>=9)&&!(isImage(n.type)&&p.slot===0)&&!(modeOptions&&p.slot===modeOptions[0])&&!(editor==='gear'&&(p.slot===8||n.params[8]>=.5&&[5,6].includes(p.slot)||n.params[8]<.5&&p.slot===9))&&!(editor==='star'&&(p.slot===5||p.slot===1&&n.params[5]!==1))&&!(editor==='bezier'&&p.slot===12))){if(p.type==='select')enumField(parameterLabel(p),'params.'+p.slot,p.options.map(o=>[o.value,parameterLabel(o)]));else if(p.type==='color'){const input=el('input',{type:'color',value:'#'+Math.round(animationValue(n,'params.'+p.slot)).toString(16).padStart(6,'0'),'aria-label':parameterLabel(p),oninput:e=>edit(()=>assignAnimated(n,'params.'+p.slot,parseInt(e.target.value.slice(1),16)))});input.dataset.packedColor='true';decorateAnimated(input,n,'params.'+p.slot);controls().append(el('label',{class:'tree-field'},[document.createTextNode(parameterLabel(p)),input]));}else field(parameterLabel(p),'params.'+p.slot,parameterRole(p)==='feather'?0:p.min,p.max,p.step);}
  if(BY_ID.get(n.type)?.usesTime){heading(uiText("editor.shapeAnimation"));animatedCheck(uiText("editor.autoplay"),'shapeClock.follow');if(animationValue(n,'shapeClock.follow')){field(uiText("editor.motionSpeed"),'shapeClock.speed',-10,10,.01);field(uiText("editor.timeOffsetS"),'shapeClock.offset',-600,600,.01);}else field(uiText("editor.shapeTimeS"),'shapeClock.value',-36000,36000,.01);note(uiText("editor.automaticMotionUsesElapsedSecondsSpeedOffsetAndContinuesAcrossTimeline"));}
  heading(uiText("editor.shapeUV"));controls().append(el('button',{text:uiText("editor.resetUV"),onclick:()=>edit(()=>[1,0,0,0,0,0,0].forEach((v,i)=>assignAnimated(n,'uv.'+i,v)))}));for(const [i,label,min,max,step]of [[0,"editor.uvScale",.1,8,.01],[1,"editor.uvRotation",-360,360,1],[2,"editor.uvOffsetX",-2,2,.01],[3,"editor.uvOffsetY",-2,2,.01],[4,"editor.uvScrollSpeed",-2,2,.01],[5,"editor.uvScrollDirection",-360,360,1],[6,"editor.uvSwirl",-6.28,6.28,.01]])field(uiText(label),'uv.'+i,min,max,step);animatedCheck(uiText("editor.polarSampling"),'polar');
 }
 if(section==='layout'){
  if(n.id===state.root.id){heading(uiText("editor.fixedCanvas"));note(uiText("editor.theCanvasAlwaysOccupiesTheCompleteAreaGoldBoundsMarkThe"));}else{
  heading(uiText("editor.nodeRegion"));note(uiText("editor.widthAndHeightAreRelativeToTheParentPositionAndPivot"));check(uiText("editor.lockRegionAspectRatio"),n.transform.lockAspect,v=>edit(()=>n.transform.lockAspect=v));for(const [key,label,min,max,step]of [['x',"editor.positionX",-2,2,.01],['y',"editor.positionY",-2,2,.01],['width',"editor.regionWidth",0,1,.01],['height',"editor.regionHeight",0,1,.01],['rotation',"editor.rotationDegrees",-3600,3600,1],['pivotX',"editor.pivotX",0,1,.01],['pivotY',"editor.pivotY",0,1,.01]])field(uiText(label),'transform.'+key,min,max,step);
  animatedCheck(uiText("editor.mirrorHorizontally"),'transform.mirrorX');
  animatedChoice(uiText("editor.regionFit"),'transform.fit',[['stretch',"editor.stretchToRegion"],['contain',"editor.lockAspectRatio"]]);
  animatedChoice(uiText("editor.boundary"),'boundary',[['clip',"editor.clipToNodeRegion"],['visible',"editor.allowContentOutsideRegion"],['repeat',"editor.seamlessRepeat"]]);note(uiText("editor.clipRemovesOverflowVisibleOverflowDrawsOutsideSeamlessRepeatWrapsOverflow"));}
  if(animationValue(n,'boundary')==='repeat'&&n.kind==='shape'&&!animationValue(n,'arrange.0')){choice(uiText("editor.shapeSeamHandling"),n.seamMode,[[0,"editor.automaticPeriodicShapeRepeat"],[1,"editor.genericBlendEdges"]],v=>edit(()=>n.seamMode=+v));note(seamlessDescription(n,n.seamMode));if(seamlessKind(n.type,n.seamMode)===0)field(uiText("editor.blendWidth"),'seamBlend',.05,.45,.01,{key:false});}else if(animationValue(n,'boundary')==='repeat')note(uiText("editor.blueBoundsDefineOnePeriodOverflowAndGlowWrapToThe"));
  heading(uiText("editor.contentArrangement"));note(uiText("editor.arrangementRepeatsTheEntireNodeContentGridsAllocateCellsFirstThen"));const layoutSelect=choice(uiText("editor.arrangement"),arrangementFamily(animationValue(n,'arrange.0')),[...ARRANGEMENT_FAMILIES,...EXTRA_LAYOUTS],v=>edit(()=>{if([14,16].includes(+v)&&n.kind!=='group')throw messageError("editor.createAGroupBeforeSelectingContourOrRuleTiling");assignAnimated(n,'arrange.0',+v);if(+v===8)assignAnimated(n,'arrange.33',1);if([13,14].includes(+v)){n.arrange[3]=48;n.arrange[4]=.04;n.arrange[19]=1;}if(+v===14){if(!n.children.length)n.children.push(node('shape','Star'));if(n.children.length===1){const marker=node('shape','Circle');marker.name='轮廓装饰';n.children.push(marker);}}if(+v===15)n.arrange[1]=n.arrange[2]=2;}));decorateAnimated(layoutSelect,n,'arrange.0');layoutSelect.dataset.animationFamily='true';layoutSelect.parentElement.append(keyButton(n,'arrange.0',uiText("editor.arrangement")));if(n.kind!=='group'){for(const option of layoutSelect.options)if([14,16].includes(+option.value)){option.disabled=true;option.textContent+=uiText("editor.requiresGroup");}note(uiText("editor.contourPlacementAndRuleTilingRequireAGroupCreateOneAnd"));}const m=animationValue(n,'arrange.0');
  if(m===8)enumField(uiText("editor.countDistribution"),'arrange.58',[[1,"editor.uniformSpacing"],[0,"editor.equalCountPerRing"]]);
  if([1,4,11].includes(m))enumField(uiText("editor.gridType"),'arrange.0',[[1,"editor.rectangular"],[4,"editor.diagonal"],[11,"editor.hexagonal"]]);
  if([5,9].includes(m))enumField(uiText("editor.spiralType"),'arrange.0',[[5,"editor.goldenAngle"],[9,"editor.regular"]]);
  if([7,12].includes(m))enumField(uiText("editor.densityDistribution"),'arrange.0',[[7,"editor.entireRegion"],[12,"editor.densityPattern"]]);
  if(m===6)curveControl(n,'arrange',20);
  if(m){
   if(m>=13)extraLayoutControls(n,m);else{
   choice(uiText("editor.instanceAspect"),n.arrangeFit,[['contain',"editor.preserveDesignAspect"],['stretch',"editor.stretchToRegion"]],v=>edit(()=>n.arrangeFit=v));note(uiText("editor.theLayoutFollowsTheCanvasEachInstanceFitsItsRegionS"));
   if([7,12].includes(m)){check(uiText("editor.avoidOverlap"),n.scatterAvoidOverlap,v=>edit(()=>n.scatterAvoidOverlap=v));if(n.scatterAvoidOverlap){const gap=el('input',{type:'number',min:0,max:.5,step:.005,value:n.scatterGap,'aria-label':uiText("editor.extraGap"),onchange:()=>edit(()=>n.scatterGap=+gap.value)});controls().append(el('label',{class:'tree-field'},[document.createTextNode(uiText("editor.extraGap")),gap]));note(uiText("editor.avoidsOverlapUsingEachSelectedShapeSVisibleBoundsAndActual"));}}
   if(n.kind==='group'){choice(uiText("editor.instanceContent"),n.instanceContent,[['all',"editor.entireGroup"],['random-child',"editor.oneRandomChild"],['cycle-child',"editor.cycleChildrenInOrder"]],v=>edit(()=>n.instanceContent=v));if(n.instanceContent==='random-child'){note(uiText("editor.eachPositionSelectsAnEnabledDirectChildWithEqualProbabilityAllowing"));field(uiText("editor.layoutSeed"),'arrange.11',1,LAYOUT_LIMITS.seed,1);}else if(n.instanceContent==='cycle-child')note(uiText("editor.cyclesEnabledDirectChildrenInPlacementOrderDisabledChildrenAreSkipped"));}
   controls().append(el('div',{class:'tree-actions'},[el('button',{text:uiText("editor.center"),onclick:()=>edit(()=>{assignAnimated(n,'arrange.13',0);assignAnimated(n,'arrange.14',0);})}),el('button',{text:([1,4].includes(m) ? uiText("editor.fillGrid") : ([3,7,12].includes(m) ? uiText("editor.fillRegion") : uiText("editor.fitDistribution"))),title:([3,7,12].includes(m) ? uiText("editor.setsLayoutRadiusToAndCentersOffsetsKeepingSizeCountAnd") : uiText("editor.fitLayoutToRegion")),onclick:()=>edit(()=>{const next=arrangeShortcut(animationClock(n.id).node.arrange,'fill');for(let i=0;i<next.length;i++)if(next[i]!==animationValue(n,'arrange.'+i))assignAnimated(n,'arrange.'+i,next[i]);})})]));
   const slots=[...([1,4,11].includes(m)?[1,2]:m===6&&n.arrange[30]?[]:[3]),...([1,4].includes(m)?[6]:[4,5,6]),...({5:[16,17,18,19],6:[30,...(n.arrange[30]?[31]:[]),20,21,22,23,24,25,26,27,28,29,18,19],7:[32,18,19],8:[33,34,36,15,...(n.arrange[33]>1?[18]:[]),19],9:[35,36,18,19],10:[34,37],11:[38],12:[32,40,41,18,19]}[m]??[])];
   for(const slot of slots){const spec=arrangementSpec(m,slot,n.arrange),options=slot===19?[[0,"editor.keepOrientation"],[1,[6,9].includes(m)?'沿路径切线':'朝向圆心外'],[2,[6,9].includes(m)?'垂直路径':'沿圆周切线']]:slot===30?[[0,"editor.evenlyByCount"],[1,"editor.bySpacing"]]:slot===37?[[0,"editor.radialRotationOnly"],[1,"editor.rotationMirroredPairs"]]:slot===38?[[0,"editor.staggerRows"],[1,"editor.staggerColumns"]]:null;if(options)enumField(spec.label,'arrange.'+slot,options);else field(spec.label,'arrange.'+slot,spec.min,spec.max,spec.step);}
   advanced(uiText("editor.advancedRandomnessPosition"),()=>{for(const slot of [...([7,12].includes(m)?[]:[8]),9,10,11,...(m===1?[12]:[]),13,14]){const spec=arrangementSpec(m,slot,n.arrange);field(spec.label,'arrange.'+slot,spec.min,spec.max,spec.step);}});
   if(m===12){choice(uiText("editor.densityPattern"),n.arrange[39],CATALOG.map((p,i)=>({p,i})).filter(({p,i})=>projectShapeIds().has(p.id)||i===n.arrange[39]).map(({p,i})=>[i,graphicLabel(p)]),v=>edit(()=>{n.arrange[39]=+v;n.arrange.splice(42,16,...CATALOG[v].defaults);}),false);for(const p of CATALOG[n.arrange[39]].parameters)field((uiText("editor.density") + parameterLabel(p)),'arrange.'+(42+p.slot),p.min,p.max,p.step);}
   }
   layoutModifiers(n,m);
   field(uiText("editor.animationPhasePerInstance"),'instancePhase',-1,1,.01);controls().append(el('p',{id:'actual-count',class:'tree-note'}),el('button',{text:uiText("editor.expandToSeparateNodes"),onclick:()=>edit(()=>{const e=nodeClock(state.root,n.id,time);state.root=expandInstances(state.root,n.id,time,renderer.records(e.node,e.progress,{original:n,aspect:selectionRegions(animationPreviewProject(),n.id,time,{records:arrangementRecords}).regions[0]?.aspect??state.canvas.ratio}));})}));updateActualCount();note(uiText("editor.freezesTheCurrentPlacementsWhileRetainingContentAnimationUndoIsSupported"));
  }
 }
 if(section==='color')renderColorPanel(n);
 if(section==='composite'){
  animatedChoice(uiText("editor.blendMode"),'blend',[['over',"editor.normalBlend"],['add',"editor.add"],['max',"editor.maximum"],['multiply',"editor.multiply"],['subtract',"editor.subtract"],['screen',"editor.screen"],['difference',"editor.difference"],['overlay',"editor.overlay"],['softlight',"editor.softLight"],['dodge',"editor.colorDodge"],['mask',"editor.mask"],['inverseMask',"editor.inverseMask"]]);
  heading(uiText("editor.contourProcessing"));animatedChoice(uiText("editor.contourMode"),'contour.mode',[['none',"common.close"],['outline',"editor.outline"],['dilate',"editor.dilate"],['erode',"editor.erode"]]);field(uiText("editor.contourWidthFractionOfShortSide"),'contour.radius',0,.1,.001);note(uiText("editor.processesTheFinalNodeContourAfterChildCompositingForGroupsOutline"));
  advanced(uiText("editor.postProcessingBrightnessLevelsInvert"),()=>{controls().append(el('button',{text:uiText("editor.resetPostProcessing"),onclick:()=>edit(()=>{n.post=POST_SPECS.map(p=>p[3]);n.invert=false;})}));POST_SPECS.forEach(([label,min,max],i)=>field(label,'post.'+i,min,max,.01));animatedCheck(uiText("editor.invertPattern"),'invert');
    controls().append(el('button',{text:uiText("editor.resetImageFilters"),onclick:()=>edit(()=>n.postFx=fxDefaults())}));FX_SPECS.forEach(([label,min,max,def,step],i)=>field(label,'postFx.'+i,min,max,step));note(uiText("editor.appliesBlurBloomSharpeningDispersionAndToonLevelsInOrderRadii"));});
  if(n.mask)check(uiText("editor.invertMask"),n.maskInvert,v=>edit(()=>n.maskInvert=v));
  note(((n.mask ? ((uiText("editor.legacyMaskSubtree") + n.mask.name) + uiText("editor.selectItInTheNodeTreeToEdit")) : (['mask','inverseMask'].includes(n.blend) ? uiText("editor.thisMaskAffectsEarlierSiblingsInTheSameGroupNotLater") : uiText("editor.setAShapeOrGroupSBlendModeToMaskTo")))));if(n.mask)controls().append(el('button',{text:uiText("editor.removeMask"),onclick:()=>edit(()=>n.mask=null)}));
 }
 if(section==='animation'){
  heading(uiText("editor.playbackInParent"));for(const [k,label]of [['start',"editor.parentRangeStart"],['end',"editor.parentRangeEnd"]])field(uiText(label),'timing.'+k,0,1,.001,{key:false});
  choice(uiText("editor.playbackMode"),n.timing.loop?(n.timing.pingpong?'pingpong':'loop'):'once',[['once',"editor.playOnce"],['loop',"editor.loop"],['pingpong',"editor.pingPong"]],v=>edit(()=>{n.timing.loop=v!=='once';n.timing.pingpong=v==='pingpong';if(v==='once')n.timing.cycles=1;}));
  if(n.timing.loop)field((n.timing.pingpong ? uiText("editor.oneWayPassesOneRoundTrip") : uiText("editor.repeatCount")),'timing.cycles',.01,64,.01,{key:false});
  for(const [key,title]of [['before',"editor.beforeStart"],['after',"editor.afterEnd"]])choice(uiText(title),n.timing[key]??n.timing.outside,[['hold',"editor.holdBoundaryState"],['hide',"editor.hide"]],v=>edit(()=>n.timing[key]=v));
  note(uiText("editor.theTimeBarPlacesThisNodeInItsParentTimelineResizing"));
  advanced(uiText("editor.advancedTimeControls"),()=>{
   for(const [k,label,min,max] of [['from',"editor.sourceAnimationStart",0,1],['to',"editor.sourceAnimationEnd",0,1],['offset',"editor.parentTimePhaseOffset",-1,1]])field(uiText(label),'timing.'+k,min,max,.01,{key:false});
   check(uiText("editor.freezeAnimationPercentage"),n.timing.frozen,v=>edit(()=>n.timing.frozen=v));if(n.timing.frozen)field(uiText("editor.frozenProgress"),'timing.at',0,1,.001,{key:false});
   choice(uiText("editor.timeInterpolation"),n.timing.ease,[['linear',"editor.linear"],['smooth',"editor.easeInOut"],['hold',"editor.hold"]],v=>edit(()=>n.timing.ease=v));
   heading(uiText("editor.timeRemapping"));note(uiText("editor.xIsLocalTimeYIsSourceAnimationProgressThisRemaps"));
   progressCurve(n);
   n.timing.curve.forEach((key,i)=>{const row=el('div',{class:'tree-key-row'});for(const [j,label]of [[0,"editor.localTime"],[1,"editor.animationPercentage"]]){const input=el('input',{type:'number',min:0,max:1,step:.01,value:key[j],'aria-label':label+' '+i});input.onchange=()=>edit(()=>key[j]=+input.value);row.append(input);}row.append(el('button',{text:'×',onclick:()=>edit(()=>n.timing.curve.splice(i,1))}));controls().append(row);});
   controls().append(el('button',{text:uiText("editor.addRemappingPoint"),onclick:()=>edit(()=>{if(!n.timing.curve.length)n.timing.curve=[[0,0],[1,1]];else{let best=[0,0];for(let i=1;i<n.timing.curve.length;i++)if(n.timing.curve[i][0]-n.timing.curve[i-1][0]>best[1])best=[i,n.timing.curve[i][0]-n.timing.curve[i-1][0]];if(best[1]>0){const [a,b]=[n.timing.curve[best[0]-1],n.timing.curve[best[0]]];n.timing.curve.push([(a[0]+b[0])/2,(a[1]+b[1])/2]);}}})}),el('button',{text:uiText("editor.resetTimeCurve"),onclick:()=>edit(()=>n.timing.curve=[])}));
  });
  heading(uiText("editor.nodeParameterAnimation"));check(uiText("editor.enableNodeParameterAnimation"),n.animationEnabled,v=>edit(()=>n.animationEnabled=v));controls().append(el('button',{text:uiText("editor.clearThisNodeSKeyframes"),onclick:()=>edit(()=>n.tracks={})}));note(uiText("editor.enableRecordingAndAdjustAParameterToCreateKeyframesNormalMode"));

  controls().append(el('button',{text:uiText("editor.enterNodeAnimation"),onclick:()=>{$('animation-panel').open=true;animationEditor.enter(n.id);}}));note(uiText("editor.selectADiamondBelowToDragItsTimeEditItsValue"));
 }
}

function insert(n){return edit(()=>{state.root.children.push(n);selected=n.id;});}
const libraryThumbs=patternThumbnails(null);
const libraryOpen=new Set();
function rememberLibraryGroup(details){const key='closed:'+details.dataset.category;if(details.open)libraryOpen.delete(key);else libraryOpen.add(key);}
function syncLibraryToggle(){const groups=[...$('shape-library').children].filter(e=>e.tagName==='DETAILS');$('collapse-library').textContent=(groups.some(e=>e.open) ? uiText("editor.collapseAll") : uiText("editor.expandAll"));$('collapse-library').disabled=!groups.length;}
function projectShapeIds(){const ids=new Set();for(const r of projectOwner().projectResources)walk(r.root,n=>{if(n.kind==='shape')ids.add(n.type);});return ids;}
function library(){
 const q=$('shape-search').value.trim().toLowerCase(),filter=$('library-filter').value,container=$('shape-library');for(const group of container.children)if(group.tagName==='DETAILS')rememberLibraryGroup(group);libraryThumbs.reset();container.replaceChildren();container.className='tree-library-'+$('shape-library-view').value;
 const items=projectOwner().projectResources.filter(p=>graphicSearchText(p).includes(q)&&(filter==='all'||p.kind===filter));
 for(const category of new Set(items.map(p=>p.category||'图形列表'))){const details=el('details',{'data-category':category});details.open=!libraryOpen.has('closed:'+category);details.ontoggle=()=>{if(!details.isConnected)return;rememberLibraryGroup(details);syncLibraryToggle();};details.append(el('summary',{text:category}));const cards=el('div',{class:'tree-pattern-cards'});details.append(cards);container.append(details);
 for(const p of items.filter(p=>(p.category||'图形列表')===category)){const id='preset:'+p.id,image=el('img',{width:72,height:72,alt:(graphicLabel(p) + uiText("editor.preview"))}),card=el('div',{class:'tree-pattern-card'});card.append(el('button',{class:'component-inspect','aria-label':(uiText("library.viewPrefix") + graphicLabel(p)),onclick:()=>browse({id,name:graphicLabel(p),kind:'preset',preset:p})},[image,el('span',{class:'tree-pattern-text',text:graphicLabel(p)})]),el('button',{text:uiText("library.addInstance"),'aria-label':(uiText("library.addPrefix") + graphicLabel(p)),onclick:()=>{const copy=cloneNode(p.root);copy.resourceRef=p.id;copy.name=graphicLabel(p);insert(copy);}}));
 const more=el('details',{class:'component-more'},[el('summary',{text:uiText("editor.more")}),el('div',{class:'tree-note',text:(uiText("editor.version") + p.versionId)}),el('div',{class:'tree-note',text:(uiText("editor.personalEdits") + p.personalRevision)}),el('button',{text:uiText("editor.rename"),'aria-label':(uiText("library.renamePrefix") + graphicLabel(p)),onclick:()=>renameListItem(p.id)}),el('button',{text:uiText("editor.saveToGraphicsLibrary"),onclick:()=>graphicsLibrary.publish(p.root,p.source,p)}),el('button',{text:uiText("editor.removeFromGraphicsList"),onclick:()=>{if(componentPreview)returnWork();libraryThumbs.release();edit(()=>state.projectResources=state.projectResources.filter(r=>r.id!==p.id));previewSessions.delete(id);library();renderer.destroy();renderer=new TreeRenderer(document.createElement('canvas'));watchContext();requestRender();}})]);card.append(more);cards.append(card);libraryThumbs.observe(image,id,p.root);}}
 if(!items.length)container.append(el('p',{class:'tree-note',text:uiText("editor.noMatchingGraphicsOpenGraphicsLibraryAboveToChooseResources")}));syncLibraryToggle();
}
$('shape-library-view').onchange=library;$('library-filter').onchange=library;
const graphicsLibrary=createGraphicsLibrary({notify,onInsert:async(root,meta)=>{if(busy)throw messageError("editor.waitForTheCurrentOperationToFinish");returnWork();const copy=cloneNode(root);copy.name=graphicLabel(meta)||copy.name;delete copy.resourceRef;if(!insert(copy))throw Error($('tree-toast').textContent||'未能添加到画布');await resourcePersist;},getResources:()=>projectOwner().projectResources,onLoad:async(root,meta,update=false)=>{returnWork();const matches=state.projectResources.filter(r=>r.resourceId===meta.resourceId);if(matches.some(r=>r.versionId===meta.versionId))return;const old=update?matches.filter(r=>r.versionId<meta.versionId).sort((a,b)=>b.versionId-a.versionId)[0]:null;const entry=createProjectResource(root,meta);if(old){entry.id=old.id;entry.root.resourceRef=old.id;libraryThumbs.invalidate('preset:'+old.id);previewSessions.delete('preset:'+old.id);}edit(()=>{if(old)state.projectResources=state.projectResources.map(r=>r.id===old.id?entry:r);else state.projectResources.push(entry);});await resourcePersist;library();},onPublished:async(root,meta,update)=>{if(!update||!root.resourceRef)return;const owner=projectOwner();owner.projectResources=owner.projectResources.map(r=>r.id===root.resourceRef?publishedProjectResource(r,meta,root):r);persistSharedResources();localStorage.setItem(storageKey,serializeLocalProject(canvasProject(owner)));library();},onComposition:meta=>{const p=state.projectResources.find(r=>r.resourceId===meta.resourceId&&r.versionId===meta.versionId);if(p)browse({id:'preset:'+p.id,name:graphicLabel(p),kind:'preset',preset:p});}});
$('download-author-skill').onclick=()=>downloadSkill('author');
$('download-effects-skill').onclick=()=>downloadSkill('effects');
$('open-graphics-library').onclick=()=>graphicsLibrary.open();
$('save-whole-library').onclick=()=>graphicsLibrary.publish(state.root);
$('save-project-resource').onclick=()=>saveComponent(current());
$('update-project-resource').onclick=async()=>{const existing=linkedProjectResource(projectOwner().projectResources,current());if(!existing){previewButtons();return saveComponent(current());}if(!await confirmGraphicAction(((uiText("library.updateGraphicQuotedPrefix") + existing.name) + uiText("editor.existingInstancesWillKeepTheirContents"))))return;const root=cloneNode(current());edit(()=>state.projectResources=state.projectResources.map(r=>r.id===existing.id?replaceProjectResource(r,root):r));libraryThumbs.invalidate('preset:'+existing.id);previewSessions.delete('preset:'+existing.id);library();};
let exportController=null;
function exportStage(message){const status=$('export-stage');if(status)status.textContent=message?.key?uiFormat(message.key,...message.values):uiText(message);}
async function exportImage(kind){
 if(busy)return;busy=true;cancelExport=false;exportController=new AbortController();playing=false;$('play').textContent=uiText("playback.play");const p=structuredClone(state),o=p.output;Object.assign(o,outputDimensions(p.canvas.ratio,o.width));if(globalPanel)renderGlobalPanel();
 const check=()=>{if(cancelExport)throw messageError("editor.exportCanceled");},pause=async()=>{await new Promise(r=>setTimeout(r,0));check();};
 const render=(w,h,t=time,seconds=formulaSeconds)=>{check();if(kind==='png'){exportStage(uiText("editor.compositingFullSizePNGsAndReleasingTemporaryImagesPleaseWait"));return renderer.draw(p,w,h,{time:t,formulaSeconds:seconds,read:true,stream:true});}try{return renderer.draw(p,w,h,{time:t,formulaSeconds:seconds,read:true});}catch(error){if(!error.message.includes('纹理预算'))throw error;return renderer.draw(p,w,h,{time:t,formulaSeconds:seconds,read:true,quality:1});}};
 const encode=(kind,payload)=>{check();exportStage(uiText("editor.encodingAndPackagingFiles"));return runExportWorker('encode-'+kind,payload,{}, {signal:exportController.signal});};
 async function sequence(w,h,format){
  if(o.frames>10000)throw messageError("editor.moreThanFramesReduceFPSOrDuration");
  const cols=Math.min(o.columns,o.frames),aw=w*cols,ah=h*Math.ceil(o.frames/cols),entries=[];
  if(format!=='frames'&&(aw>8192||ah>8192||aw*ah>16777216))throw messageError("editor.atlasExceedsTheSizeBudgetReduceFrameSizeOrCount");
  if(w*h*o.frames>33554432)throw messageError("editor.frameSequenceExceedsTheTotalPixelBudget");const atlas=format==='frames'?null:new Float32Array(aw*ah*4);
  for(let i=0;i<o.frames;i++){const pix=render(w,h,exportFrameProgress(o,i),exportFrameProgress(o,i)*o.seconds);if(atlas){for(let y=0;y<h;y++)atlas.set(pix.subarray(y*w*4,(y+1)*w*4),((Math.floor(i/cols)*h+y)*aw+(i%cols)*w)*4);}else entries.push({name:`frame-${String(i).padStart(4,'0')}.png`,data:await encode('png',{pixels:pix,width:w,height:h,depth:o.depth})});exportStage(uiFormat("editor.renderingAndEncodingFrameValueValue",(i + 1),o.frames));await pause();}
  exportStage(uiText("editor.packagingFiles"));await pause();return {data:format==='frames'?await encode('zip',{entries}):format==='exr'?await encode('exr',{pixels:atlas,width:aw,height:ah,zip:o.exrZip}):await encode('png',{pixels:atlas,width:aw,height:ah,depth:o.depth}),width:aw,height:ah};
 }
 try{
  await pause();
  if((['exr','atlas-exr'].includes(kind)||o.depth===16&&!['copy','psd','psd-vector','svg'].includes(kind))&&!renderer.float)throw messageError("editor.thisDeviceDoesNotSupportFloatingPointRenderingForHighPrecision");
  if(kind==='svg'){const result=await runExportWorker('svg',p,{time,width:o.width,height:o.height,threshold:contourThreshold/100,smooth:contourSmooth},{signal:exportController.signal,stage:exportStage,render:(project,w,h,t)=>{check();return renderer.draw(project,w,h,{time:t,formulaSeconds,read:true});}});check();download(new TextEncoder().encode(result.svg),p.name+'.svg','image/svg+xml');notify((((uiText("editor.svgContoursExported") + result.stats.paths) + uiText("editor.paths")) + (result.stats.complexityWarning ? ('；' + result.stats.complexityWarning) : '')));return;}
  if(kind==='psd-vector'){const result=await runExportWorker('psd-vector',p,{time,width:o.width,height:o.height,threshold:contourThreshold/100,smooth:contourSmooth},{signal:exportController.signal,stage:exportStage,render:(project,w,h,t)=>{check();return renderer.draw(project,w,h,{time:t,formulaSeconds,read:true});}});check();download(result.bytes,p.name+'-矢量轮廓.psd','image/vnd.adobe.photoshop');notify((uiFormat("editor.exportedValueShapeLayersAndValuePathsValueFeatheringAndGradients",result.stats.vectors,result.stats.paths,(contourSmooth ? (((('；' + result.stats.fittedPaths) + uiText("editor.smoothed")) + result.stats.preservedPaths) + uiText("editor.originalContoursRetained")) : '')) + (result.stats.complexityWarning ? ('；' + result.stats.complexityWarning) : '')));return;}
  if(kind==='psd'){const result=await runExportWorker('psd',p,{time,width:o.width,height:o.height,threshold:contourThreshold/100,smooth:contourSmooth},{signal:exportController.signal,stage:exportStage,render:(project,w,h,t)=>{check();return renderer.draw(project,w,h,{time:t,formulaSeconds,read:true});}});check();download(result.bytes,p.name+'.psd','image/vnd.adobe.photoshop');notify(uiFormat("editor.psdExportedValueShapeLayersValuePixelLayersValue",result.stats.vectors,result.stats.pixels,(result.stats.merged ? (('，' + result.stats.merged) + uiText("editor.flattenedEffects")) : '')));return;}
  if(['exr','png','copy'].includes(kind)){exportStage(uiText("editor.renderingAndEncodingImage"));await pause();const pix=render(o.width,o.height),data=kind==='exr'?await encode('exr',{pixels:pix,width:o.width,height:o.height,zip:o.exrZip}):await encode('png',{pixels:pix,width:o.width,height:o.height,depth:kind==='copy'?8:o.depth});check();if(kind==='copy'){try{await navigator.clipboard.write([new ClipboardItem({'image/png':new Blob([data],{type:'image/png'})})]);}catch{download(data,p.name+'.png');notify(uiText("editor.clipboardAccessBlockedDownloadedPNG8Instead"));return;}}else download(data,p.name+'.'+kind);}
  else if(['batch','batch-atlas'].includes(kind)){const entries=[];for(const size of kind==='batch'?[256,512,1024]:[64,128,256]){const ratio=size/Math.max(o.width,o.height),w=Math.max(1,Math.round(o.width*ratio)),h=Math.max(1,Math.round(o.height*ratio));entries.push({name:size+'.png',data:kind==='batch'?await encode('png',{pixels:render(w,h),width:w,height:h,depth:o.depth}):(await sequence(w,h,'png')).data});await pause();}download(await encode('zip',{entries}),p.name+'-'+kind+'.zip');}
  else{const result=await sequence(o.width,o.height,kind==='frames'?'frames':kind==='atlas-exr'?'exr':'png');check();if(kind==='atlas-preview'){const url=URL.createObjectURL(new Blob([result.data],{type:'image/png'}));const img=el('img',{src:url,alt:uiText("editor.fullCanvasAtlasPreview"),style:'max-width:100%;object-fit:contain'});img.onload=()=>URL.revokeObjectURL(url);$('global-controls').append(img);notify(uiFormat("editor.atlasPreviewValueValue",result.width,result.height));return;}download(result.data,p.name+(kind==='frames'?'-frames.zip':kind==='atlas-exr'?'-atlas.exr':'-atlas.png'));}
  notify(uiText("editor.exportComplete"));
 }catch(e){notify(uiError(e));}finally{exportController=null;busy=false;if(globalPanel&&kind!=='atlas-preview')renderGlobalPanel();else if(globalPanel){$('export-progress')?.remove();$('confirm-export').disabled=false;$('confirm-export').textContent=uiText("editor.startExport");[...$('global-controls').querySelectorAll('button')].find(b=>b.textContent==='取消导出')?.remove();}requestRender();}
}
$('tree-examples').onclick=()=>window.open(pageHref('examples'),'_blank','noopener');
$('new-project').onclick=()=>{returnWork();edit(()=>{state=project();state.root.children=[];selected=state.root.id;animationEditMode='normal';localAnimationPreview=null;time=0;});};$('project-name').onchange=()=>edit(()=>state.name=$('project-name').value);$('add-shape').onclick=()=>graphicsLibrary.open();$('add-group').onclick=()=>insert(node('group'));$('wrap-top-level').onclick=()=>edit(()=>{const group=node('group');group.name='组合';group.children=state.root.children;state.root.children=[group];selected=group.id;});$('duplicate').onclick=()=>edit(()=>{const ids=duplicateSelection(state.root,selectedIds);selectedIds=new Set(ids);selected=selectionPrimary=ids.at(-1)??state.root.id;});$('delete').onclick=()=>edit(()=>deleteSelection(state.root,selectedIds));
function restoreHistory(from,to){if(!from.length||busy)return;const current=structuredClone(state),target=from.pop();state=shelf.restore(target,current);to.push(current);if(!find(state.root,selected))selected=state.root.id;persist();refresh();}
$('undo').onclick=()=>restoreHistory(history,future);$('redo').onclick=()=>restoreHistory(future,history);
async function saveComponent(source){const meta=await requestGraphicMetadata(uiText("editor.saveToGraphics"),{name:source.id===state.root.id?state.name:source.name});if(meta===null||busy)return;const entry=createProjectResource(source,meta);if(componentPreview){projectOwner().projectResources.push(entry);persistSharedResources();localStorage.setItem(storageKey,serializeLocalProject(canvasProject(projectOwner())));}else edit(()=>{state.projectResources.push(entry);const original=find(state.root,source.id)?.node;if(original)original.resourceRef=entry.id;});library();previewButtons();notify(uiText("editor.savedToGraphicsList"));}
async function renameListItem(id){const old=projectOwner().projectResources.find(r=>r.id===id);if(!old||busy)return;const metadata=await requestGraphicMetadata(uiText("editor.renameGraphicsListEntry"),old);if(metadata===null||busy)return;const name=metadata.name;const active=componentPreview?.id;if(componentPreview)returnWork();edit(()=>state.projectResources=state.projectResources.map(r=>r.id===id?renameProjectResource(r,metadata):r));const cached=previewSessions.get('preset:'+id);if(cached){cached.name=name;for(const draft of [cached.original,cached.session.state])for(const child of draft.root.children)if(child.name===old.name)child.name=name;}if(active){const entry=state.projectResources.find(r=>'preset:'+r.id===active);if(entry)browse({id:active,name:graphicLabel(entry),kind:'preset',preset:entry});}library();previewButtons();notify(uiText("editor.graphicsListEntryRenamed"));}
async function exportPack(payload,name,options){try{download(await encodeResourcePack(payload,options),name+'.zip','application/zip');}catch(e){notify(uiError(e));}}
async function loadPackFile(file){if(file.size>64*1024*1024)throw messageError("editor.fileExceedsMB");if(/\.zip$/i.test(file.name))return readResourcePack(await file.arrayBuffer());if(file.type.startsWith('image/')){const asset=await imageAsset(file);return readResourcePack(await encodeResourcePack({schema:'momo.texture-assets/v1'},{assets:[[asset.definition.id,asset]]}));}if(file.size>4000000)throw messageError("editor.jsonExceedsMB");return {payload:JSON.parse(await file.text()),prepared:[],register(){},persist(){},rollback(){}};}
function validatePackGraphics(pack){let test;try{if(pack.prepared.length){test=new TreeRenderer(document.createElement('canvas'));for(const [id]of pack.prepared){const p=project();p.root.children=[node('shape',id)];test.draw(p,32,32,{time:.25,quality:1});p.root.children[0].boundary='repeat';test.draw(p,32,32,{time:.25,quality:1});}}}finally{test?.destroy();}}
$('save-project').onclick=()=>exportPack(canvasProject(state),state.name);$('open-project').onclick=()=>$('project-file').click();$('project-file').onchange=async()=>{let pack;try{const file=$('project-file').files[0];if(!file)return;pack=await loadPackFile(file);pack.register();const p=sanitizeTree(pack.payload);validatePackGraphics(pack);await pack.persist();returnWork();edit(()=>{state=p;selected=p.root.id;animationEditMode='normal';localAnimationPreview=null;time=0;});library();}catch(e){pack?.rollback();notify(uiError(e));}finally{$('project-file').value='';}};
$('save-selected-component').onclick=()=>graphicsLibrary.publish(current(),projectOwner().projectResources.find(r=>r.id===current().resourceRef)?.source);
$('export-now').onclick=()=>openGlobal('export');$('project-settings').onclick=()=>openGlobal('project');$('close-global').onclick=()=>{globalPanel=null;$('global-panel').hidden=true;renderPreviewSettings();$('export-now').focus();};$('solo').onclick=()=>{solo=!solo;if(solo)select(selected);$('solo').textContent=(solo ? uiText("editor.returnToComposite") : uiText("editor.soloPreview"));requestRender();};$('shape-search').oninput=library;
function sizePreview(){if(!canvasMode())return;const stage=$('canvas-stage'),surface=$('tree-preview-surface'),dims=previewDimensions(state.canvas.ratio,Math.max(64,(stage.clientWidth||512)-56),Math.max(64,(stage.clientHeight||512)-56),$('zoom').value==='fit'?1:Number($('zoom').value));surface.style.width=dims.displayWidth+'px';surface.style.height=dims.displayHeight+'px';surface.classList.toggle('tiled',tiled);}
const PreviewObserver=globalThis.ResizeObserver??window.ResizeObserver;
if(PreviewObserver)new PreviewObserver(()=>{sizePreview();requestRender();}).observe($('canvas-stage'));
$('tree-time').oninput=()=>seekAnimationScope(animationEditor.getScope(),+$('tree-time').value);$('zoom').onchange=()=>{sizePreview();requestRender();};
// Viewing zoom never changes authored UVs or export dimensions.
$('canvas-stage').addEventListener('wheel',e=>{
 if(!canvasMode())return;
 e.preventDefault();if(busy||uvDrag||panStart||canvasEditor?.interacting()||!e.deltaY)return;
 const stage=$('canvas-stage'),surface=$('tree-preview-surface'),select=$('zoom'),steps=[.25,.5,.75,1,1.25,1.5,2,3,4],zoom=select.value==='fit'?1:Number(select.value);
 const next=e.deltaY<0?steps.find(v=>v>zoom):[...steps].reverse().find(v=>v<zoom);if(next===undefined)return;
 const before=surface.getBoundingClientRect(),u=(e.clientX-before.left)/Math.max(1,before.width),v=(e.clientY-before.top)/Math.max(1,before.height);
 select.value=String(next);sizePreview();const after=surface.getBoundingClientRect();stage.scrollLeft+=after.left+u*after.width-e.clientX;stage.scrollTop+=after.top+v*after.height-e.clientY;requestRender();
},{passive:false});
$('show-guides').onchange=drawGuides;
$('show-pivot').onchange=drawGuides;
$('retry-render').onclick=()=>{try{materialPreview?.destroy();materialPreview=null;effectPreview?.destroy();effectPreview=null;if(renderer.gl.isContextLost()){renderer.destroy();renderer=new TreeRenderer(document.createElement('canvas'));watchContext();}else renderer.clearCache();requestRender();}catch(e){showRenderError(e.message);}};
$('animation-panel').ontoggle=()=>requestRender();
$('background').onchange=()=>{$('canvas-stage').className=$('background').value;$('canvas-stage').classList.toggle('material-mode',materialMode());$('canvas-stage').classList.toggle('effect-mode',effectMode());};
$('tile-preview').onclick=()=>{tiled=!tiled;$('tile-preview').setAttribute('aria-pressed',String(tiled));requestRender();};
$('tile-grid').onchange=()=>{const value=Number($('tile-grid').value);if(![2,3,4].includes(value))return;tileGrid=value;tiled=true;$('tile-preview').setAttribute('aria-pressed','true');requestRender();};
$('play-duration').onchange=()=>{const value=$('play-duration').valueAsNumber;if(!Number.isFinite(value)||value<=0){$('play-duration').value=state.output.seconds;return;}edit(()=>state.output.seconds=Math.max(.05,Math.min(600,value)));};
$('restart-play').onclick=()=>{seekAnimationScope(animationEditor.getScope(),0);$('play').click();};
$('play').onclick=()=>{if(animationEditMode==='base'){animationEditMode='normal';inspector();}if(!playing&&animationEditor.getScope()!==state.root.id&&!localAnimationPreview)localAnimationPreview={id:animationEditor.getScope(),time:animationClock(animationEditor.getScope()).progress};playing=!playing;$('play').textContent=uiText(playing?"playback.pause":"playback.play");requestRender();};let last=performance.now();function tick(now){const dt=(now-last)/1000;last=now;if(playing&&!busy){formulaSeconds+=dt;if(localAnimationPreview)localAnimationPreview.time=(localAnimationPreview.time+dt/state.output.seconds)%1;else time=(time+dt/state.output.seconds)%1;$('tree-time').value=time;requestRender();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
document.addEventListener('keydown',e=>{if(e.defaultPrevented||document.querySelector('dialog[open]'))return;if(e.key==='Escape'&&componentPreview){returnWork();return;}if(e.key==='Escape'&&globalPanel){$('close-global').click();return;}if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||busy||globalPanel)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();$('redo').click();return;}if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.code==='Space'){e.preventDefault();$('play').click();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$(e.shiftKey?'redo':'undo').click();}if(e.key==='Escape'&&globalPanel)$('close-global').click();});try{persistSharedResources();}catch(e){notify((uiText("editor.couldNotSaveGraphicsList") + e.message));}library();refresh();

// Preview selection is view state; only generation parameters belong to the saved output settings.
function normalSettings(){
 field(uiText("editor.normalStrength"),'output.normal',0,20,.1,{target:state,key:false});
 choice(uiText("editor.normalAlgorithm"),state.output.normalAlgorithm,[['sobel','Sobel'],['scharr','Scharr']],v=>edit(()=>state.output.normalAlgorithm=v));
 for(const [key,label]of [['normalFlipX',"editor.flipNormalX"],['normalFlipY',"editor.flipNormalY"],['normalInvert',"editor.invertHeightDirection"]])check(uiText(label),state.output[key],v=>edit(()=>state.output[key]=v));
 field(uiText("editor.normalPreSmoothing"),'output.normalSmooth',0,8,.1,{target:state,key:false});
}
function renderPreviewSettings(){
 const host=$('normal-preview-settings');host.hidden=$('preview-channel').value!=='normal'||!!globalPanel;
 if(host.hidden)return;
 const previous=formTarget;formTarget=host;host.replaceChildren();
 try{normalSettings();note(uiText("editor.generatesNormalsFromCanvasHeightColorImagesUseLuminanceAsHeight"));}finally{formTarget=previous;}
}
function openGlobal(kind){globalPanel=kind;$('global-panel').hidden=false;renderGlobalPanel();renderPreviewSettings();$('close-global').focus();}
function renderGlobalPanel(){
 formTarget='global-controls';controls().replaceChildren();$('global-title').textContent=(globalPanel==='project' ? uiText("editor.canvasSettings") : uiText("editor.exportFullCanvas"));
 try{
 if(globalPanel==='project'){
  heading(uiText("editor.canvasAspectRatio"));choice(uiText("editor.aspectPresets"),String(state.canvas.ratio),[[1,'1 : 1'],[4/3,'4 : 3'],[16/9,'16 : 9'],[3/4,'3 : 4'],[9/16,'9 : 16'],[state.canvas.ratio,"editor.currentAspect"]],v=>edit(()=>{state.canvas.ratio=+v;Object.assign(state.output,outputDimensions(+v,state.output.width));}));
  field(uiText("editor.widthHeight"),'canvas.ratio',.125,8,.001,{target:state,key:false});note(uiText("editor.theCanvasDefinesAspectRatioNotPixelSizeNodesRetainTheir"));
  field(uiText("editor.durationSeconds"),'output.seconds',.05,600,.05,{target:state,key:false});
 }else{
  choice(uiText("editor.exportFormat"),exportKind,[['copy',"editor.copyPNG8Image"],['png',"editor.pngCurrentFrame"],['psd',"editor.psdLayeredCurrentFrame"],['psd-vector',"editor.psdVectorContoursSimplified"],['svg',"editor.svgVectorContoursSimplified"],['exr',"editor.exrCurrentFrame"],['frames',"editor.pngFrameSequenceZIP"],['atlas',"editor.pngSpriteAtlas"],['atlas-exr',"editor.exrSpriteAtlas"],['atlas-preview',"editor.previewSpriteAtlas"],['batch-atlas',"editor.threeSizePNGAtlasesZIP"],['batch',"editor.threeSizePNGImagesZIP"]],v=>{if(busy)return;exportKind=v;renderGlobalPanel();});
  note(uiText("editor.exportsTheFullCanvasIgnoringPreviewChannelSoloModeZoomAnd"));
  if(!['batch','batch-atlas'].includes(exportKind))for(const [key,label]of [['width',"editor.pixelWidth"],['height',"editor.pixelHeight"]])field(uiText(label),'output.'+key,1,4096,1,{target:state,key:false});
  if(['frames','atlas','atlas-exr','atlas-preview','batch-atlas'].includes(exportKind)){field(uiText("editor.framesPerSecondFPS"),'output.fps',1,120,1,{target:state,key:false});field(uiText("editor.durationInSeconds"),'output.seconds',.05,600,.05,{target:state,key:false});check(uiText("editor.loopExportOmitDuplicateEndFrame"),state.output.loopExport,v=>edit(()=>state.output.loopExport=v));note(uiFormat("editor.valueFPSValueSecondsValueFramesValuePlayTheAtlasOr",state.output.fps.toFixed(2),state.output.seconds,state.output.frames,(state.output.loopExport ? uiText("editor.endFrameExcluded") : uiText("editor.endFrameIncluded"))));}
  if(exportKind.startsWith('atlas')||exportKind==='batch-atlas')field(uiText("editor.atlasColumns"),'output.columns',1,32,1,{target:state,key:false});
 }
 if(globalPanel!=='export'||!['psd-vector','svg'].includes(exportKind)){
 heading(uiText("editor.canvasOutputAppearance"));choice(uiText("editor.outputChannel"),state.output.mode,[['color',"inspector.color"],['height',"editor.height"],['normal',"editor.normal"],['rgba',"editor.customRGBAChannels"]],v=>edit(()=>state.output.mode=v));
 if(['normal','rgba'].includes(state.output.mode)){
  normalSettings();
 }
 if(state.output.mode==='rgba')for(let i=0;i<4;i++)choice(('RGBA'[i] + uiText("editor.channel")),state.output.channels[i],["editor.height","editor.invertedHeight","editor.normalX","editor.normalY","editor.normalZ",'0','1','0.5',"editor.opacity","editor.normalSlope"].map((label,i)=>[i,label]),v=>edit(()=>state.output.channels[i]=+v));
 }
 const bg=colorInput(uiText("editor.canvasBackgroundColor"),state.output.background,value=>state.output.background=value);controls().append(el('label',{class:'tree-field'},[document.createTextNode(uiText("editor.backgroundColor")),bg]));
 check(uiText("editor.transparentBackground"),state.output.alpha,v=>edit(()=>state.output.alpha=v));
 if(globalPanel==='export'){
  if(['exr','atlas-exr'].includes(exportKind))check(uiText("editor.exrZIPLosslessCompression"),state.output.exrZip,v=>edit(()=>state.output.exrZip=v));
  if(!['exr','atlas-exr','copy','psd','psd-vector','svg'].includes(exportKind))choice(uiText("editor.pngPrecision"),state.output.depth,[[8,"editor.bit"],[16,"export.depth16"]],v=>edit(()=>state.output.depth=+v));
  const o=state.output,d=outputDimensions(state.canvas.ratio,o.width),frames=['frames','atlas','atlas-exr','atlas-preview','batch-atlas'].includes(exportKind)?o.frames:1;
  if(['psd-vector','svg'].includes(exportKind)){
   note(uiFormat("editor.valueVectorContoursValueValueProgressValueEachPartBecomesAn",exportKind==='svg'?'SVG':'PSD',d.width,d.height,time.toFixed(3)));
   const threshold=el('input',{type:'number','aria-label':uiText("editor.contourAlphaThreshold"),min:0,max:99,step:1,value:contourThreshold,onchange:e=>{if(busy)return;contourThreshold=Math.max(0,Math.min(99,Math.round(Number(e.target.value)||0)));renderGlobalPanel();}});threshold.disabled=busy;controls().append(el('label',{class:'tree-field'},[document.createTextNode(uiText("editor.alphaThreshold")),threshold]));
   const smoothing=el('input',{type:'checkbox','aria-label':uiText("editor.smoothContours"),checked:contourSmooth,onchange:e=>{if(busy)return;contourSmooth=e.target.checked;renderGlobalPanel();}});smoothing.disabled=busy;controls().append(el('label',{class:'tree-check'},[smoothing,document.createTextNode(uiText("editor.smoothContoursSubpixelEdges"))]));
   note(((contourSmooth ? uiText("editor.nonzeroThresholdsInterpolateSubpixelEdgesWithFinerSamplingWithinTheBudget") : uiText("editor.smoothingOffPreservesExactOccupiedPixelBoundariesIncludingVisibleStairSteps"))));
   note(uiText("editor.defaultInterpolatesSemiTransparentEdgesToReduceFaintEdgeBulgesAt"));
   note(uiText("editor.contourPrecisionDependsOnExportSamplingSizeNoiseMayFormSolid"));
   try{const plan=planContourPSD(state,{time,width:d.width,height:d.height});note(uiFormat("editor.upToValueShapeLayersEmptyRegionsAreSkipped",plan.stats.pixels+(plan.background?1:0)));for(const warning of plan.warnings)note(warning);}catch(e){note(e.message);}
  }else if(exportKind==='psd'){
   note(uiFormat("editor.psdRGBBitValueValueProgressValueRetainsSeparableNodeLayers",d.width,d.height,time.toFixed(3)));
   note(uiText("editor.solidHardEdgedCirclesRingsAndEllipsesWithoutUVArrangementOr"));
   try{const plan=planPSD(state,{time,width:d.width,height:d.height});note(uiFormat("editor.estimatedValueShapeLayersValuePixelLayersAndValueGroupsParts",plan.stats.vectors,plan.stats.pixels,Math.max(0,plan.stats.groups-1)));for(const warning of plan.warnings)note(warning);}catch(e){note(e.message);}
  }else note(((exportKind==='batch-atlas' ? uiText("editor.outputThreeAtlasesWithFrameLongestSidesOfPreservingAspect") : (exportKind==='batch' ? ((uiText("editor.outputLongestSidesPreservingCanvasAspectPNG") + o.depth) + uiText("editor.bitThreeImagesPackaged")) : uiFormat("editor.outputValueValuePerFrameValueValueFramesValueValue",d.width,d.height,['exr','atlas-exr'].includes(exportKind)?uiText("editor.exrBitFloatHalf"):'PNG '+(exportKind==='copy'?8:o.depth)+uiText("export.bitSuffix"),frames,!['frames','atlas','atlas-exr','atlas-preview','batch-atlas'].includes(exportKind)?uiText("editor.currentProgress")+time.toFixed(3):' / '+o.seconds+uiText("playback.secondsSuffix")+o.fps.toFixed(2)+' FPS',exportKind.startsWith('atlas')?uiText("editor.atlas")+d.width*Math.min(o.columns,o.frames)+' × '+d.height*Math.ceil(o.frames/Math.min(o.columns,o.frames)):'')))));
  const button=el('button',{id:'confirm-export',class:'primary',text:(busy ? uiText("editor.exporting") : uiText("editor.startExport")),onclick:()=>exportImage(exportKind)});button.disabled=busy;controls().append(button);if(busy){for(const input of controls().querySelectorAll('input,select'))input.disabled=true;controls().append(el('div',{id:'export-progress',role:'status','aria-live':'polite'},[el('progress',{'aria-label':uiText("editor.exportInProgress")}),el('span',{id:'export-stage',text:uiText("editor.preparingExport")}),el('span',{class:'tree-note',text:uiText("editor.complexGraphicsMayTakeLongerPleaseWait")})]),el('button',{text:uiText("editor.cancelExport"),onclick:()=>{cancelExport=true;exportController?.abort();exportStage(uiText("editor.canceling"));}}));controls().lastElementChild.scrollIntoView({block:'nearest'});}
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
 if(!canvasMode()){$('selection-guide').hidden=true;$('guide-note').textContent=((effectMode() ? uiText("editor.effectBlendingPreview") : uiText("editor.dMaterialPreview")) + uiText("editor.exportStillUsesCanvasTextures"));return;}
 const svg=$('selection-guide');svg.replaceChildren();const showRegion=$('show-guides').checked,showPivot=$('show-pivot').checked;const hidden=(selected===state.root.id)||!(showRegion||showPivot);svg.toggleAttribute('hidden',hidden);$('guide-note').textContent=uiText("editor.goldBoundsCanvasFinalOutputBoundary");if(hidden){canvasEditor?.draw();if(selectedIds.size>1)$('guide-note').textContent+=((uiText("selection.selectedSuffix") + selectedIds.size) + uiText("editor.nodesDragToMoveTogether"));return;}
 const {regions}=selectionRegions(animationPreviewProject(),selected,time,{solo:solo,records:arrangementRecords});
 const copies=tiled?tileGrid:1,ns='http://www.w3.org/2000/svg',add=(name,attrs)=>{const e=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);};
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
 $('guide-note').textContent=(regions.length ? uiFormat("editor.goldBoundsCanvasValueValueRepeatedCopiesHaveNoExtraBounds",(showRegion ? uiText("editor.blueOutlineSelectedNodeCenter") : ''),(showPivot ? uiText("editor.crosshairPivot") : '')) : uiText("editor.nodeHiddenOrRegionHasZeroSize"));if(selectedIds.size>1)$('guide-note').textContent+=((uiText("selection.selectedSuffix") + selectedIds.size) + uiText("editor.nodesDragToMoveTogether"));else if(regions.length>1)$('guide-note').textContent+=uiText("editor.copiesShareTheSameSourceNode");
}
$('global-panel').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const buttons=[...$('global-panel').querySelectorAll('button,input,select')].filter(x=>!x.disabled),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});

function currentColorContext(){return colorContext(state.root,selected,n=>animationClock(n.id).node);}
function intrinsicColor(n){return n.kind==='shape'&&['inherit','preserve'].includes(n.color.mode)&&(isImage(n.type)&&n.params[0]<.5||!!BY_ID.get(n.type)?.definition.generator);}
function openColorPanel(){section='color';inspector();document.querySelector('.tree-inspector').scrollTop=0;}
function goColorSource(id){section='color';select(id);document.querySelector('.tree-inspector').scrollTop=0;}
function colorStatus(context){const {local,source,children}=context;if(children)return uiText("editor.preservingChildColors");if(intrinsicColor(local))return uiText(isImage(local.type)?"editor.usingImageColors":"editor.usingGeneratorColors");if(['own','remap'].includes(local.color.mode))return uiText(local.color.mode==='remap'?"editor.groupColorRemap":"editor.independentColors");return source?uiText("editor.inheritedFrom")+source.name:uiText("editor.usingTheDefaultBlackAndWhitePalette");}
function adoptNodeColor(n){const context=currentColorContext(),color=independentColor(context);edit(()=>{for(const key of ['mode','fill','low','high'])assignAnimated(n,'color.'+key,color[key]);if(color.stops)n.color.stops=structuredClone(color.stops);else delete n.color.stops;});}
function renderColorQuick(n){
 const host=$('inspector-color-quick'),context=currentColorContext(),local=context.local,own=['own','remap'].includes(local.color.mode);host.hidden=false;host.replaceChildren();
 const body=el('div',{class:'color-quick-body',id:'color-quick-body'}),arrow=el('span',{class:'color-quick-arrow','aria-hidden':'true'}),toggle=el('button',{class:'color-quick-toggle','aria-controls':'color-quick-body'},[arrow,el('strong',{text:uiText("inspector.color")}),el('span',{class:'color-quick-mini','aria-hidden':'true'}),el('span',{class:'color-quick-summary'})]);
 const setExpanded=()=>{body.hidden=!quickColorExpanded;host.classList.toggle('is-expanded',quickColorExpanded);toggle.setAttribute('aria-expanded',String(quickColorExpanded));toggle.setAttribute('aria-label',(quickColorExpanded ? uiText("editor.collapseQuickColors") : uiText("editor.expandQuickColors")));arrow.textContent=(quickColorExpanded ? '▾' : '▸');};toggle.onclick=()=>{quickColorExpanded=!quickColorExpanded;setExpanded();};setExpanded();
 const link=el('button',{class:'color-settings-link',text:uiText("editor.colorSettings"),onclick:openColorPanel});host.append(el('div',{class:'color-quick-heading'},[toggle,link]),body);
 const row=el('div',{class:'color-quick-row'});if(own&&local.color.fill==='solid'){const picker=colorInput(uiText("editor.quickFillColor"),local.color.high,value=>n.color.high=value,'color.high');picker.classList.add('color-quick-picker');row.append(picker);}else row.append(el('button',{class:'color-quick-swatch','aria-label':uiText("editor.openColorSettings"),onclick:openColorPanel}));body.append(row,el('p',{class:'color-quick-source'}));
 const opacity=el('input',{type:'number',min:0,max:100,step:1,value:Math.round(animationValue(n,'opacity')*10000)/100,'aria-label':uiText("editor.quickOpacity"),'data-animation-scale':'100',title:uiText("editor.overallNodeOpacityGroupsAffectTheWholeGroup")});decorateAnimated(opacity,n,'opacity');opacity.onchange=()=>{if(!Number.isFinite(opacity.valueAsNumber)){opacity.value=String(Math.round(animationValue(n,'opacity')*10000)/100);return;}stopAnimation();edit(()=>assignAnimated(n,'opacity',Math.max(0,Math.min(1,opacity.valueAsNumber/100))));};const slider=el('input',{type:'range',min:0,max:100,step:1,value:Math.round(animationValue(n,'opacity')*10000)/100,'aria-label':uiText("editor.quickOpacitySlider"),'data-animation-scale':'100'});decorateAnimated(slider,n,'opacity');let before=null;
 slider.oninput=()=>{if(busy)return;stopAnimation();before??=structuredClone(state);try{assignAnimated(current(),'opacity',Number(slider.value)/100);opacity.value=slider.value;requestRender();}catch(error){notify(uiError(error));}};
 const commit=()=>{if(!before)return;const previous=before,focused=document.activeElement===slider;before=null;try{state=validatedState(state);if(JSON.stringify(state)!==JSON.stringify(previous)){recordHistory(previous);if(history.length>60)history.shift();future=[];}persist();refresh();if(focused)$('inspector-color-quick').querySelector('input[type=range]')?.focus();}catch(error){state=previous;notify(uiError(error));refresh();}};slider.onchange=commit;slider.onblur=commit;
 body.append(el('div',{class:'color-quick-opacity'},[el('span',{text:uiText("editor.opacity")}),slider,opacity,el('span',{text:'%'})]));
 const actions=el('div',{class:'color-quick-actions'});
 if(!own){const adopt=el('button',{text:(intrinsicColor(local) ? uiText("editor.customColorMapping") : (context.children ? uiText("editor.setChildColors") : uiText("editor.useIndependentColors"))),onclick:()=>adoptNodeColor(n)});decorateAnimated(adopt,n,'color.mode');actions.append(adopt);}
 if(!own&&context.source&&context.source.id!==n.id&&!intrinsicColor(local))actions.append(el('button',{text:uiText("editor.goToColorSource"),onclick:()=>goColorSource(context.source.id)}));
 if(context.override)actions.append(el('button',{text:uiText("editor.viewParentColorOverride"),onclick:()=>goColorSource(context.override.id)}));if(actions.children.length)body.append(actions);syncColorQuick();
}
function syncColorQuick(){
 const host=$('inspector-color-quick');if(host.hidden||current()===state.root)return;const context=currentColorContext(),special=context.children||intrinsicColor(context.local),swatch=host.querySelector('.color-quick-swatch');
 if(swatch){swatch.classList.toggle('color-original',special);swatch.style.background=special?'':colorBackground(context.palette);swatch.textContent=(special ? (context.children ? uiText("editor.individualChildColors") : uiText("editor.originalColors")) : uiText("editor.editGradientColors"));}
 const mini=host.querySelector('.color-quick-mini');mini.classList.toggle('color-original',special);mini.style.background=special?'':colorBackground(context.palette);host.querySelector('.color-quick-summary').textContent=Math.round(animationValue(current(),'opacity')*10000)/100+'%';
 host.querySelector('.color-quick-source').textContent=(colorStatus(context) + (context.override ? ((uiText("editor.finalColorsOverriddenBy") + context.override.name) + uiText("editor.message")) : ''));
 for(const preview of $('inspector').querySelectorAll('.color-gradient-preview'))preview.style.background=colorBackground(context.palette);
 for(const input of $('inspector').querySelectorAll('input[type=color]')){const hex=input.parentElement.querySelector('input[data-color-hex]');if(hex&&document.activeElement!==hex)hex.value=input.value.toUpperCase();}
}
function colorControl(n,label,value,assign,path=null){
 const row=el('div',{class:'color-control-row'}),input=colorInput(label,value,assign,path),hex=el('input',{type:'text',value:(path?animationValue(n,path):value).toUpperCase(),'aria-label':label+' HEX','data-color-hex':'',maxLength:7,spellcheck:'false'});
 if(path)decorateAnimated(hex,n,path);hex.oninput=()=>hex.setCustomValidity('');hex.onchange=()=>{const next=normalizeHex(hex.value);if(!next){hex.setCustomValidity('请输入3位或6位十六进制颜色，例如 #80DFFF');hex.reportValidity();return;}stopAnimation();edit(()=>path?assignAnimated(n,path,next):assign(next));};
 row.append(el('label',{text:label}));if(path)row.append(keyButton(n,path,label));else row.append(el('span'));row.append(el('div',{class:'color-control-inputs'},[input,hex]));controls().append(row);
}
function renderColorPanel(n){
 const context=currentColorContext(),mode=context.local.color.mode;field(uiText("editor.opacity"),'opacity',0,1);heading(uiText("editor.nodeColors"));
 animatedChoice(uiText("editor.colorSource"),'color.mode',[['inherit',"editor.inheritParentColors"],['own',"editor.ownColors"],...(n.kind==='group'?[['preserve',"editor.preserveChildColors"],['remap',"editor.groupColorRemap"]]:[])]);
 if(context.override){const notice=el('div',{class:'color-notice',text:((uiText("editor.finalColorsAreAlsoOverriddenByParent") + context.override.name) + uiText("inspector.groupPaletteInfluenceSuffix"))});notice.append(el('button',{text:uiText("editor.goToColorOverrideSource"),onclick:()=>goColorSource(context.override.id)}));controls().append(notice);}
 if(!['own','remap'].includes(mode)){note(((colorStatus(context) + uiText("editor.useTheQuickControlsAboveToChangeColorModeOrVisit"))));if(context.children)note(uiText("editor.groupColorsAffectInheritingChildrenChildrenWithIndependentColorsRetainThem"));if(intrinsicColor(context.local))note(uiText("editor.customMappingRemapsColorsUsingShapeLuminance"));return;}
 animatedChoice(uiText("editor.colorFill"),'color.fill',[['solid',"editor.solidFill"],['gradient',"editor.valueGradient"]]);
 if(animationValue(n,'color.fill')==='solid'){colorControl(n,uiText("editor.fillColor"),n.color.high,value=>n.color.high=value,'color.high');note(uiText("editor.edgesOnlyAffectAlphaFillColorStaysUniformExistingGradientSettings"));}
 else gradientEditor(n);
 if(n.kind==='group')note(((mode==='remap' ? uiText("editor.compositesTheGroupFirstThenRemapsItsColors") : uiText("editor.suppliesColorsOnlyToInheritingChildrenIndependentChildColorsAreRetained"))));
}
function gradientEditor(n){
 const color=animationClock(n.id).node.color,custom=n.color.stops?.length>=2,stops=custom?n.color.stops:[{position:0,color:animationValue(n,'color.low')},{position:1,color:animationValue(n,'color.high')}];
 const preview=el('div',{class:'color-gradient-preview',role:'img','aria-label':uiText("editor.currentGradientColors")});preview.style.background=colorBackground(color);controls().append(preview);
 if(!custom){heading(uiText("editor.gradientEndpoints"));colorControl(n,uiText("editor.shadowColor"),n.color.low,value=>n.color.low=value,'color.low');colorControl(n,uiText("editor.highlightColor"),n.color.high,value=>n.color.high=value,'color.high');}
 heading(uiText("editor.colorPresets"));const presets=el('div',{class:'color-preset-grid'});for(const palette of PALETTES){const strip=el('span',{class:'color-preset-strip'});strip.style.background=colorBackground({fill:'gradient',stops:palette.stops});presets.append(el('button',{class:'color-preset','aria-label':(uiText("editor.applyColorPreset") + uiText(palette.nameKey)),onclick:()=>edit(()=>{n.color.stops=structuredClone(palette.stops);})},[strip,el('span',{text:uiText(palette.nameKey)})]));}controls().append(presets);
 if(custom)heading(uiText("editor.gradientStops"));
 if(custom)stops.forEach((stop,i)=>{
  const parent=formTarget,card=el('div',{class:'color-stop-card'});controls().append(card);formTarget=card;
  try{colorControl(n,uiText("editor.stopColor")+(i+1),stop.color,value=>n.color.stops[i].color=value);const pos=el('input',{type:'number',min:0,max:1,step:.01,value:stop.position,'aria-label':(uiText("editor.stopPosition") + (i + 1)),onchange:()=>edit(()=>{n.color.stops[i].position=+pos.value;})}),del=el('button',{text:uiText("editor.deleteStop"),'aria-label':(uiText("editor.deleteStopPrefix") + (i + 1)),onclick:()=>edit(()=>n.color.stops=n.color.stops.filter((_,j)=>j!==i))});del.disabled=stops.length<=2;controls().append(el('label',{class:'tree-field'},[document.createTextNode(uiText("editor.position")),pos,del]));}finally{formTarget=parent;}
 });
 const add=el('button',{text:uiText("editor.addStop"),onclick:()=>edit(()=>n.color.stops=[...structuredClone(stops),{position:.5,color:'#808080'}])});add.disabled=stops.length>=8;
 controls().append(el('div',{class:'color-stops-actions'},[add,el('button',{text:uiText("editor.restoreTwoColorGradient"),onclick:()=>edit(()=>{const sorted=[...stops].sort((a,b)=>a.position-b.position);assignAnimated(n,'color.low',sorted[0].color);assignAnimated(n,'color.high',sorted.at(-1).color);delete n.color.stops;})})]));
 note(((custom ? uiText("editor.upToStopsMapValuesFromDarkToBrightMulticolorStops") : uiText("editor.shadowAndHighlightColorsMapToPatternValuesBothEndpointColors"))));
}

$('share-project').onclick=async()=>{try{const portable=canvasProject(state);if(location.protocol==='file:'||JSON.stringify(portable).includes('asset_')){$('save-project').click();return;}const data=new TextEncoder().encode(JSON.stringify(portable));if(data.length>100000)throw messageError("editor.projectIsTooLargeForALinkShareASavedProject");const hash='#tree='+btoa(Array.from(data,b=>String.fromCharCode(b)).join(''));await navigator.clipboard.writeText(location.origin+location.pathname+hash);notify(uiText("editor.configurationLinkCopiedRecipientsMayUseTheirOwnEditorURLRetaining"));}catch(e){notify(uiError(e));}};
$('support-project').onclick=openSupportDialog;
$('tool-help').onclick=()=>openUserHelp({onValidate:()=>window.open(pageHref('validate'),'_blank','noopener')});
let uvDrag=null,grabUV=false;
$('grab-uv').onclick=()=>{grabUV=!grabUV;if(grabUV&&panPreview)$('pan-preview').click();$('grab-uv').setAttribute('aria-pressed',String(grabUV));$('tree-canvas').style.cursor=grabUV?'grab':'';notify((grabUV ? uiText("editor.dragThePreviewToAdjustTheSelectedShapeSInternalUV") : uiText("editor.uvEditingEnded")));};
$('tree-canvas').onpointerdown=e=>{if(e.button!==0||!grabUV||tiled||busy||current().kind!=='shape')return;const n=current();if(animationEditMode==='normal'&&['uv.2','uv.3'].some(p=>n.tracks[p]&&!n.tracks[p].muted)){notify(uiText("editor.uvIsAnimatedEnableRecordingOrEditBaseValues"));return;}stopAnimation();uvDrag={id:selected,x:e.clientX,y:e.clientY,uv:[...animationClock(selected).node.uv],before:structuredClone(state),rect:$('tree-canvas').getBoundingClientRect()};$('tree-canvas').setPointerCapture(e.pointerId);};
$('tree-canvas').onpointermove=e=>{if(!uvDrag)return;const n=find(state.root,uvDrag.id)?.node;if(!n)return;try{assignAnimated(n,'uv.2',Math.max(-2,Math.min(2,uvDrag.uv[2]-(e.clientX-uvDrag.x)/uvDrag.rect.width)));assignAnimated(n,'uv.3',Math.max(-2,Math.min(2,uvDrag.uv[3]+(e.clientY-uvDrag.y)/uvDrag.rect.height)));requestRender();}catch(error){notify(uiError(error));}};
$('tree-canvas').onpointerup=e=>{if(!uvDrag)return;const before=uvDrag.before;uvDrag=null;if($('tree-canvas').hasPointerCapture?.(e.pointerId))$('tree-canvas').releasePointerCapture(e.pointerId);try{state=validatedState(state);if(JSON.stringify(before)!==JSON.stringify(state)){recordHistory(before);future=[];}persist();refresh();}catch(error){state=before;notify(uiError(error));refresh();}};
$('tree-canvas').onpointercancel=()=>{if(uvDrag){state=uvDrag.before;uvDrag=null;refresh();}};


$('collapse-library').onclick=()=>{const groups=[...$('shape-library').children].filter(e=>e.tagName==='DETAILS'),open=!groups.some(e=>e.open);groups.forEach(d=>{d.open=open;rememberLibraryGroup(d);});syncLibraryToggle();};

let panPreview=false,panStart=null;$('pan-preview').onclick=()=>{panPreview=!panPreview;if(panPreview&&grabUV)$('grab-uv').click();$('pan-preview').setAttribute('aria-pressed',String(panPreview));};
$('canvas-stage').addEventListener('pointerdown',e=>{if(!canvasMode()||!panPreview||grabUV)return;const stage=$('canvas-stage');panStart={x:e.clientX,y:e.clientY,left:stage.scrollLeft,top:stage.scrollTop};stage.setPointerCapture(e.pointerId);});
$('canvas-stage').addEventListener('pointermove',e=>{if(!panStart)return;const stage=$('canvas-stage');stage.scrollLeft=panStart.left+panStart.x-e.clientX;stage.scrollTop=panStart.top+panStart.y-e.clientY;});
$('canvas-stage').addEventListener('pointerup',()=>panStart=null);$('canvas-stage').addEventListener('pointercancel',()=>panStart=null);

// Batch operations share the same state transaction and undo entry as the inspector.
const groupSelected=el('button',{id:'group-selected',text:uiText("editor.groupSelection"),title:uiText("editor.ctrlCmdGGroupSelectedSiblings"),onclick:()=>edit(()=>{selected=groupSelection(state.root,selectedIds);})});
groupSelected.disabled=selected===state.root.id;$('wrap-top-level').after(groupSelected);
const selectionTools=el('div',{class:'tree-actions selection-tools'},[
 el('button',{text:uiText("editor.showSelected"),onclick:()=>edit(()=>{for(const n of selectedRoots())n.enabled=true;})}),
 el('button',{text:uiText("editor.hideSelected"),onclick:()=>edit(()=>{for(const n of selectedRoots())n.enabled=false;})}),
 el('span',{class:'tree-note',text:uiText("editor.ctrlMultiselectShiftRangeSelectDragReorder")})
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
 blocked:()=>!canvasMode()||busy||tiled||grabUV||panPreview,busy:()=>busy,leaveOtherTools:()=>{if(grabUV)$('grab-uv').click();if(panPreview)$('pan-preview').click();},
 select:setSelection,toggle:id=>multiSelect(id,{ctrlKey:true}),refresh,render:requestRender,notify,hit:canvasHit,
 pan:on=>{if(on){temporaryPan={pan:panPreview,uv:grabUV};if(!panPreview)$('pan-preview').click();}else{if(!temporaryPan?.pan&&panPreview)$('pan-preview').click();if(temporaryPan?.uv&&!grabUV)$('grab-uv').click();temporaryPan=null;panStart=null;}},
 check:(ids,paths)=>{for(const id of ids){const n=find(state.root,id).node;if(animationEditMode==='normal'&&n.animationEnabled!==false&&paths.some(key=>n.tracks['transform.'+key]&&!n.tracks['transform.'+key].muted))throw messageError("editor.selectedParametersAreAnimatedEnableRecordingOrEditBaseValues");}},
 begin:()=>{stopAnimation();canvasBefore=structuredClone(state);},
 apply:changes=>{
  // Validate every node before writing any, including limits enforced by loading.
  for(const {values}of changes)for(const [key,v]of Object.entries(values)){const limit=['x','y'].includes(key)?[-2,2]:key==='rotation'?[-3600,3600]:[0,1];if(!Number.isFinite(v)||v<limit[0]-1e-8||v>limit[1]+1e-8)throw messageError("editor.parameterBoundaryReachedDragCanceled");}
  for(const {id,values,progress}of changes){const n=find(state.root,id).node;for(const [key,v]of Object.entries(values)){const path='transform.'+key;if(animationEditMode==='record')recordValue(n,path,progress,v);else assignAnimated(n,path,v);}}
 },
 end:()=>{if(!canvasBefore)return;const before=canvasBefore;canvasBefore=null;try{state=validatedState(state);if(JSON.stringify(state)!==JSON.stringify(before)){recordHistory(before);if(history.length>60)history.shift();future=[];}persist();refresh();}catch(e){state=before;notify(uiError(e));refresh();}},
 cancel:()=>{if(canvasBefore){state=canvasBefore;canvasBefore=null;refresh();}}
});
for(const id of ['grab-uv','pan-preview'])$(id).addEventListener('click',()=>canvasEditor.deactivate());
requestRender();

// Native disclosures retain keyboard navigation; dismiss before opening dialogs.
installEditorDocking({onChange:()=>{sizePreview();requestRender();},onMessage:notify});
$('language-settings').before($('workspace-layout-menu'));
installHeaderToolbar();
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

installLanguageSelector($('language-settings'),{notify});
const updateDocumentationLink=()=>{const language=interfaceLanguage();$('detailed-help').href=documentationURL('README.md',language);$('github-repository').href=repositoryURL('https://github.com/BreezyMomo/MomoTextureForge',language);$('gitee-repository').href=repositoryURL('https://gitee.com/BreezyMomo/MomoTextureForge',language);};
updateDocumentationLink();
onLanguageChange(updateDocumentationLink);
onLanguageChange(()=>{groupSelected.textContent=uiText("editor.groupSelection");groupSelected.title=uiText("editor.ctrlCmdGGroupSelectedSiblings");["editor.showSelected","editor.hideSelected","editor.ctrlMultiselectShiftRangeSelectDragReorder"].forEach((label,i)=>selectionTools.children[i].textContent=uiText(label));refresh();animationEditor.update(true);});
