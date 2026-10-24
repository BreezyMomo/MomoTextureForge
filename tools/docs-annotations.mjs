import englishCallouts from './docs-callouts.en.json' with {type:'json'};
import {label,inLanguage,demoName} from './docs-language.mjs';
// Screenshot-only overlays. Targets are resolved from the real UI, never estimated pixels.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const css=(selector,label)=>({selector,label});
const role=(role,name,label=name)=>({role,name,label});
const field=(name,label=name)=>({field:name,label});
export const annotations={
 'canvas-toolbar':[css('#pan-preview','切换平移视图，缩小或适应窗口时也可拖动'),css('#zoom','只调整观看缩放'),css('#reset-canvas-view','适应窗口并重新居中'),css('#canvas-display-menu>summary','设置背景、轴心和节点区域'),css('#canvas-tile-menu>summary','选择平铺检查数量')].map(spec=>({...spec,numberOnly:true})),
 'canvas-ratio':[{...css('#quick-canvas-aspect select','从预览顶部修改画布比例'),side:'right'},field(label('canvas.aspectWidth'),'输入宽度比例'),field(label('canvas.aspectHeight'),'输入高度比例'),role('button',label('canvas.applyAspect'),'应用比例，不修改节点参数')].map(spec=>({...spec,numberOnly:true})),
 'node-shortcuts':[css('#inspector>[data-module="editor.opacity"]>summary .module-pin','图钉将模块固定到当前节点'),css('.shortcut-scope-menu','选择当前节点或全部节点适用'),css('.node-shortcuts','直接编辑选中节点的快捷参数')].map(spec=>({...spec,numberOnly:true})),
 'channel-curves-dialog':[css('.node-curves-dialog>header','拖动标题栏移动窗口，方向键也可移动'),css('.node-curves-dialog .channel-curve-graph','在网格中添加和拖动控制点'),field(label('curves.preset'),'选择通道曲线预设')].map(spec=>({...spec,numberOnly:true})),
 'ribbon-parameters':[css('#tree-preview-surface','用宽画布预览透明拖尾纹理'),field(label('ribbon.stylePreset'),'先选择拖尾风格预设'),css('#inspector>[data-module="modules.shapeParameters"] .tree-number-field','继续调整图形专属参数')].map(spec=>({...spec,numberOnly:true})),
 'appearance-settings':[css('#appearance-theme','选择完整主题'),css('#appearance-styles','选择控件样式'),css('#appearance-density','调整界面密度'),css('#appearance-colors>summary','展开高级设置，自定义颜色'),css('.appearance-dialog [data-save]','保存当前浏览器的外观偏好'),css('#appearance-tabs','单独选择页签样式'),css('.appearance-palette-strip','查看颜色对应的界面用途')].map(spec=>({...spec,numberOnly:true})),
 'bezier-editor':[css('.bezier-editor-dialog .bezier-editor-toolbar button:nth-child(3)','适应全部控制点，滚轮缩放、拖拽空白平移'),css('.bezier-editor-dialog .bezier-editor-actions button:first-child','插入锚点细分当前曲线，也可从末端延伸'),css('.bezier-editor-dialog .bezier-editor-coordinates input:first-child','选中锚点或控制柄后精确输入坐标')].map(spec=>({...spec,numberOnly:true})),
 'seamless-overflow':[field(label('editor.boundary'),'外层组合选择无缝重复'),role('button',label('editor.tilePreview'),'检查四边及四角接续'),field(label('editor.tilePreviewLayout'),'选择2×2、3×3或4×4'),role('button',label('editor.select')+demoName('跨边界星光'),'子级可单独允许超出')].map(s=>({...s,numberOnly:true})),
 'content-overflow':[role('button',label('editor.select')+demoName('右侧：允许超出'),'选中允许超出的组合'),field(label('editor.boundary'),'切换三种边界模式'),css('#canvas-controls .canvas-region.active','蓝框保留逻辑区域')].map(s=>({...s,numberOnly:true})),
 'puzzle-piece':[field(label('editor.connectorStyle'),'选择四种接口造型'),field(label('editor.connectorRoundness'),'调节接口弯曲形状'),field(inLanguage('上边','Top edge'),'单独设置四边凹凸')].map(s=>({...s,numberOnly:true})),
 'puzzle-corners':[field(inLanguage('左上圆角','Top left rounding'),'左上角：0为直角'),field(inLanguage('右上圆角','Top right rounding'),'右上角圆角大小'),field(inLanguage('右下圆角','Bottom right rounding'),'右下角圆角大小'),field(inLanguage('左下圆角','Bottom left rounding'),'左下角圆角大小')].map(s=>({...s,numberOnly:true})),
 'puzzle-grid':[field(label('editor.arrangement'),'使用现成网格排列'),field(label('editor.gridColumns'),'设置列数'),field(label('editor.gridRows'),'设置行数')].map(s=>({...s,numberOnly:true})),
 workspace:[css('#open-graphics-library','打开图形库'),css('#node-tree','选择节点'),css('#preview-channel','切换贴图类型'),css('#inspector-tabs','编辑选中节点')],
 'inspector-modules':[css('#inspector [data-module="modules.shapeParameters"]>summary>.inspector-module-heading','图形专属参数集中在一个模块'),{...css('#inspector [data-module="modules.shapeParameters"]>summary .inspector-module-help','悬停问号查看说明'),side:'left'},css('#inspector [data-module="editor.shapeUV"]>summary','点击标题展开或折叠 UV'),css('#inspector [data-module="modules.shapeParameters"]>summary .module-drag-handle','拖动手柄调整模块顺序')].map(spec=>({...spec,numberOnly:true})),
 'inspector-layout-modules':[css('#inspector [data-module="editor.nodeRegion"]>summary','通用区域设置可独立折叠'),css('#inspector [data-module="editor.contentArrangement"]>summary','排列参数模块'),{...css('#inspector [data-module="editor.contentArrangement"]>summary .inspector-module-help','说明默认收起，按需查看'),side:'left'}].map(spec=>({...spec,numberOnly:true})),
 'node-rename':[css('.tree-node-rename','双击名称或按 F2 改名，Enter 保存、Esc 取消'),css('.tree-node-delete','垃圾桶删除该行节点，支持撤销')].map(spec=>({...spec,numberOnly:true})),
 'node-auto-group':[css('.node-group-preview-heading','虚拟组合，尚未修改作品'),css('.node-group-preview-reason','说明只有组合可以包含普通子节点'),css('.node-group-preview-child','预览要放入组合的节点'),css('.node-group-preview p:last-child','松开创建组合，移开或 Esc 取消')].map(spec=>({...spec,numberOnly:true,side:'right'})),
 'color-collapsed':[css('#inspector-tabs','图形与颜色共用图形页签'),css('#inspector [data-module="editor.nodeColors"]>summary','展开节点颜色模块')].map(spec=>({...spec,side:'left',numberOnly:true})),
 'color-inheritance':[field(label('editor.colorSource'),'下拉选择继承或自定义配色'),role('button',label('editor.useIndependentColors'),'复制当前配色以独立修改'),role('button',label('editor.goToColorSource'),'前往父级配色来源')].map(spec=>({...spec,side:'left',numberOnly:true})),
 'color-gradient':[css('.gradient-ramp','点击渐变条添加色标，拖拽色标调整位置'),field(label('gradient.selectedHex'),'修改选中色标的颜色'),field(label('gradient.presets'),'选择内置渐变预设')].map(spec=>({...spec,side:'left',numberOnly:true})),
 'color-levels':[css('#inspector [data-module="modules.levels"]>summary>.inspector-module-heading','展开色阶调整黑白场、伽马和输出范围'),field(label('ui.gamma'),'调整伽马'),field(label('editor.invertPattern'),'反转节点的明暗与高度值')].map(spec=>({...spec,side:'left',numberOnly:true})),
 'color-solid':[field(label('editor.colorSource'),'选择节点配色来源'),css('.color-choice-field .segmented-choice','选择纯色或渐变'),field(label('editor.fillColor')+' HEX','输入十六进制颜色')].map(spec=>({...spec,side:'left',numberOnly:true})),
 'workspace-docking':[css('[data-panel-tab="library"]','拖动面板名称标签'),css('.dock-split-x > .dock-splitter','拖动分隔线调整宽度'),css('#workspace-layout-menu > summary','布局菜单')],
 'workspace-floating':[role('button',label('layout.moveFloatingWindow'),'拖动握柄移动'),role('button',label('layout.resizeFloatingWindow'),'拖动角标缩放'),css('.dock-floating [data-panel-tab="inspector"]','拖动标签重新停靠')].map(spec=>({...spec,numberOnly:true})),
 'workspace-layout-menu':[field(label('layout.layoutName'),'填写布局名称'),role('button',label('layout.saveCurrentLayout'),'命名保存当前布局'),field(inLanguage('显示参数面板','Show Inspector'),'勾选找回关闭的面板'),role('button',label('layout.restoreDefaultLayout'),'恢复初始布局')].map(spec=>({...spec,side:'left'})),
 'transform-region':[role('button',label('inspector.transformLayout'),'切换排列面板'),field(label('editor.regionWidth'),'节点占用区域')],
 arrangement:[field(label('editor.arrangement'),'选择排列方式'),field(label('ui.outermostRingCount'),'设置星光数量'),field(label('editor.instanceSize'),'设置每份图形尺寸')],
 compositing:[css('#inspector .post-effects-add','打开效果选择器，连续添加效果'),css('#inspector [data-effect="bloom"] .post-effect-more','查看说明、复位或移出效果并保留设置'),css('#inspector [data-effect="bloom"] [data-parameter-path="postFx.1"] input[type="number"]','调整当前节点的泛光强度'),css('#inspector [data-effect="noiseWarp"] .post-effect-grip','拖动效果手柄调整执行顺序')].map(spec=>({...spec,numberOnly:true})),
 'post-effect-picker':[css('.post-effect-picker input[type="search"]','按名称或用途搜索效果'),css('.post-effect-picker-filters select','按效果类别筛选'),css('[data-effect-choice="blur"] .post-effect-choice-image','拖动分隔线对照原图和效果'),css('[data-effect-choice="blur"]>button','添加效果，保留节点已有设置')].map(spec=>({...spec,numberOnly:true})),
 'project-files':[{...css('#open-project','打开项目文件'),side:'right'},{...css('#save-project','保存可编辑项目'),side:'right'},css('#export-now','导出成品图片')],
 'graphics-library':[{placeholder:label('library.searchNamesCategoriesOrTags'),label:'搜索资源'},role('button',label('library.addDirectlyToCanvas'),'直接添加到画布'),role('button',label('library.addToGraphicsList'),'加入常用列表'),css('.graphics-card-details>summary','展开详情与资源管理')].map(spec=>({...spec,numberOnly:true,corner:true})),
 'parameter-states':[css('#inspector .parameter-state-badge','参数当前由动画控制'),role('button',label('editor.recordChanges'),'修改当前时刻的关键帧'),role('button',label('editor.editBaseValue'),'编辑基础值')].map(spec=>({...spec,numberOnly:true})),
 'selection-editing':[css('#node-tree','Ctrl/Cmd 多选节点'),css('#inspector-tabs','多选保留原来的页签'),field(label('selection.batch')+label('editor.positionX'),'多个值可统一修改'),css('.selection-align-actions','对齐与等距分布')].map(spec=>({...spec,numberOnly:true})),
 'selection-colors':[role('button',label('inspector.shape'),'在图形页签统一编辑颜色'),field(label('selection.batch')+label('selection.opacity'),'批量调整透明度'),field(label('selection.batch')+label('editor.colorSource'),'选择自定义或继承配色'),field(label('selection.batch')+label('editor.fillColor')+' HEX','只统一修改填充颜色')].map(spec=>({...spec,numberOnly:true})),
 'selection-shape':[css('#node-tree','选择同一种图形'),role('button',label('inspector.shape'),'进入图形页签'),field(inLanguage('批量半径','Batch Radius'),'不同半径显示多个值'),field(inLanguage('批量环线宽','Batch Ring line width'),'批量修改圆环线宽')].map(spec=>({...spec,numberOnly:true})),
 'generator-parameters':[field(label('library.previewTimeSeconds'),'拖动时间查看运动'),css('.graphic-preview-panel canvas','观察生成结果'),role('button',label('library.saveAsNewGraphic'),'保存自己的版本')],
 'graphics-list':[css('#shape-search','搜索常用列表'),css('#library-filter','切换全部、收藏、最近或动态'),css('#library-categories','多选图形分类'),css('#shape-library .tree-pattern-card>button:nth-of-type(2)','添加实例到画布')].map(spec=>({...spec,numberOnly:true})),
 'image-import':[field(label('library.resourceName'),'填写资源名称'),field(label('library.imageFile'),'选择图片文件'),css('.graphic-preview-panel canvas','检查预览')],
 'image-background':[field(label('library.processingMode'),'选择去背景方式'),field(label('editor.backgroundColor'),'指定要去除的颜色'),css('.graphic-preview-panel canvas','用棋盘格确认透明')],
 'formula-editor':[role('tab',label('editor.formula'),'选择公式类型'),field(label('library.glslFormula'),'输入公式代码')],
 'formula-validate':[role('button',label('library.validatePreview'),'验证输入的公式'),role('button',label('library.importIntoLibrary'),'确认后保存到图库')],
 'generator-editor':[field(label('generator.generatorJSON'),'粘贴生成器定义'),css('section:not([hidden]) .graphic-preview-panel canvas','检查实时预览')],
 'generator-validate':[role('button',label('library.validatePreview'),'验证并生成参数'),role('button',label('library.importIntoLibrary'),'保存生成器资源')],
 'resource-import':[role('tab',label('library.importFiles'),'切换导入页'),css('dialog.resource-create-dialog input[type="file"]','选择创作文件或资源包')],
 'animation-keyframes':[css('#tree-time','选择录制时刻'),role('button',label('editor.parameterMode')+label('editor.record'),'打开或关闭录制'),field(label('editor.regionWidth'),'修改要录制的参数')],
 'animation-curves':[role('button',label('timeline.curves'),'切换曲线视图'),css('#node-animation-editor svg','查看参数变化曲线')],
 'height-preview':[css('#preview-channel','贴图类型选择高度')],
 'normal-preview':[css('#preview-channel','贴图类型选择法线'),field(label('editor.normalStrength'),'调整凹凸强度'),field(label('editor.normalAlgorithm'),'选择法线算法')],
 'material-preview':[css('#preview-mode','切换三维材质'),field(label('material.previewMesh'),'选择球体或平面'),css('#material-preview','拖动旋转检查受光')],
 'effect-preview':[css('#preview-mode','切换特效预览'),field(label('effect.effectBackground'),'切换深浅背景'),field(label('effect.effectBlending'),'对比透明与相加混合'),css('#tree-time','播放或定位动画')].map(spec=>({...spec,numberOnly:true})),
 'export-png':[field(label('editor.exportFormat'),'选择 PNG 当前帧'),field(label('editor.outputChannel'),'选择颜色或法线'),css('#confirm-export','开始导出')],
 'export-atlas':[field(label('editor.exportFormat'),'选择序列帧图集'),field(label('editor.framesPerSecondFPS'),'设置帧率'),field(label('export.durationSeconds'),'设置序列时长'),field(label('editor.atlasColumns'),'设置图集排布')],
 'atlas-preview':[{...role('img',label('editor.fullCanvasAtlasPreview'),'首帧'),portion:[0,0,.25,.25]},{...role('img',label('editor.fullCanvasAtlasPreview'),'末帧'),portion:[.75,.75,.25,.25]}],
 'export-vector':[field(label('editor.exportFormat'),'选择矢量轮廓格式'),css('#confirm-export','导出前检查轮廓设置')],
 'remote-libraries':[field(label('subscription.newLibraryName'),'填写订阅名称'),field(label('subscription.remoteCatalogURL'),'填写 index.json 地址'),role('button',label('subscription.addSubscription'),'添加图库订阅')],
 'ai-catalog':[field(label('library.exportScope'),'选择目录范围'),role('button',label('library.generateCatalog'),'生成可提供给 AI 的目录'),field(label('library.aiGraphicsCatalogJSON'),'复制目录内容')],
 'help-menu':[css('#tool-help','内置使用说明'),css('#detailed-help','README 与图文教程'),css('#ai-tools','AI 工具与 Skill 安装'),css('#gitee-repository','国内仓库与文档'),css('#support-project','微信扫码赞赏')].map(spec=>({...spec,...(spec.selector==='#support-project'?{numberOnly:true,corner:true}:{side:'left'})})),
 'library-manager':[css('.toolbar .file-button','导入已有资源'),role('button',inLanguage('编辑信息','Edit metadata'),'编辑资源目录信息')],
 'library-manager-edit':[css('#edit-dialog input','修改资源名称'),role('button',inLanguage('保存信息','Save metadata'),'保存目录信息')],
 'vfx-presets':[field(label('ui.exampleCategory'),'选择素材预设分类'),role('link',label('ui.editOnCanvas'),'在画布中编辑素材预设')],
 'composition-examples':[role('link',label('ui.editOnCanvas'),'打开可编辑的组合示例')],
 'arrangement-examples':[field(label('ui.exampleCategory'),'筛选新增排列'),role('link',label('ui.editOnCanvas'),'打开排列示例')],
};

export async function syncScreenshotCaptions(root,language='zh-CN',imageNames=null){
 const english=language==='en',suffix=english?'.en.md':'.md';
 const files=['README'+suffix,...(await readdir(resolve(root,'docs'))).filter(f=>f.endsWith(suffix)&&(english||!f.endsWith('.en.md'))).map(f=>'docs/'+f)];
 for(const file of files){
  const path=resolve(root,file),source=await readFile(path,'utf8');
  const text=source.replace(/\r\n/g,'\n').replace(/^(!\[[^\]]*\]\((?:docs\/)?images\/(?:en\/)?([^/)]+)\.png\))(?:\n\n> (?:图中标记：|Callouts?: )[^\n]*)?/gm,(all,image,name)=>{
   if(!annotations[name]||(imageNames&&!imageNames.has(name)))return all;
   const labels=english?englishCallouts[name]:annotations[name].map(a=>a.label);
   if(!labels||labels.length!==annotations[name].length)throw Error('Missing callout translations: '+name);
   return image+'\n\n'+(english?'> Callouts: ':'> 图中标记：')+labels.map((label,i)=>(i+1)+' '+label).join(english?'; ':'；')+(english?'.':'。');
  });
  if(text!==source.replace(/\r\n/g,'\n'))await writeFile(path,text);
 }
}

export async function markScreenshot(page,name,clip=null,language='zh-CN'){
 const specs=annotations[name]?.map((spec,i)=>({...spec,label:language==='en'?englishCallouts[name]?.[i]:spec.label}));if(!specs?.length)throw Error('Missing screenshot annotations: '+name);
 const view=page.viewportSize(),bounds=clip??{x:0,y:0,...view},boxes=[];
 for(const spec of specs){
  let locator=spec.selector?page.locator(spec.selector):spec.role?page.getByRole(spec.role,{name:spec.name,exact:true}):spec.field?page.getByLabel(spec.field,{exact:true}).and(page.locator('input,select,textarea')):page.getByPlaceholder(spec.placeholder,{exact:true});
  let box;
  for(const item of await locator.all()){if(await item.isVisible()){const candidate=await item.boundingBox();if(candidate&&candidate.x<bounds.x+bounds.width&&candidate.y<bounds.y+bounds.height&&candidate.x+candidate.width>bounds.x&&candidate.y+candidate.height>bounds.y){box=candidate;break;}}}
  if(!box)throw Error('Screenshot target not visible: '+name+' / '+spec.label);
  if(spec.portion){const [x,y,w,h]=spec.portion;box={x:box.x+box.width*x,y:box.y+box.height*y,width:box.width*w,height:box.height*h};}
  const x=Math.max(box.x,bounds.x+2),y=Math.max(box.y,bounds.y+2);
  boxes.push({...spec,x,y,width:Math.min(box.x+box.width,bounds.x+bounds.width-2)-x,height:Math.min(box.y+box.height,bounds.y+bounds.height-2)-y});
 }
 await page.evaluate(({boxes,bounds})=>{
  document.getElementById('docs-annotation-overlay')?.remove();
  const host=document.createElement('div');host.id='docs-annotation-overlay';host.style.cssText='position:fixed;inset:0;z-index:2147483647;pointer-events:none;font:600 14px system-ui';
  for(const [index,box]of boxes.entries()){
   const frame=document.createElement('div');frame.style.cssText=`position:absolute;box-sizing:border-box;left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;border:2px solid #ffcf66;border-radius:4px;box-shadow:0 0 0 1px #1119`;
   const label=document.createElement('span');label.textContent=box.numberOnly?String(index+1):(index+1)+'  '+box.label;
   const labelWidth=box.numberOnly?28:Math.min(340,[...box.label].reduce((width,c)=>width+(c.charCodeAt(0)>255?15:8),42));let left=Math.min(Math.max(bounds.x+3,box.x),bounds.x+bounds.width-labelWidth-3);
   let top=box.y-27;if(top<bounds.y+2)top=box.y+box.height+3;if(top+25>bounds.y+bounds.height)top=bounds.y+bounds.height-27;
   if(box.side==='left'){left=box.x-labelWidth-14;top=box.y+box.height/2-13;label.textContent+=' →';}
   if(box.side==='right'){left=box.x+box.width+14;top=box.y+box.height/2-13;label.textContent='← '+label.textContent;}
   if(box.corner){left=box.x-12;top=box.y-12;}
   left=Math.max(bounds.x+3,Math.min(left,bounds.x+bounds.width-labelWidth-3));
   label.style.cssText=`position:absolute;left:${left}px;top:${top}px;max-width:340px;white-space:nowrap;background:#ffcf66;color:#171a20;padding:3px 7px;border-radius:4px;box-shadow:0 1px 5px #0009;line-height:20px`;
   host.append(frame,label);
  }
  const dialogs=[...document.querySelectorAll('dialog[open]')];(dialogs.at(-1)??document.body).append(host);
 },{boxes,bounds});
 return ()=>page.evaluate(()=>document.getElementById('docs-annotation-overlay')?.remove());
}
