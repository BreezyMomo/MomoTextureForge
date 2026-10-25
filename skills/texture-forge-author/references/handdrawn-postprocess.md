# 统一手绘后处理

<!-- doc-language -->
[简体中文](handdrawn-postprocess.md) · [English](handdrawn-postprocess.en.md)
<!-- /doc-language -->

用户要求把输入图像/生成器结果转换成手绘时，使用 **RGBA 输入 → 自动轮廓与填充 → 输出** 的正式 `postprocess` 流程。不要选轻量填充或冻结边框；这些出口已退役。普通项目/节点/参数仍可读，不改用户画布以迁就导出器。

```sh
node scripts/texforge.mjs project shader-support /work/effect.zip --shader-mode postprocess --output /work/support.json
node scripts/texforge.mjs project shader /work/effect.zip --shader-mode postprocess --handdrawn-input auto --times 0,.75,1.5,2.25,3 --size 512 --output /work/handdrawn.zip
```

先读报告 `modes.postprocess`、`inputAdapters`、`unsupportedParameters` 与 `approximations`。`--node ID` 明确选择一个手绘阶段；不传时必须唯一。包是此阶段的通用后处理，不声称是整画布所有效果的 Shader。`auto` 只在已审核 RGBA producer 或静态源之间选择，未支持的动画源会阻止导出，不能暗中抓帧。用户明确选择 `--handdrawn-input texture` 才生成该时间的静态 RGBA 输入；这是原始输入，不是预烘焙描边，后处理仍会按输入自动重建。`external` 用于用户接入 Texture2D/2D RT，`generator` 显式要求审核过的生成适配。

网页入口为 **导出 → Unity 手绘后处理（ZIP）**，手绘效果面板也能下载同一包。MCP 先 `forge_pages` 确认用户开启的页面，再 `forge_capture({pageId})`，按同一新鲜快照调用 `forge_deliver({snapshotId,kind:"shader-support",shaderMode:"postprocess"})`，支持后 `forge_deliver({snapshotId,kind:"shader",shaderMode:"postprocess",handdrawnInput:"auto",times:[0,.75,1.5],size:512})`。页面修改后重新捕获。`auto` 遇到手绘阶段只走此流程或失败；旧 `handdrawn`、`dynamic-handdrawn` 仅返回迁移提示。

包使用 `momo.handdrawn-postprocess/v1`，包含实际原生参数、来源哈希、真实 pre-sketch RGBA、统一 GPU 核心、覆盖 Shader、运行组件、材质/Prefab 导入器，以及可选的独立 RGBA producer。生产者只负责输入，不复制手绘算法。静态贴图、运行时 RT 和图形生成结果使用同一 `HanddrawnEffect`。按[包内说明](shaders/postprocess/README.md)和 `unityImporter` 导入；Prefab 引用可保存，换输入自动适配比例与缓存。不要依赖聊天或消费者临时工程，也不手工重写已提供的转换。

原生 source0 是 alpha；source1 是**工作阶段预乘数值 sRGB RGB 的点积**。组件 `sourceAlphaMode` 明确 Straight/Premultiplied，`sourceColorSpace` 明确 UnitySampled/NativeSRGB，防止重复乘透明度或颜色转换。设计短边512，长方形相应扩展长边；初始捕获阶段另保留真实裁剪设计尺寸，更换输入后自动适配，只有用户明确固定尺度才覆盖。颜色仍按 sRGB 调用 Unity SetColor。节点透明度在原图/填充/描边合成后一次应用。

`parameters.nativeFillMapping`：原生0→OriginalInput2（完整原输入加描边）、1→Solid0、2→IndividualHachure1、4→NoFill3。未实现的网页填充、虚线、顶点或非默认向量预处理参数会按路径明确拒绝，不能删选项、改样式或静默忽略。原生粗糙度1.3、线宽4.8等值直接保留，没有旧归一化填充控制。轮廓/向量平滑和 RNG 仍为声明的近似，不声称完全等价 Rough.js。

实际验收应覆盖图片/RT/producer共用核心、静态缓存/修改刷新、输入切换、半透明 straight/premult 与来源语义、长方形尺度、OriginalInput/None、颜色/透明度、参数和种子、Prefab 重开/多实例、资源释放/溢出。导出器保持引擎 `not-run`，真实 Unity 验证另记；不把浏览器编译或先前原型当本次包验证。移动端/Player 未测时明确说明。旧轻量/冻结参考仅可作为历史数据识别，不能继续导出或推荐。
