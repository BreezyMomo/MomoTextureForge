// Screenshot-only overlays. Targets are resolved from the real UI, never estimated pixels.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const css=(selector,label)=>({selector,label});
const role=(role,name,label=name)=>({role,name,label});
const field=(name,label=name)=>({field:name,label});
export const annotations={
 'seamless-overflow':[field('边界处理','外层组合选择无缝重复'),role('button','平铺检查','检查四边及四角接续'),field('平铺检查布局','选择2×2、3×3或4×4'),role('button','选择 跨边界星光','子级可单独允许超出')].map(s=>({...s,numberOnly:true})),
 'content-overflow':[role('button','选择 右侧：允许超出','选中允许超出的组合'),field('边界处理','切换三种边界模式'),css('#canvas-controls .canvas-region.active','蓝框保留逻辑区域')].map(s=>({...s,numberOnly:true})),
 'puzzle-piece':[field('接口样式','选择四种接口造型'),field('接口圆润度','调节接口弯曲形状'),field('上边','单独设置四边凹凸')].map(s=>({...s,numberOnly:true})),
 'puzzle-corners':[field('左上圆角','左上角：0为直角'),field('右上圆角','右上角圆角大小'),field('右下圆角','右下角圆角大小'),field('左下圆角','左下角圆角大小')].map(s=>({...s,numberOnly:true})),
 'puzzle-grid':[field('排列方式','使用现成网格排列'),field('网格列数','设置列数'),field('网格行数','设置行数')].map(s=>({...s,numberOnly:true})),
 workspace:[css('#open-graphics-library','打开图形库'),css('#node-tree','选择节点'),css('#preview-channel','切换贴图类型'),css('#inspector-tabs','编辑选中节点')],
 'color-collapsed':[{...role('button','展开颜色快捷区','点击展开颜色与透明度'),side:'left'}],
 'color-inheritance':[css('#inspector-color-quick','常驻颜色快捷区'),css('.color-quick-actions','独立修改或前往来源')].map(spec=>({...spec,side:'left'})),
 'color-gradient':[role('button','颜色','独立颜色页签'),field('亮部颜色 HEX','输入渐变端点颜色'),css('.color-preset-grid','直接选配色预设')].map(spec=>({...spec,side:'left'})),
 'color-solid':[{...field('快捷填充颜色','跨页签直接改颜色'),side:'left'},{...field('着色方式','选择纯色或渐变'),side:'left'},field('填充颜色 HEX','输入十六进制颜色')],
 'workspace-docking':[css('[data-panel-tab="library"]','拖动面板名称标签'),css('.dock-split-x > .dock-splitter','拖动分隔线调整宽度'),css('#workspace-layout-menu > summary','布局菜单')],
 'workspace-floating':[role('button','移动悬浮窗口','拖动握柄移动'),role('button','调整悬浮窗口大小','拖动角标缩放'),css('.dock-floating [data-panel-tab="inspector"]','拖动标签重新停靠')],
 'workspace-layout-menu':[field('布局名称','填写布局名称'),role('button','保存当前布局','命名保存当前布局'),field('显示参数面板','勾选找回关闭的面板'),role('button','恢复默认布局','恢复初始布局')].map(spec=>({...spec,side:'left'})),
 'transform-region':[role('button','变换/排列','切换排列面板'),field('区域宽','节点占用区域')],
 arrangement:[field('排列方式','选择排列方式'),field('最外圈数量','设置星光数量'),field('实例尺寸','设置每份图形尺寸')],
 compositing:[field('Bloom 强度','调整泛光强度'),field('Bloom 半径','调整泛光范围')],
 'project-files':[{...css('#open-project','打开项目文件'),side:'right'},{...css('#save-project','保存可编辑项目'),side:'right'},css('#export-now','导出成品图片')],
 'graphics-library':[{placeholder:'搜索名称、分类或标签',label:'搜索资源'},role('button','直接添加到画布','直接添加到画布'),role('button','添加到图形列表','加入常用列表'),role('button','编辑 蓬松烟团','编辑资源')],
 'parameter-states':[css('#inspector .parameter-state-badge','参数当前由动画控制'),role('button','录制修改','修改当前时刻的关键帧'),role('button','编辑基础值','编辑基础值')].map(spec=>({...spec,numberOnly:true})),
 'selection-editing':[css('#node-tree','Ctrl/Cmd 多选节点'),css('#inspector-tabs','多选保留原来的页签'),field('批量位置 X','多个值可统一修改'),css('.selection-align-actions','对齐与等距分布')].map(spec=>({...spec,numberOnly:true})),
 'selection-colors':[role('button','颜色','进入颜色页签'),field('批量透明度（%）','批量调整透明度'),field('批量配色','选择自定义或继承配色'),field('批量填充颜色 HEX','只统一修改填充颜色')].map(spec=>({...spec,numberOnly:true})),
 'selection-shape':[css('#node-tree','选择同一种图形'),role('button','图形','进入图形页签'),field('批量半径','不同半径显示多个值'),field('批量环线宽','批量修改圆环线宽')].map(spec=>({...spec,numberOnly:true})),
 'generator-parameters':[field('预览时间（秒）','拖动时间查看运动'),css('.graphic-preview-panel canvas','观察生成结果'),role('button','保存为新图形','保存自己的版本')],
 'graphics-list':[css('#shape-search','搜索常用列表'),role('button','添加 湍流火焰','添加实例到画布')],
 'image-import':[field('资源名称','填写资源名称'),field('图片文件','选择图片文件'),css('.graphic-preview-panel canvas','检查预览')],
 'image-background':[field('处理方式','选择去背景方式'),field('背景颜色','指定要去除的颜色'),css('.graphic-preview-panel canvas','用棋盘格确认透明')],
 'formula-editor':[role('tab','公式','选择公式类型'),field('GLSL 公式','输入公式代码')],
 'formula-validate':[role('button','验证并预览','验证输入的公式'),role('button','导入图形库','确认后保存到图库')],
 'generator-editor':[field('生成器JSON','粘贴生成器定义'),css('section:not([hidden]) .graphic-preview-panel canvas','检查实时预览')],
 'generator-validate':[role('button','验证并预览','验证并生成参数'),role('button','导入图形库','保存生成器资源')],
 'resource-import':[role('tab','导入文件','切换导入页'),css('dialog.resource-create-dialog input[type="file"]','选择创作文件或资源包')],
 'animation-keyframes':[css('#tree-time','选择录制时刻'),role('button','参数模式 ● 录制','打开或关闭录制'),field('区域宽','修改要录制的参数')],
 'animation-curves':[role('button','曲线','切换曲线视图'),css('#node-animation-editor svg','查看参数变化曲线')],
 'height-preview':[css('#preview-channel','贴图类型选择高度')],
 'normal-preview':[css('#preview-channel','贴图类型选择法线'),field('法线强度','调整凹凸强度'),field('法线算法','选择法线算法')],
 'material-preview':[css('#preview-mode','切换三维材质'),field('预览模型','选择球体或平面'),css('#material-preview','拖动旋转检查受光')],
 'effect-preview':[css('#preview-mode','切换特效预览'),field('特效预览背景','切换深浅背景'),field('特效预览混合','对比透明与相加混合'),css('#tree-time','播放或定位动画')].map(spec=>({...spec,numberOnly:true})),
 'export-png':[field('导出类型','选择 PNG 当前帧'),field('输出内容','选择颜色或法线'),css('#confirm-export','开始导出')],
 'export-atlas':[field('导出类型','选择序列帧图集'),field('每秒帧数（FPS）','设置帧率'),field('播放秒数','设置序列时长'),field('图集列数','设置图集排布')],
 'atlas-preview':[{...role('img','完整画布图集预览','首帧'),portion:[0,0,.25,.25]},{...role('img','完整画布图集预览','末帧'),portion:[.75,.75,.25,.25]}],
 'export-vector':[field('导出类型','选择矢量轮廓格式'),css('#confirm-export','导出前检查轮廓设置')],
 'remote-libraries':[field('新图库名称','填写订阅名称'),field('远程目录地址','填写 index.json 地址'),role('button','添加订阅','添加图库订阅')],
 'ai-catalog':[field('导出范围','选择目录范围'),role('button','生成目录','生成可提供给 AI 的目录'),field('AI图形目录JSON','复制目录内容')],
 'help-menu':[css('#tool-help','内置使用说明'),css('#detailed-help','README 与图文教程'),css('#download-author-skill','下载创作 Skill'),css('#gitee-repository','国内仓库与文档'),css('#support-project','微信扫码赞赏')].map(spec=>({...spec,side:'left'})),
 'library-manager':[role('button','导入资源 ZIP','导入已有资源'),role('button','编辑信息','编辑资源目录信息')],
 'library-manager-edit':[css('#edit-dialog input','修改资源名称'),role('button','保存信息','保存目录信息')],
 'composition-examples':[role('link','在画布中编辑','打开可编辑的组合示例')],
 'arrangement-examples':[field('示例分类','筛选新增排列'),role('link','在画布中编辑','打开排列示例')],
};

export async function syncScreenshotCaptions(root){
 const files=['README.md',...(await readdir(resolve(root,'docs'))).filter(f=>f.endsWith('.md')).map(f=>'docs/'+f)];
 for(const file of files){
  const path=resolve(root,file),source=await readFile(path,'utf8');
  const text=source.replace(/\r\n/g,'\n').replace(/(> 图中标记：[^\n]*)(?:\n\n\1)+/g,'$1').replace(/^(!\[[^\]]*\]\((?:docs\/)?images\/([^/)]+)\.png\))(?:\n\n> 图中标记：[^\n]*)?/gm,(all,image,name)=>annotations[name]?image+'\n\n> 图中标记：'+annotations[name].map((a,i)=>(i+1)+' '+a.label).join('；')+'。':all);
  if(text!==source)await writeFile(path,text);
 }
}

export async function markScreenshot(page,name,clip=null){
 const specs=annotations[name];if(!specs?.length)throw Error('Missing screenshot annotations: '+name);
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
   const labelWidth=box.numberOnly?28:Math.min(240,box.label.length*15+35);let left=Math.min(Math.max(bounds.x+3,box.x),bounds.x+bounds.width-labelWidth-3);
   let top=box.y-27;if(top<bounds.y+2)top=box.y+box.height+3;if(top+25>bounds.y+bounds.height)top=bounds.y+bounds.height-27;
   if(box.side==='left'){left=box.x-labelWidth-14;top=box.y+box.height/2-13;label.textContent+=' →';}
   if(box.side==='right'){left=box.x+box.width+14;top=box.y+box.height/2-13;label.textContent='← '+label.textContent;}
   label.style.cssText=`position:absolute;left:${left}px;top:${top}px;max-width:240px;white-space:nowrap;background:#ffcf66;color:#171a20;padding:3px 7px;border-radius:4px;box-shadow:0 1px 5px #0009;line-height:20px`;
   host.append(frame,label);
  }
  const dialogs=[...document.querySelectorAll('dialog[open]')];(dialogs.at(-1)??document.body).append(host);
 },{boxes,bounds});
 return ()=>page.evaluate(()=>document.getElementById('docs-annotation-overlay')?.remove());
}
