# Momo Texture Forge

本仓库是独立网页工具的后续开发目录，不再修改 Momo 框架内的旧工具副本。

- 运行不依赖 Unity 或 Momo 框架，命令均从仓库根目录执行。
- 本次保留全部图形，资源删除与发布范围由后续任务决定。
- 编辑器入口：web/tree-app.js；内置图形：web/definitions。
- Skill 源文件在 skills/，修改后运行 node build-authoring-kit.mjs，同步生成文件。
- AI 上下文仅从图形库导出，不恢复选中节点上下文或固定图形清单。
- 安装：npm ci。验证：npm test、npm run validate:definitions。构建：npm run build:standalone。
- 测试输出放在 test-results/，产物放在 dist/，不提交依赖目录和浏览器用户数据。
- 提交、推送与发布按用户指令执行。
