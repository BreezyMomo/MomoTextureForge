# 统一 RGBA 手绘后处理

<!-- doc-language -->
[简体中文](README.md) · [English](README.en.md)
<!-- /doc-language -->

正式流程只有 **RGBA 输入 → 自动轮廓与填充 → 输出**。没有轻量填充或冻结描边出口。图形生成器只是可选输入适配器；Texture2D、2D 单采样 RenderTexture 与生成器共用同一手绘核心、Compute 和运行组件。`parameters.json` 使用 `momo.handdrawn-postprocess/v1`，旧项目节点数据可读，但旧 shaderMode 明确提示迁移到 `postprocess`。

完整复制 `Unity/` 到 Assets 下新目录，等待编译，然后用 manifest 的 `unityImporter.menu` 或 `unityImporter.type.ImportFile(参数绝对路径)` 创建材质和 Prefab。文件哈希、Compute/SM4.5/RFloat、输入尺寸和资源预算会检查；不覆盖旧输出。每包命名空间/Shader 名独立，Prefab 保存材质、覆盖 Shader、Compute 和可选 RGBA 生成材质的引用。验证范围为 Unity 2022.3 / URP14，移动端/Player 未验证。

`HanddrawnEffect.displayTemplate._InputTex` 接受普通贴图或运行时 RT；静态输入按贴图/材质版本缓存，RT 自动逐帧更新，特殊原生插件可显式 `Refresh()`。设置 `inputGenerator` 时由独立材质产生 RGBA，随后进入同一后处理，不复制手绘算法；关闭 `animate` 并 `RenderAt(seconds)` 可按秒采样。生成器输入要求 ARGBHalf。初始捕获贴图/生成器保留原生阶段的裁剪设计尺寸；换图或 RT 后自动按新比例和短边512计算，无需清零参数。只有明确启用 `useFixedDesignSize` 才使用 `fixedDesignSize` 覆盖。切出生成器输入会立即释放不再使用的 RGBA 生成资源。

`sourceAlphaMode` 为 Straight=0 / Premultiplied=1；`sourceColorSpace` 为 UnitySampled=0 / NativeSRGB=1。默认图片按 Unity 正常 sRGB 导入、Straight 输入。原生数值 sRGB 数据 RT 使用 NativeSRGB；已预乘输入不会重复乘 alpha。Native source0 读取 alpha，source1 取**预乘数值 sRGB RGB 的点积**，与网页阶段一致；2/3/4 是额外的线性亮度、反线性亮度、红通道，不混用原生索引。颜色属性按 sRGB 调用 Unity SetColor，不提前 `.linear`。

设计尺度按**短边512**，长方形按比例扩展长边；不是最长边512。`parameters.nativeFillMapping`：原生0→OriginalInput2（保留整个原输入，可叠加描边），1→Solid0，2→IndividualHachure1，4→NoFill3（仅描边）。`_UseSourceColor` 是额外的填充取原色选项，不代替 OriginalInput。节点透明度在输入/填充/描边合成后只乘一次。粗糙度1.3、弓度、随机偏移、种子、线宽和双笔保持原生单位；不再有旧归一化粗糙度控制。

首批原生填充与参数范围由支持报告列出。未实现的网页样式/虚线/顶点选项明确拒绝；向量平滑、简化和曲线预处理仅在声明的默认近似值可导出，改变它们会报告具体路径。网页选项不会被删除来伪装支持。轮廓与随机流仍不是完整 Rough.js 等价实现，不能称为逐像素还原。

运行资源包括覆盖 RFloat RT、行区间/双三次笔画缓冲和诊断缓冲；生成器适配另有 RGBA RT。默认32区间/行，可调1–128，最多4096行/64 MiB缓冲/128邻行半径，超预算失败并释放。溢出显示洋红，显式 `RequestDiagnostics()` 异步读计数，不逐帧读回CPU。禁用释放全部资源并恢复原Renderer状态，重启/间距/分辨率变化重建。输入PNG是后处理的真实原始输入，不是预烘焙边框；原生输出参考只用于对照。
