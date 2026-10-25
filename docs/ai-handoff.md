# AI 工具开发交接

<!-- doc-language -->
[简体中文](ai-handoff.md) · [English](ai-handoff.en.md)
<!-- /doc-language -->

2026-10-24，开发线为 `main`。继续开发前先读仓库 [AGENTS.md](../AGENTS.md)，本文记录当前实现和用户已经确认的产品取舍。

## 当前界面与安装流程

- 顶部统一入口为 **AI 工具**，在一个连续面板中依次展示 **安装 Skill → 让 AI 启动 MCP → 配置 MCP**，不使用页签。
- 创作 Skill、效果指导 Skill 各自一行，右侧直接 **下载 ZIP**；下载不改变勾选状态。
- 安装流程只有：选择 Agent 和 Skill → **选择目录并安装…** → 系统窗口选目录并授权 → 反馈本次结果。
- 不提供个人／工程模式切换、默认目录安装、自动安装器、安装记录或常驻安装状态。关闭面板即清空本次结果；旧的专用目录缓存会被清理。
- 仅提示推荐目录。Codex 使用 `.agents/skills`，Claude Code 使用 `.claude/skills`，Cursor 使用 `.cursor/skills`。选择已有 `skills` 目录直接使用；选择对应 Agent 目录则补齐 `skills`；其他目录补齐完整 Agent 路径。
- 网页不能取得系统用户主目录或完整本机路径；实际安装位置始终由用户选择。更新仍保留文件备份、写入失败恢复和额外文件保护。
- 网页保存项目统一使用原有文件菜单；MCP 可将指定快照保存到服务主机文件。图形目录导出入口仍保留。
- 用户要求保持操作简单。不要恢复安装管理器、目录扫描、独立手动安装页签或独立 Shader 试验台。没有主动要求时不重新截图；后续整理教程时也只更新变化的截图。

详细操作见 [AI 协作与帮助](10-ai-and-help.md)、[Skill 安装说明](../skills/texture-forge-author/references/installation.md)。

首次使用顺序固定为 **安装 Skill → 让 AI 启动 MCP → 配置 MCP**。创作 Skill 安装后，用户把第 2 步的启动说明发给 AI；由 AI 完成环境检查、缺少依赖安装、后台启动／复用和健康验证。网页不再向普通用户展示 Node/npm/Chromium 安装命令或绝对路径占位符。第 3 步才接入页面并提供客户端配置。服务可用、客户端连接与成功读取分别说明；不要演变为常驻安装管理器或不可跳过的强制向导。

## 已实现的离线工具与 MCP

离线工具使用 `node portable-authoring-cli.mjs`，下载的 Skill 使用 `node scripts/texforge.mjs`。支持公式／生成器校验和渲染，以及 `project catalog/schema/create/edit/pack/unpack/inspect/render/check/handoff/shader`。完整作品可交付原生项目 ZIP，由用户继续在编辑器中编辑。Shader 导出目前是已有手绘填充参考，不是通用的整幅作品到游戏 Shader 转换器。见 [离线创作命令](../AI_AUTHORING_CLI.md)。

MCP 入口 `node portable-authoring-cli.mjs mcp` 是独立共享 Streamable HTTP 服务，地址为 `http://127.0.0.1:8798/mcp`。首次使用由 AI 按 Skill 启动或复用服务；本地开发后端仍保留启动接口。运行依赖由 Skill 包声明，需要 Node.js 22+、npm 依赖与 Playwright Chromium。

三十九个工具：`forge_pages`、`forge_status`、`forge_capture`、`forge_inspect`、`forge_resource`、`forge_render`、`forge_guide`、`forge_catalog`、`forge_schema`、`forge_edit`、`forge_editor_state`、`forge_history`、`forge_project_open`、`forge_project_save`、`forge_library`、`forge_library_export`、`forge_library_create`、`forge_library_delete`、`forge_library_update`、`forge_library_save_node`、`forge_graphics_list`、`forge_graphics_list_edit`、`forge_library_export_batch`、`forge_library_import`、`forge_library_process_image`、`forge_export_start`、`forge_export_job`、`forge_editor_control`、`forge_deliver`, `forge_examples`, `forge_example_open`, `forge_project_share`, `forge_workspace`, `forge_workspace_edit`, `forge_preview_capture`, `forge_component`, `forge_component_edit`, `forge_remote`, `forge_remote_edit`。页面独立接入，Agent 共享服务，capture 必须明确传 pageId。快照句柄归属来源页面，断开一页不影响其他页面；刷新或关闭结束共享，再次开启获得新 ID。共享 Agent 凭据保存在本机，页面令牌只在内存。详见[网页作品与 MCP 连接](../skills/texture-forge-author/references/live-editor.md)。

## 后续方向

共享服务、多页面发现、实际图形查询与网页原子编辑已经实现。forge_edit 基于快照版本校验，默认编辑原画布；create 替换画布只用于用户明确要求新作品。支持撤销与重做；无效配方不产生部分写入。forge_catalog 查询页面已注册图形及图形列表组件；forge_library 查询完整内置／本地图库与远程缓存目录，forge_library_export 导出单个正式资源包，均不自动下载外部资源；原生项目 JSON/ZIP 可通过 forge_project_open 打开；创作JSON与图片可新建本地图形库资源；正式ZIP导入待接入。详见[MCP 能力矩阵](mcp-capabilities.md)。不要恢复逐个 Agent 配对或全局“当前页面”状态。

如果需要 Unity 实机验证，用户指定了 `E:/MomoDemo` 工程；先读取该工程规则，遵循其分支和 worktree 规范。

## 代码入口

- `web/ai-tools.js`：统一面板、纵向三步骤、Skill 行内 ZIP 下载、一次性目录安装。
- `web/agent-install-paths.js`、`web/skill-install.js`：Agent 路径、目录补齐、文件校验、备份与恢复。内部更新校验不用于创建界面安装记录。
- `web/skill-downloads.js`、`build-authoring-kit.mjs`：ZIP 文件集与离线运行包；Skill 源说明在 `skills/`，中文主入口规范来自 `web/ai-authoring.js`。
- `web/editor-ai-connection.js`、`web/editor-bridge-protocol.js`：浏览器连接界面、轮询与协议常量。
- `editor-bridge.mjs`、`editor-mcp.mjs`：本机连接服务、官方 SDK Streamable HTTP 服务、不可变快照与十八个 MCP 工具。
- `portable-authoring-cli.mjs`、`project-authoring-cli.mjs`、`project-cli.mjs`、`web/project-render.js`：离线创作和统一渲染。
- `web/locales/`：固定文案语义 key；修改措辞同时维护中英文，不用显示文字判断行为。

## 验证与发布

源码变更后运行下列检查。安装浏览器测试使用临时 OPFS，不写真实 Agent 目录。MCP 测试覆盖多页面／多 Agent、本地启动、不可变快照和源码／静态版／HTTPS 连接。

```sh
npm test
npm run validate:definitions
node tests/ai-tools-browser-check.mjs --built
node tests/editor-mcp-start-browser-check.mjs
node tests/editor-mcp-browser-check.mjs --built
node tests/ui-language-browser-check.mjs --no-screenshots
node tests/ui-language-browser-check.mjs --built --no-screenshots
node tools/check-docs.mjs
npm run build:pages
```

源码／Skill 变更后同步生成包。静态部署提交 `site/`，离线产物在 `dist/`；`test-results/`、依赖和浏览器数据不提交。测试报告不随仓库分发，下一台机器需要重跑。界面和文档保持中英文同步，截图按用户要求更新。
