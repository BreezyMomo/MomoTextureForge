# AI 工具开发交接

<!-- doc-language -->
[简体中文](ai-handoff.md) · [English](ai-handoff.en.md)
<!-- /doc-language -->

2026-10-24，开发线为 `main`。继续开发前先读仓库 [AGENTS.md](../AGENTS.md)，本文记录当前实现和用户已经确认的产品取舍。

## 当前界面与安装流程

- 顶部统一入口为 **AI 工具**，只有 **安装与配置**、**MCP** 两个页签。
- 创作 Skill、效果指导 Skill 各自一行，右侧直接 **下载 ZIP**；下载不改变勾选状态。
- 安装流程只有：选择 Agent 和 Skill → **选择目录并安装…** → 系统窗口选目录并授权 → 反馈本次结果。
- 不提供个人／工程模式切换、默认目录安装、自动安装器、安装记录或常驻安装状态。关闭面板即清空本次结果；旧的专用目录缓存会被清理。
- 仅提示推荐目录。Codex 使用 `.agents/skills`，Claude Code 使用 `.claude/skills`，Cursor 使用 `.cursor/skills`。选择已有 `skills` 目录直接使用；选择对应 Agent 目录则补齐 `skills`；其他目录补齐完整 Agent 路径。
- 网页不能取得系统用户主目录或完整本机路径；实际安装位置始终由用户选择。更新仍保留文件备份、写入失败恢复和额外文件保护。
- MCP 中没有重复的“保存当前项目 ZIP”，保存项目统一使用原有文件菜单。图形目录导出入口仍保留。
- 用户要求保持操作简单。不要恢复安装管理器、目录扫描、独立手动安装页签或独立 Shader 试验台。没有主动要求时不重新截图；后续整理教程时也只更新变化的截图。

详细操作见 [AI 协作与帮助](10-ai-and-help.md)、[Skill 安装说明](../skills/texture-forge-author/references/installation.md)。

## 已实现的离线工具与 MCP

离线工具使用 `node portable-authoring-cli.mjs`，下载的 Skill 使用 `node scripts/texforge.mjs`。支持公式／生成器校验和渲染，以及 `project catalog/schema/create/edit/pack/unpack/inspect/render/check/handoff/shader`。完整作品可交付原生项目 ZIP，由用户继续在编辑器中编辑。Shader 导出目前是已有手绘填充参考，不是通用的整幅作品到游戏 Shader 转换器。见 [离线创作命令](../AI_AUTHORING_CLI.md)。

当前 MCP 入口为 `node portable-authoring-cli.mjs mcp`，由 AI 客户端通过 stdio 启动。SDK 和运行依赖随 Skill 的 `package.json` 声明，首次使用需配置 Node.js 22+、npm 依赖和 Playwright Chromium。

目前只有八个工具：`forge_connect`、`forge_status`、`forge_disconnect`、`forge_capture`、`forge_inspect`、`forge_resource`、`forge_render`、`forge_guide`。

当前连接仍是一次性配对码、单个页面、只读主画布；本机 HTTP 桥默认监听 `127.0.0.1:8798`。`capture` 固定原生项目快照，后续结构、资源、GLSL 与渲染使用同一个 `snapshotId`，用户编辑后重新捕获。不要把可读取作品等同于已经能修改网页；完整创作／编辑能力目前在离线 CLI。见 [网页作品与 MCP 连接](../skills/texture-forge-author/references/live-editor.md)。

## 后续方向

用户倾向于：页面接入本机公共连接服务，连接该 MCP 的 AI 能访问已接入页面，减少下载项目再发送给 AI 的步骤。用户不喜欢逐个 AI 配对；当前配对流程不是最终目标。共享服务、多页面发现与选择、网页写入能力都尚未实现，后续应围绕这个方向继续设计，而不是假定现有 MCP 已支持这些功能。

如果需要 Unity 实机验证，用户指定了 `E:/MomoDemo` 工程；先读取该工程规则，遵循其分支和 worktree 规范。

## 代码入口

- `web/ai-tools.js`：统一面板、两页签、Skill 行内 ZIP 下载、一次性目录安装。
- `web/agent-install-paths.js`、`web/skill-install.js`：Agent 路径、目录补齐、文件校验、备份与恢复。内部更新校验不用于创建界面安装记录。
- `web/skill-downloads.js`、`build-authoring-kit.mjs`：ZIP 文件集与离线运行包；Skill 源说明在 `skills/`，中文主入口规范来自 `web/ai-authoring.js`。
- `web/editor-ai-connection.js`、`web/editor-bridge-protocol.js`：浏览器连接界面、轮询与协议常量。
- `editor-bridge.mjs`、`editor-mcp.mjs`：本机连接服务、官方 SDK stdio 服务、不可变快照与八个 MCP 工具。
- `portable-authoring-cli.mjs`、`project-authoring-cli.mjs`、`project-cli.mjs`、`web/project-render.js`：离线创作和统一渲染。
- `web/locales/`：固定文案语义 key；修改措辞同时维护中英文，不用显示文字判断行为。

## 验证与发布

本轮单元测试为 493 项；内置定义为 301 项。已检查源码和静态版的安装、ZIP 内容、取消操作、备份、两页签键盘切换、双语窄屏、旧目录缓存清理、原有项目保存入口，以及真实 SDK 的源码／静态版／HTTPS MCP 连接。安装浏览器测试使用临时 OPFS，不写入真实 Agent 目录。

```sh
npm test
npm run validate:definitions
node tests/ai-tools-browser-check.mjs --built
node tests/editor-mcp-browser-check.mjs --built
node tests/ui-language-browser-check.mjs --no-screenshots
node tests/ui-language-browser-check.mjs --built --no-screenshots
node tools/check-docs.mjs
npm run build:pages
```

源码／Skill 变更后同步生成包。静态部署提交 `site/`，离线产物在 `dist/`；`test-results/`、依赖和浏览器数据不提交。测试报告不随仓库分发，下一台机器需要重跑。界面和文档保持中英文同步，截图按用户要求更新。
