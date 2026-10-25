# MCP 当前能力与使用边界

<!-- doc-language -->
[简体中文](mcp-capabilities.md) · [English](mcp-capabilities.en.md)
<!-- /doc-language -->

[AI协作教程](10-ai-and-help.md) · [工具参数与连接协议](../skills/texture-forge-author/references/live-editor.md) · [服务实现](../editor-mcp.mjs)

本页按业务说明当前已实现的结构化MCP能力。实际可用工具以运行服务的工具列表和已连接网页的schema为准；旧服务不会因磁盘文件更新而自动加载新工具。这里不维护历史验收次数，也不表示已穷举所有参数组合、所有平台或所有引擎。

## 连接与版本

首次使用在AI工具同一面板按 **安装创作Skill → 让AI启动MCP → 配置MCP** 完成。编辑器网页与AI客户端连接同一个本机服务；服务默认监听 `127.0.0.1:8798`。静态网页和离线HTML可连接服务，但网页不承担监听本机端口的服务职责。首次运行环境由AI按Skill准备，用户不必手动安装前置条件。

先 `forge_pages` 识别用户主动接入的页面，再按明确 `pageId` 捕获。需要新工具或新版业务逻辑时，更新Skill、重启服务并刷新客户端工具列表；网页端逻辑变更还需刷新网页并重新连接。配置、健康检查、来源授权与自定义端口见[连接协议](../skills/texture-forge-author/references/live-editor.md)。

## 按业务查工具

| 业务 | 主要工具 | 当前范围与限制 |
| --- | --- | --- |
| 发现页面与检查服务 | forge_pages / forge_status | 只列出用户接入页；多个目标时按名称、来源和pageId确认，不默认选择第一页。 |
| 固定作品与读取依赖 | forge_capture / forge_inspect / forge_resource / forge_render | 同一snapshotId固定节点、资源和渲染版本；render是参考渲染，不等于完整导出。 |
| 创建与修改作品 | forge_schema / forge_catalog / forge_edit | 查询实际图形、variable与操作；原子配方和撤销。默认edit保留作品，create仅用于用户要求的新作品；切换图形使用set-graphic。 |
| 编辑器与项目文件 | forge_editor_state / forge_history / forge_project_open / forge_project_save / forge_project_share | 读回选择/播放/历史，按版本撤销重做，打开/保存正式JSON或ZIP；不覆盖整个个人图形列表。分享链接不携带任意自定义依赖，必要时改交项目ZIP。 |
| 示例、选择与预览控制 | forge_examples / forge_example_open / forge_editor_control / forge_preview_capture | 加载实际组合示例、选择与多选、播放/定位、2D/3D/特效预览设置及截图；更改作品的操作仍按请求授权。 |
| 参数、排列、效果与动画数据 | forge_edit | 原生参数、变换、遮罩、排列与展开、Bezier、颜色/曲线、效果增删与顺序、轨道/关键帧和模板；先查schema，不发明字段或跨过受控参数限制。 |
| 时间轴与参数面板 | forge_timeline / forge_timeline_edit / forge_inspector / forge_inspector_edit | 范围、轨道筛选、缩放、关键帧选择、参数页签、模块顺序/展开和固定；界面偏好不写入项目。 |
| 工作区与外观 | forge_workspace / forge_workspace_edit / forge_editor_control | 停靠/悬浮/分隔条、命名布局、语言和已注册主题/风格/密度；不替用户清空浏览器偏好。 |
| 图库查询与导出 | forge_library / forge_library_export / forge_library_export_batch | 内置、本地与已加载远程资源，参数/源码、正式资源ZIP及AI目录。查询已加载注册表的forge_catalog不等于完整个人图库目录；AI目录不含当前作品或完整像素/源码。 |
| 资源创作与更新 | forge_library_create / forge_library_update / forge_library_edit_resource / forge_library_process_image / forge_library_save_node / forge_library_aliases / forge_library_delete | 公式/生成器、图片/SVG处理、节点保存与名称/参数别名；支持previewOnly的入口可先渲染后保存。删除和更新遵守资源引用与版本规则。 |
| 资源导入与图形列表 | forge_library_import / forge_graphics_list / forge_graphics_list_edit / forge_graphics_list_batch / forge_graphics_list_job / forge_list_view / forge_list_view_edit | 正式包导入、备份恢复、列表增删改/收藏/筛选，批量作业进度与取消；保留原生资源、常用副本和画布实例的区别。 |
| 组件试编辑 | forge_component / forge_component_edit / forge_capture(context:component) | 进入、修改、返回、插入与更新；试编辑revision和主画布snapshot分开，组件快照不能授权主画布写入。 |
| 图片与动画文件交付 | forge_export_start / forge_export_job | PNG8/16、EXR、序列/图集、三档批量、GIF、PSD、SVG/矢量PSD及RGBA通道；沿用原生尺寸/帧数/预算，支持进度、取消与错误读回。 |
| Shader与作品实现资料 | forge_deliver | 先shader-support，再选realtime或postprocess；见下方范围。handoff交付源项目、说明与参考图，不等于完成引擎适配。 |
| 远程图库订阅 | forge_remote / forge_remote_edit / forge_remote_job | 查询、增删/启用订阅、刷新、下载和缓存管理；后台作业支持取消，已提交变化不会随取消回滚。 |
| 本机图库目录管理 | forge_directory_open / forge_directory | 用户明确指定主机绝对目录后获得handle，支持索引、导入预览/确认、元数据、撤回/恢复和清理；不继承浏览器目录权限，不自动上传或发布。具体资源ABI限制见连接协议。 |
| 帮助、Skill与目录资料 | forge_help / forge_guide / forge_library_export | 获取相关指南、Skill包和实际图库目录；文档描述不授予操作其他页面、目录或客户端配置的权限。 |

## Shader交付范围

- **realtime**：导出已审查解析图形及支持的组合、参数和持续秒数；当前适配清单、变换/颜色/遮罩限制见[实时作品Shader](../skills/texture-forge-author/references/realtime-shaders.md)。不宣称任意图形、关键帧或所有网页后处理可转换。
- **postprocess**：统一RGBA输入 → 自动轮廓与填充 → 输出。图片、外部RT和受支持生成器共用手绘核心；`handdrawnInput` 选择auto/texture/generator/external。auto不暗中冻结未支持的动画；未覆盖的样式、参数或后续效果明确阻止导出。见[手绘后处理](../skills/texture-forge-author/references/handdrawn-postprocess.md)。
- 旧handdrawn、dynamic-handdrawn和轻量/冻结出口返回迁移提示，不作为兼容渲染路径。模块职责与后续扩展见[Shader规范](../skills/texture-forge-author/references/shader-architecture.md)。
- 包内记录真实参数、源项目、输入、依赖、完整性和参考图；网页导出成功不等于目标Unity已验证。导出器保持引擎验证not-run，实际消费方另记录引擎版本、编译、视觉/播放与平台结果。

## 修改与文件边界

读取请求不授权修改。结构化修改先读最新状态和revision/snapshot；用户修改后重新捕获。写入响应丢失、超时或取消后，先查询实际状态再决定是否重试，不能盲目重复导入或创建。完成后读回并渲染验证。批量操作的取消不回滚已经完成的前缀。

关闭连接面板不撤销连接；断开只影响当前页面及其快照，刷新/关闭页面后需重新开启。不自动连接其他标签页、不扫描整个用户图库、不进行任意代码执行，也不代替操作系统文件选择器或外部引擎编译器。产物路径属于MCP服务主机，远程执行环境可能需要客户端传输文件。提交、推送、删除或发布按用户请求执行。

## 验证入口

[项目与MCP单元检查](../tests/editor-mcp-project.test.mjs)覆盖版本和原生操作；[隔离实页SDK检查](../tests/editor-mcp-browser-check.mjs)通过独立页面与服务检查源码、静态版和HTTPS流程；[手绘独立Skill检查](../tests/handdrawn-postprocess-portable-check.mjs)检查下载包的实际交付。更具体的测试命令见[开发与部署](development.md)。测试在独立环境中进行，不复用用户正在编辑的画布。
