# 当前范围与后续方向

<!-- doc-language -->
[简体中文](ROADMAP.md) · [English](ROADMAP.en.md)
<!-- /doc-language -->

已实现的五项基础扩展见[扩展范围](plans/texture-tool-expansion/README.md)，不再作为待执行清单。日常使用从[操作手册](docs/README.md)进入，开发维护从[开发文档](docs/development.md)进入。

| 领域 | 当前边界 |
| --- | --- |
| 网页创作 | 图形/生成器、组合/排列、后处理、动画、图片处理与资源管理；按实际目录和schema使用 |
| AI | 离线原生项目创作，以及用户主动连接页面后的结构化MCP读写；不自动接入其他页面 |
| Shader | 区分生成图形与处理图像；Unity仅支持已审查解析图形和统一手绘后处理，见[交付范围](docs/14-shader-reference.md) |
| 材质预览 | 球体/平面/立方体、灯光与材质控制、Sobel/Scharr法线、翻转与预平滑，兼容静态网站 |

可按实际需求继续扩展图形/后处理的引擎适配、Player与移动平台验证，以及AO、四方向照片法线、自定义模型等材质能力。它们不是当前已交付功能，也没有预设完成时间；新增Shader遵守[职责规范](skills/texture-forge-author/references/shader-architecture.md)。
