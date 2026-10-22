import manual from './effects-kit-runtime.js';
const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
const quickStart=`# 快速上手

1. 点右上角“图形库”，搜索或浏览图形，勾选后添加到图形列表。
2. 在左侧图形列表点“＋ 添加”，图形才会成为画布上的节点实例。
3. 选中节点，直接在右侧顶部改颜色，或进入“颜色”页签设置渐变；Ctrl/Cmd多选后仍用原来的五个页签批改共有参数，同一种图形也可批改专属参数。“变换/排列”提供对齐和等距分布，“编辑主选节点”用于单独调整关键帧与曲线。
4. 需要动画时先完成静态造型，再开启录制、移动进度并调整参数，关闭录制后播放检查。
5. 点“文件 → 保存项目”备份可继续编辑的画布；点“导出…”制作PNG、SVG、PSD或序列帧等交付文件。

## 三个重要区别

- 图形库是资源来源；图形列表是当前画布加载的副本；画布节点是正在编辑的实例。修改实例不会自动修改图库。
- 查看缩放、单独预览和棋盘格是观察工具；导出尺寸、透明背景等要在导出面板设置。
- 空间无缝重复、关键帧时间循环和内置time动画是不同机制。勾选循环不代表首尾已衔接。

## 从图片生成法线

1. 将图片添加到画布，保留“原色与透明度”显示。图片亮度会作为高度，亮处高、暗处低。
2. 在合成预览标题旁，将“贴图类型”切换为“法线”，调整下方生成参数。
3. “预览模式”选二维查看蓝紫色法线图，选三维查看中性材质上的凹凸受光。
4. 导出时单独选择“输出内容 → 法线”；查看法线不会自动改变导出内容。

## 怎么使用本说明

顶部“布局”可恢复默认、切换动画布局或专注画布。拖动面板标签到边缘拆分、到中央合并标签；“↗”在网页内悬浮，分隔线可调整比例。关闭的面板可在布局菜单勾选恢复；当前布局自动保存，也可命名保存多套。布局不改变画布内容，详见“界面与资源管理”。

从左侧目录选择主题，或搜索功能、参数、现象，例如“遮罩”“循环”“SVG”“颜色”。每章讲操作入口、效果和注意事项；效果配方给出起始设置，实际结果需根据画布微调。

主界面右上角“帮助 → 下载创作Skill”帮助外部AI制作公式/SVG/位图；“帮助 → 下载效果指导Skill”让AI根据你的目标讲解操作步骤。两个Skill均不会在本工具中接入AI服务。

## 在线访问统计

正式 GitHub Pages 和 WorkBuddy 在线版使用百度统计记录基础访问量；百度会处理统计所需的网络、浏览器信息与访客标识。页面浏览记录使用固定路径，不包含画布分享参数或 sharecode，不主动提交作品名称、图片或节点内容，也不开启自动点击采集。离线版、本地开发和其他域名部署不加载统计代码。
`;
export const HELP_SECTIONS=[
 ['start','快速上手',quickStart],
 ['workspace','界面与资源管理',manual['references/workspace.md']],
 ['layout','排列与合成',manual['references/layout-compositing.md']],
 ['animation','动画与导出',manual['references/animation-export.md']],
 ['image','资源创建与图片处理',manual['references/image-editor.md']],
 ['recipes','效果配方与排错',manual['references/recipes.md']]
].map(([id,title,body])=>({id,title,body}));
// Render only the small Markdown subset used by our bundled manual. All text
// goes through textContent; no HTML from documentation is executed.
function renderManual(host,text){
 host.replaceChildren();const lines=text.split('\n');let list=null;
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line){list=null;continue;}
  const heading=/^(#{1,3}) (.+)$/.exec(line);
  if(heading){host.append(el('h'+Math.min(3,heading[1].length+1),heading[2]));list=null;continue;}
  if(line.startsWith('|')&&/^\|[\s:|-]+\|$/.test(lines[i+1]?.trim()??'')){
   const wrap=el('div');wrap.className='help-table';const table=el('table'),head=el('thead'),body=el('tbody');
   const row=(value,tag)=>{const tr=el('tr');for(const cell of value.split('|').slice(1,-1))tr.append(el(tag,cell.trim()));return tr;};
   head.append(row(line,'th'));i+=2;for(;i<lines.length&&lines[i].trim().startsWith('|');i++)body.append(row(lines[i].trim(),'td'));i--;
   table.append(head,body);wrap.append(table);host.append(wrap);list=null;continue;
  }
  const item=/^(- |\d+\. )(.+)$/.exec(line);
  if(item){const tag=item[1].startsWith('-')?'ul':'ol';if(!list||list.tagName.toLowerCase()!==tag){list=el(tag);host.append(list);}list.append(el('li',item[2]));continue;}
  list=null;host.append(el('p',line));
 }
}
export function openUserHelp({onValidate}={}){
 const existing=document.querySelector('.user-help-dialog');if(existing){existing.focus();return;}
 const dialog=el('dialog'),header=el('header'),title=el('h2','使用说明'),close=el('button','关闭'),search=el('input'),layout=el('div'),nav=el('nav'),article=el('article'),status=el('p');
 dialog.className='user-help-dialog';dialog.setAttribute('aria-labelledby','user-help-title');title.id='user-help-title';
 close.setAttribute('aria-label','关闭使用说明');close.onclick=()=>dialog.close();
 header.append(title);if(onValidate){const validate=el('button','检查全部图案');validate.onclick=onValidate;header.append(validate);}header.append(close);
 search.type='search';search.placeholder='搜索功能、参数或问题，例如：遮罩、循环、SVG';search.setAttribute('aria-label','搜索使用说明');
 layout.className='user-help-layout';nav.setAttribute('aria-label','使用说明目录');article.tabIndex=0;article.setAttribute('aria-label','使用说明正文');status.setAttribute('role','status');
 layout.append(nav,article);dialog.append(header,search,status,layout);document.body.append(dialog);let selected='start';
 function show(section){selected=section.id;renderManual(article,section.body);article.scrollTop=0;for(const b of nav.children)b.setAttribute('aria-pressed',String(b.dataset.section===selected));}
 function filter(){const q=search.value.trim().toLocaleLowerCase(),matches=HELP_SECTIONS.filter(s=>(s.title+' '+s.body).toLocaleLowerCase().includes(q));nav.replaceChildren();status.textContent=q?(matches.length?'找到 '+matches.length+' 个相关章节':'没有匹配的章节，请换个关键词。'):'';status.hidden=!q;
  for(const section of matches){const b=el('button',section.title);b.dataset.section=section.id;b.onclick=()=>show(section);nav.append(b);}
  if(matches.length)show(matches.find(s=>s.id===selected)??matches[0]);else article.replaceChildren(el('p','可以尝试搜索“图片”“参数”“导出”等词。'));
 }
 search.oninput=filter;dialog.addEventListener('close',()=>dialog.remove(),{once:true});filter();dialog.showModal();search.focus();
}
