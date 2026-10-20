# 纹理工具扩展计划

按以下顺序实施；具体范围、验收和结果见各文件。

| 顺序 | 计划 | 状态 |
| --- | --- | --- |
| 1 | [生成器统一时间驱动](01-generator-time.md) | 完成 |
| 2 | [动态水面、焦散、篝火、闪电](02-animated-effects.md) | 完成 |
| 3 | [通用后处理](03-postprocessing.md) | 完成 |
| 4 | [法线控制与三维材质预览](04-material-preview.md) | 完成 |
| 5 | [体积火焰、爆炸、烟雾](05-volumetric-effects.md) | 完成 |

入口：图形库 → 特效素材；节点 → 合成 → 后处理；作品设置 → 三维材质预览。

交付包括源代码、使用说明、AI Skill 和静态网站。提交与推送另按用户指令执行。

验证：`npm test`（267项）、`npm run validate:definitions`（298种）、`npm run build:pages`；浏览器检查 `expansion-browser-check`、`expansion-ui-browser-check`、`vfx-browser-check`、`generator-ui-browser-check`、`fire-smoke-browser-check`、`custom-generator-browser-check`、`release-smoke-browser`、`pages-browser-check` 均通过。测试产物在忽略目录 `test-results/`。
