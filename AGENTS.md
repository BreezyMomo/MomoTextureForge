# Momo Texture Forge

本仓库维护 Momo Texture Forge 网页图形与纹理创作工具。

- 命令均从仓库根目录执行，使用 Node.js 安装依赖、运行测试和构建。
- 保留内置图库扩展机制；发布包的图形及公共函数按 docs/release-plan.md 中经确认的范围处理。外部图库不随工具自动分发或下载。
- 现有 5 个公共 GLSL 库及其中全部函数按用户决定保留，不因图形目录调整而删减或替换，保留现有署名和许可文本；历史初审和复核中的重写、外置建议已撤回。
- 当前 284 项内置图形保留改造前的主体、周期公式及矢量/法线入口，全部恢复内置。调整图库范围不同时改写公式；后续公式修改应针对明确问题或用户确认的视觉改进，不为制造实现差异而改写。
- 编辑器入口：web/tree-app.js；内置图形：web/definitions。
- Skill 源文件在 skills/，修改后运行 node build-authoring-kit.mjs，同步生成文件。
- AI 上下文仅从图形库导出，不恢复选中节点上下文或固定图形清单。
- 安装：npm ci。验证：npm test、npm run validate:definitions。构建：npm run build:standalone。
- 测试输出放在 test-results/，产物放在 dist/，不提交依赖目录和浏览器用户数据。
- 提交、推送与发布按用户指令执行。
