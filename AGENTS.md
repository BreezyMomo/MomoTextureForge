# Momo Texture Forge

本仓库维护 Momo Texture Forge 网页图形与纹理创作工具。

- 命令均从仓库根目录执行，使用 Node.js 安装依赖、运行测试和构建。
- 保留内置图库扩展机制，以 web/definitions/builtin.json 及对应定义为当前目录。外部图库不随工具自动分发或下载。
- 保留现有公共 GLSL 库的署名和许可文本，不因图形目录调整而删减或替换公共函数。
- 图形公式修改应针对明确问题或用户确认的视觉改进，不为制造实现差异而改写。不在仓库维护历史审查、修改记录或旧公式指纹清单。
- 修改内置图形视觉公式后，运行 node tests/builtin-release-browser-check.mjs --pattern <图形ID> 更新对应图库缩略图，再构建静态网站；检查实际卡片效果。
- 教程截图通过 tools/capture-docs.mjs 拍摄，操作标记在 tools/docs-annotations.mjs 维护；按真实控件定位编号框，同步图下注解，保证操作目标可见。
- 编辑器入口：web/tree-app.js；内置图形：web/definitions。
- Skill 源文件在 skills/，修改后运行 node build-authoring-kit.mjs，同步生成文件。
- AI 上下文仅从图形库导出，不恢复选中节点上下文或固定图形清单。
- 安装：npm ci。验证：npm test、npm run validate:definitions。构建：npm run build:standalone。
- 测试输出放在 test-results/，离线产物放在 dist/；npm run build:pages 将网页同步到可提交的 site/ 目录供静态部署。不提交依赖目录和浏览器用户数据。
- 提交、推送与发布按用户指令执行。
