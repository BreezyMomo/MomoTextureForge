# 纹理工具扩展计划

<!-- doc-language -->
[简体中文](README.md) · [English](README.en.md)
<!-- /doc-language -->

以下基础扩展已实现，各文件说明范围与验收方法；不是当前待执行清单。当前功能边界见[功能范围](../../ROADMAP.md)，使用与开发入口见[操作手册](../../docs/README.md)及[开发文档](../../docs/development.md)。

| 顺序 | 计划 | 状态 |
| --- | --- | --- |
| 1 | [生成器统一时间驱动](01-generator-time.md) | 完成 |
| 2 | [动态水面、焦散、篝火、闪电](02-animated-effects.md) | 完成 |
| 3 | [通用后处理](03-postprocessing.md) | 完成 |
| 4 | [法线控制与三维材质预览](04-material-preview.md) | 完成 |
| 5 | [体积火焰、爆炸、烟雾](05-volumetric-effects.md) | 完成 |

入口：图形库按外观/用途分类；节点 → 合成 → 后处理；画布预览的贴图类型/预览模式 → 法线与三维材质。

交付包括源代码、使用说明、AI Skill 和静态网站。提交与推送另按用户指令执行。

维护时运行`npm test`、`npm run validate:definitions`和`npm run build:pages`，再按改动选择[浏览器验证](../../docs/development.md#检查与生成-skill)。测试数量和图形总数以当前工程输出为准，产物放在忽略目录`test-results/`。
