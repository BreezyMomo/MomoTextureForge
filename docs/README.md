# 图文操作手册

[返回项目首页](../README.md) · [打开在线编辑器](https://breezymomo.github.io/MomoTextureForge/)

从“快速上手”做出第一张贴图，再按需要查阅具体操作。截图来自当前编辑器的实际界面，演示数据独立于用户草稿；不同窗口大小会使按钮换行或参数区出现滚动条。

![编辑器总览](images/workspace.png)

## 按操作查找

| 想做什么 | 图文教程 |
| --- | --- |
| 从空画布开始、认识界面、保存项目 | [01 · 快速上手](01-quick-start.md) |
| 搜索图形、添加到画布、试编辑、备份资源 | [02 · 图库与图形列表](02-graphics-library.md) |
| 上传图片、去背景、提取颜色、居中、转 SVG | [03 · 图片与 SVG](03-images-and-svg.md) |
| 自己写公式、输入生成器 JSON、调火焰与烟雾 | [04 · 公式与生成器](04-formulas-and-generators.md) |
| 选中/组合节点、变换、重复排列、混合与滤镜 | [05 · 画布、排列与合成](05-canvas-and-compositing.md) |
| 录制关键帧、编辑曲线、设置时间与循环 | [06 · 动画与时间轴](06-animation.md) |
| 图片转法线、查看高度、检查三维材质 | [07 · 法线与三维预览](07-normal-and-material.md) |
| 导出 PNG、EXR、序列帧、图集、PSD、SVG | [08 · 导出与交付](08-export.md) |
| 订阅远程图形库、维护与发布自己的图库 | [09 · 远程图库与管理器](09-remote-libraries.md) |
| 下载 Skill、向 AI 提供图库目录、导入结果 | [10 · AI 协作与帮助](10-ai-and-help.md) |
| 本地运行、离线构建、静态部署、维护截图 | [开发与部署](development.md) |
| 找不到图形、预览/导出不一致、存储与恢复问题 | [常见问题](faq.md) |

## 可打开的演示画布

下载 JSON 后，在编辑器 **文件 → 打开项目** 中选择文件。这些示例只使用内置图形。

- [召唤法阵](examples/summoning-circle.json)：组合、圆环、环形星光和旋转轨道。
- [呼吸星形起点](examples/animation-star.json)：用于跟随关键帧教程录制宽度变化，初始没有关键帧。
- [动态焦散材质](examples/water-caustics.json)：用于高度、法线和三维查看。
- [火焰序列](examples/fire-sequence.json)：用于生成器动画与图集导出。

项目保存的是可继续编辑的结构与依赖；导出的图片是交付结果。两者不能互相代替。
