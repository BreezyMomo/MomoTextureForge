# MCP 编辑器能力

<!-- doc-language -->
[简体中文](mcp-capabilities.md) · [English](mcp-capabilities.en.md)
<!-- /doc-language -->

这是当前产品能力说明。53个结构化 MCP 工具覆盖下表列出的编辑器业务：作品与节点、参数动画、资源创作与图库、导入导出、预览和工作区、远程库及本机图库目录管理。按现有菜单与教程核对的业务流程已接入并实页验收；这不表示穷举所有参数组合，也不包含任意代码执行、系统文件对话框或外部引擎编译。所有操作复用原生业务模块。

## 接入与执行范围

目标页面必须由用户开启连接，使用 `forge_pages` 确认 pageId。读取作品使用 `forge_capture`，编辑用新鲜 snapshotId。跨页面不共享选择状态。项目、图形列表、浏览器图库、远程目录和工作区偏好是不同修改范围。

`forge_schema` 返回原生操作、禁改字段、配方限制以及 `editorControls`。项目替换、已有文件覆盖、远程发布和删除必须对应用户的明确任务。文件路径位于 MCP 服务主机；没有用户授权时不向真实远程库发布或删除数据。

验证缩写：**MCP 回归**指真实官方 SDK、HTTP 通道和原生执行器测试；**实页验收**指在连接的真实页面通过 MCP 写入、读回及渲染。前者不代替后者。每批升级需更新 Skill、重启服务并刷新网页后重新连接；运行中的网页不会热替换业务代码。

## 当前覆盖矩阵

| 功能 | 文档／业务源码 | MCP 入口 | 验证与限制 |
| --- | --- | --- | --- |
| 页面发现、完整作品快照、节点与资源读回 | [连接](../skills/texture-forge-author/references/live-editor.md)、[服务](../editor-mcp.mjs) | pages/capture/inspect/resource | 已实页验收；只读取用户接入页 |
| 新画布、节点增删复制、组合、移动、遮罩 | [画布](05-canvas-and-compositing.md)、[配方](../web/project-authoring.js) | forge_edit | 19种配方操作已实页验收；[配方回归](../tests/project-authoring.test.mjs)保留边界验证 |
| 原位切换图形、参数与颜色、保留效果 | [配方](../web/project-authoring.js) | set-graphic/set-parameter/patch-node | 已实页验收；换图形清除旧 params 轨道并报告 |
| 撤销／重做 | [快速开始](01-quick-start.md)、[编辑器](../web/tree-app.js) | forge_history | [MCP 回归](../tests/editor-mcp-project.test.mjs)；需 snapshotId 和 expectedHistoryRevision，实页撤销重做及冲突验收通过 |
| 当前选择、播放、预览与历史状态读回 | [编辑器](../web/tree-app.js) | forge_editor_state | [MCP 回归](../tests/editor-mcp-project.test.mjs)；此入口只读，不改变选择 |
| 打开项目 JSON/ZIP、保存项目 ZIP | [快速开始](01-quick-start.md)、[项目控制](../web/editor-live-project.js) | forge_project_open/save | [MCP 回归](../tests/editor-mcp-project.test.mjs)；原生 ZIP 最大64 MiB、JSON最大4,000,000字节，个人图形列表保留；实页公式／生成器／SVG／PNG依赖及教程JSON导入通过；回包版本一致性修复已实页复验，11次比较无差异 |
| 分享配置链接、组合示例加载 | [快速开始](01-quick-start.md)、[示例](../web/examples.js) | forge_examples/example_open/project_share | 分享5项、54个示例读回与实际图像验收通过；自定义资源/文件页/大链接提供ZIP替代。 |
| 多选、异值保留、最外层选择与跨父级对齐分布 | [画布](05-canvas-and-compositing.md)、[选择编辑](../web/selection-editing.js) | layout-nodes / forge_editor_control | 选择控制及跨父级对齐分布19项实页通过；逐节点修改保留不同值。 |
| 排列参数、密度图、展开为独立节点 | [画布](05-canvas-and-compositing.md)、[编辑器](../web/tree-app.js) | forge_edit / expand-arrangement | 全部16个非零排列模式展开已实页验收；旧2/3模式已修复并复验实际可见实例；像素轮廓允许原生栅格边界差异。 |
| 贝塞尔点数据、插锚／延伸／删锚、丝带预设 | [画布](05-canvas-and-compositing.md)、[曲线编辑](../web/curve-editor.js) | bezier-edit / ribbon-preset | 贝塞尔18项及丝带预设多时间实页验收通过；动画拓扑锁和非法点拒绝通过。 |
| 效果添加、启停、移除、顺序与参数 | [画布](05-canvas-and-compositing.md)、[效果定义](../web/post-effect-specs.js) | set-effect/remove-effect/reorder-effects | 31效果、201参数默认与最小／最大端点已实页读回；31效果组合渲染通过 |
| 单效果／全部效果重置及移除后恢复 | [效果编辑](../web/post-effects-editor.js) | reset-effects | 原生重置和移除后恢复值/轨道已实页验收。 |
| 色阶、曲线、多色渐变、继承转独立 | [画布](05-canvas-and-compositing.md)、[颜色](../web/inspector-color.js) | patch-node | independent-color 已实页通过；gradient/curves 共32项实页通过，含12渐变、6通道×5曲线和实际GPU数学像素 |
| 关键帧、片段切线、局部时间、冻结、源时钟 | [动画](06-animation.md)、[配方](../web/project-authoring.js) | set-track/remove-track/patch-node | 数值／颜色／布尔／枚举／dash轨道、cubic片段及add/multiply混合已实页验收；并非穷举所有路径 |
| 动画模板、记录／基础值模式、关键帧复制粘贴 | [动画](06-animation.md)、[动画工作区](../web/tree-animation-workspace.js) | animation-template / record-key / edit-keys / convert-track | 全部6个模板与记录、转换、复制移动删除、碰撞拒绝已实页验收。 |
| 已加载图形目录、完整参数与GLSL | [图库](02-graphics-library.md)、[实时创作](../web/editor-live-authoring.js) | forge_catalog | 已实页验收；读取已加载注册表而非原件库，可能包含已提交后撤销仍保留的依赖缓存；不能用总数判断用户资源是否新增 |
| 完整内置／本地／远程图库查询与资源详情 | [图库](02-graphics-library.md)、[图库存储](../web/graphics-library.js) | forge_library | 301内置分页/过滤/搜索/原生导出已实页通过；本地/远程版本冲突已实页通过；includeSource完整源码读取已实页验收 |
| 图形列表加入、删除、重命名、更新与另存 | [图库](02-graphics-library.md)、[项目资源](../web/project-resources.js) | forge_graphics_list/edit | 列表增删改、跟进新版、保存节点、两种插入已通过原生、MCP回归与实页验收；原件与实例各自独立 |
| 组件试编辑、返回、插入和更新 | [图库](02-graphics-library.md)、[编辑器](../web/tree-app.js) | forge_component/edit / forge_capture(context:component) | 组件完整流程11项实页通过，含试编辑中列表与单条只读。 |
| 收藏、最近、动态筛选、批量加入和取消 | [图库](02-graphics-library.md)、[图库界面](../web/graphics-workspace.js) | forge_list_view/edit | 收藏/最近/动态等15项实页通过；真实分组DOM同步4项实页复验通过，含延迟toggle、筛选与恢复。批量 forge_graphics_list_batch/job 的11项实页通过：混合加入/跳过、一次撤销重做、新版提示、四任务上限、100项进行中取消保存完成前缀、排队取消、并发冲突回滚及恢复 |
| 资源 ZIP 导入／导出、备份恢复 | [图库](02-graphics-library.md)、[资源导入](../web/resource-import.js) | forge_library_export/export_batch/import | 单资源和批量导出、原子导入、备份恢复已实页验收；100文件上限实页通过，超过45秒仍保持连接并成功返回；已派发请求仅在截止时间内保活，断开/超时结果未知时先读回再重试。 |
| 公式／生成器创建、验证、编辑、别名与导出 | [创作](04-formulas-and-generators.md)、[创作解析](../web/creation-authoring.js) | forge_library_create、forge_library(includeSource) | 新建与源码读取已实页验收；forge_library_update/save_node 版本更新与节点发布已实页验收；forge_library_export(format:authoring) 已接原生创作JSON；图片/组合/内置程序式生成器使用ZIP |
| 图片／SVG 导入、去背景、改色、居中与轮廓重建 | [图片](03-images-and-svg.md)、[图片处理](../web/image-processing.js) | forge_library_create / forge_library_process_image | 图片／SVG新建已实页验收；forge_library_process_image 已接入原生处理，原尺寸位图与SVG/trace像素已实页验收 |
| 图形及参数多语言别名 | [语言](12-language-and-aliases.md)、[资源创作](../web/graphics-workspace.js) | forge_library_aliases | 别名及创作导出14项实页通过；固定语言限制与未启用别名保留已验收 |
| 快照 PNG 参考渲染、时间与通道、单节点效果前输入 | [MCP指南](../skills/texture-forge-author/references/live-editor.md) | forge_render | 已实页验收；参考渲染不是全格式导出 |
| PNG8/16、EXR、图集、序列 ZIP、三档尺寸批量 | [导出](08-export.md)、[导出作业](../web/export-job.js) | forge_export_start/job | 11种导出格式、PNG16/EXR实际解码、时间与通道已实页验收。 |
| GIF、PSD层级、SVG与矢量PSD | [导出](08-export.md)、[编辑器导出](../web/tree-app.js) | forge_export_start/job | 原生GIF/PSD/SVG文件和像素已实页验收。 |
| RGBA 节点通道配置 | [导出](08-export.md)、[通道](../web/output-channels.js) | set-project / forge_export_start | 10种节点来源、14种通道选择已通过实页像素验收；已接通原生导出。 |
| 导出进度、取消、失败诊断 | [导出](08-export.md)、[导出作业](../web/export-job.js) | forge_export_start/job | 12项作业验收通过：真实运行中取消、排队取消、预算失败与后续任务恢复。 |
| Shader参考包与项目handoff | [Shader](14-shader-reference.md)、[Shader导出](../web/shader-effect-export.js) | forge_deliver | 交付5项和Shader适用范围9项实页通过；不承诺目标引擎编译或任意节点转Shader。 |
| 播放暂停、定位、二维缩放平移、吸附、辅助线、平铺与solo | [快速开始](01-quick-start.md)、[编辑器](../web/tree-app.js) | forge_editor_control | 选择、播放与二维视图20项实页通过；工具模式和吸附已实页验收。 |
| 三维模型、灯光、材质、相机与复位 | [三维](07-normal-and-material.md)、[三维预览](../web/material-preview.js) | forge_editor_control / forge_preview_capture | 设置与真实预览PNG已实页验收；三模型、材质灯光相机与法线实际像素验证通过。 |
| 特效背景、透明／相加比较与预设 | [特效](13-effect-presets.md)、[预览](../web/effect-preview.js) | forge_editor_control / forge_preview_capture | 背景/混合/亮度/尺寸/复位已实页验收；四种比较图和自定义背景实际像素通过。 |
| 节点快捷固定、参数页签、模块折叠与顺序 | [画布](05-canvas-and-compositing.md)、[快捷项](../web/node-shortcuts.js) | forge_inspector/edit | 原生页签/折叠/顺序/快捷固定15项实页通过；复制传播已复验根/子/遮罩、局部隐藏全局固定、链式复制与组件插入；偏好不随项目迁移 |
| 浮动／停靠／分隔尺寸与最多12套命名布局 | [布局](11-workspace-layout.md)、[停靠](../web/dock-workspace.js) | forge_workspace/edit | 工作区17项实页通过，覆盖停靠浮动、命名上限、覆盖、冲突与原子恢复。 |
| 语言、主题、密度和外观偏好 | [语言](12-language-and-aliases.md)、[外观](../web/appearance.js) | forge_editor_control | 偏好16项实页通过；固定枚举、作品与历史不变、恢复及中英文源码/静态检查通过。 |
| 远程订阅增改启停、刷新、下载缓存与删除 | [远程库](09-remote-libraries.md)、[远程业务](../web/remote-library.js) | forge_remote/edit/job | 普通流程18项实页通过；下载多版本/冲突/停用/缓存隔离已验收；后台作业取消9项实页通过，含真实socket关闭、排队取消和后续任务恢复。 |
| 库管理目录导入预览确认、快照恢复、撤下与文件删除 | [远程库](09-remote-libraries.md) | forge_directory_open / forge_directory | 本机原生管理22项实页通过，覆盖formula/SVG/PNG正式ZIP、预览/提交/恢复/撤下/永久删除与目录联接隔离；与原生静态库一致，base ABI之外的生成器ZIP不支持，应直接导入编辑器。 |
| 帮助、AI目录导出、Skill下载 | [AI帮助](10-ai-and-help.md)、[Skill下载](../web/skill-downloads.js) | forge_help / forge_guide / forge_library_export | 帮助/Skill下载6项、创作/AI目录导出实页通过 |
| 时间轴范围、轨道筛选、缩放、吸附、关键帧选择与曲线视图 | [动画](06-animation.md)、[控制](../web/animation-workspace-controls.js) | forge_timeline/edit | 时间轴18项实页通过，覆盖局部/非线性时间、关键帧/曲线视图、偏好与试编辑；数据修改使用edit-keys，不操作系统剪贴板。 |
| 保存前预览、时间检查、内置生成器默认值另存、图片元数据 | [创作](04-formulas-and-generators.md)、[资源业务](../web/editor-live-resource.js) | create/update/process_image 的 previewOnly；forge_library_edit_resource | 资源预览20项实页通过，含公式时间像素、pipeline/SVG/JPG/WebP、零保存/零注册残留、错误公式、内置生成器参数与专用身份、版本更新、图片元数据及原状恢复。 |

## 使用约束

完整参数与操作示例见[实时创作指南](../skills/texture-forge-author/references/live-editor.md)。先读取对应范围的状态和版本，再执行结构化操作；不要用旧快照跨越用户编辑。创作闭环5项实页通过：新生成器、批量加入、组件插入、参数/动画/效果、多时间渲染、PNG16实解码与原生ZIP；删除测试原件/列表副本后重开ZIP仍保持作品哈希与渲染，最后恢复原状态。不将已通过的代表性测试解释为穷举所有输入。提交、推送与发布仍按用户指令执行。
