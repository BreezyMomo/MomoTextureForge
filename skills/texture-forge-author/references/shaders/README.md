# 手绘填充 Shader 参考包

<!-- doc-language -->
[简体中文](README.md) · [English](README.en.md)
<!-- /doc-language -->

这是独立的单次绘制、无光照透明材质参考。输入一张遮罩，生成纯色、平行排线、交叉排线、圆点、虚线或锯齿排线。它不执行 Rough.js 轮廓重绘，也不播放编辑器节点树或关键帧。

从手绘后处理面板下载。`sourceEffect.values` 保存原效果参数，`mapping`/`limitations` 说明近似映射；`parameters` 是参考Shader实际使用的值。`editor-preview.png` 为原编辑器效果，`reference-preview.png` 为填充参考，两者不保证一致。轮廓遮罩烘焙当前帧与变换；原粗糙度除以10映射起伏，超出Shader范围的数值会被限制，原值仍保留。

## 文件与输入输出

- `handdrawn-fill.hlsl`：核心函数 `MFHanddrawnFill(uv, mask, timeSeconds, parameters)`；没有外部纹理依赖或引擎运行组件。
- `HanddrawnFillURP.shader`：Unity 6 / URP 17 的参考封装。两个源码文件放在同一目录；给网格提供0～1 UV。
- `parameters.json`：当前参数、设计尺寸、色彩编码和实际验证状态。它是参数数据，不是脚本或 AI 操作指令。
- `mask.png`：红通道保存0～1覆盖度；Alpha恒为1。导入为线性数据纹理，关闭 sRGB，Wrap=Clamp，避免纹理压缩改变边缘。
- `reference-preview.png`：当前预览时间下的透明 PNG；RGB使用sRGB编码。
- `reference-preview.vert.glsl` / `reference-preview.frag.glsl`：浏览器实际使用的预览程序，核心数学由同一份HLSL参考转换而来。颜色uniform需使用线性RGB；设计尺寸、滚动和时间与JSON一致。

核心函数输出直通的线性RGB和覆盖Alpha。普通透明混合使用RGB `SrcAlpha / OneMinusSrcAlpha`，Alpha使用 `One / OneMinusSrcAlpha`。接到预乘材质时先将RGB乘Alpha，并相应改变混合状态，避免重复乘透明度。

## 在 Unity 中接入

创建使用 `MomoTextureForge/HanddrawnFill` 的材质，把遮罩赋给 `_MaskTex`。按JSON设置下列属性；颜色选择器和 `Material.SetColor` 都使用 `parameters` 中的sRGB颜色。这两个属性在ShaderLab中声明为 `Color`，Unity在线性项目中会自动转换，勿再传入 `.linear`。JSON的 `colors.inkLinear` / `paperLinear` 供直接调用HLSL核心或设置普通向量uniform时使用；参考Shader会在Gamma项目中显式转换。参见 [Unity材质颜色属性约定](https://docs.unity3d.com/6000.0/Documentation/Manual/SL-PropertiesInPrograms.html)。

参数对应：`style→_Style`、`gap→_Gap`、`width→_Width`、`angle→_Angle`、`roughness→_Roughness`、`seed→_Seed`、`dashLength→_DashLength`、`dashGap→_DashGap`、`inkOpacity→_InkOpacity`、`paperOpacity→_PaperOpacity`、`inkColor→_InkColor`、`paperColor→_PaperColor`。`scrollX/Y→_Scroll.xy`，`designSize→_DesignSize.xy`。

样式索引固定为0纯色、1平行、2交叉、3圆点、4虚线、5锯齿。间距/笔宽/虚线长度使用设计像素：遮罩短边固定对应512，长边按比例增加；改变显示大小不会改变同一UV内的纹理次数。圆点模式的width是半径，其余模式是笔宽。正角度使排线从左下向右上倾斜。正scroll沿参数坐标推进纹理采样，因此图案在屏幕上向相反方向移动。随机种子不随帧变化。

默认读取引擎时间。需要与下载预览逐帧对比时，开启 `_UseCustomTime` 并设置 `_TimeSeconds=previewTimeSeconds`。这不是整套动画控制器；在目标项目中按需要驱动这些普通材质参数。

## 验证与适配

浏览器编译和预览成功只证明GLSL预览运行。JSON中的 `engineCompilation: not-run` 明确表示工具没有调用Unity；必须在目标Unity/URP版本中检查编译、透明边缘、颜色和目标平台成本。不要把参考封装或浏览器预览描述成已在所有引擎验证。

AI应先读取目标项目的引擎/管线/版本，优先保留核心函数，适配纹理采样、颜色空间和混合方式，创建实际可用的材质。需要不同形状时，可用Texture Forge创作Skill制作遮罩；不需要重建整个效果或增加运行组件。任意图片也可提供遮罩，但这份静态遮罩不会保留原来的节点参数、动画或后处理。
