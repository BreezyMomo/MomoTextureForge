# 安装与更新 Skill

<!-- doc-language -->
[简体中文](installation.md) · [English](installation.en.md)
<!-- /doc-language -->

编辑器顶部 **AI 工具 → 安装 Skill** 选择Agent和需要的Skill，点 **选择目录并安装…**，在系统窗口中选位置并授权。实际安装位置由系统目录选择窗口确认。安装不会修改当前作品或Agent配置。

## 推荐目录

在线静态版（包括 GitHub Pages）在安装或下载时才获取对应 Skill 文件，因此首次操作需要网络；等待期间安装和下载按钮暂时禁用，加载失败会显示错误。需要完全离线使用时，请打开完整的 `MomoTextureForge.html` 离线版；在线首页必须与 `assets/` 一起部署，不能仅保存首页代替离线版。两种版本交付相同的 Skill 内容。

- Codex：个人目录 `~/.agents/skills`；工程根目录下为 `.agents/skills`。
- Claude Code：个人目录 `~/.claude/skills`；工程根目录下为 `.claude/skills`。
- Cursor：个人目录 `~/.cursor/skills`；工程根目录下为 `.cursor/skills`。
- Agent Skills：通用 `.agents/skills` 布局，确认目标客户端支持此位置。

`~` 表示系统用户主目录。网页不能取得该绝对路径或自动跳转到它，只显示推荐位置；实际位置始终由用户选择。在任意测试文件夹内安装，不会因此成为Agent的个人全局Skill。

## 选择目录并安装

每次点击安装都会打开系统目录窗口；取消选择不会写入文件。目录授权只适用于当前网站和已选择的位置。浏览器不向网站提供完整本机绝对路径；完成后仅反馈本次安装结果及目录层级，关闭面板后清空。

选择已有的 `skills` 目录时直接使用；选择目标Agent目录（例如 `.agents`）时补齐 `skills`；选择其他目录（例如工程根目录）时补齐完整Agent路径。Codex例如写入 `<所选目录>/.agents/skills/texture-forge-author`，不会将Skill文件夹散放在工程根目录，也不会重复创建 `.agents/skills/.agents/skills`。选择已有 `skills` 目录时，请确认它属于目标Agent。

网站只在授权目录内写入所选Skill，不需要手动解压。支持目录写入的安全浏览器环境可使用此操作；不支持时，点击对应Skill右侧的 **下载 ZIP**。网页不保存安装目录、不维护安装记录，也不在打开面板时扫描已有安装；每次安装均由用户重新选择目录。浏览器可能再次要求授权，跨网站地址、浏览器与隐私窗口不共享授权。

## 安装结果、更新与备份

安装区只用于勾选需要写入的Skill。成功或失败都仅反馈本次操作，不汇总其他目录的安装状态。成功写入文件不表示Agent已加载或创作工具运行环境已配置。

只管理所选 `texture-forge-author`、`texture-forge-effects` 子目录。更新前将被替换文件的原始字节备份到Skill内的 `.momo-backups/<批次>/`，备份文件追加 `.bak`，不会被当成另一份 `SKILL.md` 加载。额外文件、笔记和依赖目录保留。写入失败时尝试恢复原文件并移除本次新建文件，恢复失败会报告路径。

相同版本重复安装跳过写入；版本通过内容哈希识别。备份不自动清理，需要恢复时将对应 `.bak` 复制回原位置并去掉后缀。文件操作不移动或删除目标Skill目录之外的内容。

## 首次使用创作工具

安装创作 Skill 后，向下查看第 2 步，复制启动说明并发送给 AI。AI 按 Skill 定位实际目录、准备缺少的运行环境与依赖、启动或复用本机 MCP 服务并验证可用。用户无需自行安装前置条件或执行启动命令；首次准备可能需要联网。效果指导 Skill 仅有操作说明，不能用于启动 MCP。

AI 确认服务就绪后，回到第 3 步连接页面并复制配置到 AI 客户端。文件安装、服务启动、页面连接、客户端配置是不同状态。AI 执行细则见[网页作品与 MCP 连接](live-editor.md)。

每个Skill右侧的 **下载 ZIP** 提供完整压缩包，解压后文件与直接安装一致；下载不会改变该Skill的勾选状态。Skill不是图形资源，不导入图库。客户端未显示Skill时检查实际安装位置，或重新加载客户端。

路径依据：[Codex官方说明](https://learn.chatgpt.com/docs/build-skills)、[Claude Code官方说明](https://code.claude.com/docs/en/skills)、[Cursor官方说明](https://cursor.com/docs/skills)。浏览器授权依据：[File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)。
