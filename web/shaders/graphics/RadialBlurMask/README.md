# RadialBlurMask · Unity 图形模块

<!-- doc-language -->
[简体中文](README.md) · [English](README.en.md)
<!-- /doc-language -->

将 Unity 中除 Shared 外的文件放入 `Assets/MomoTextureForge/Graphics/<图形ID>`；Shared 合并到 Assets/MomoTextureForge/Shared，只保留一份，供图形与后处理共用。使用 Assets → Momo Texture Forge 菜单导入本包 parameters.json，或创建材质选择包内 Shader。图形参数映射见 module.json；参数以原生单位保存，时间为秒，透明区域不包含画布背景。源码与运行参数分开，分享资源时保留整个模块。

支持透明无光照 Mesh、UV0。线性项目转换最终输出颜色；UI 遮罩、粒子专用输入需要目标工程适配。HLSL 编译通过不代表已经完成 Unity 视觉验收。

同一图形模块只导入一份。更新参数时替换或另存 parameters.json，再次运行导入器创建新材质；不要把同一 Shader 与导入器重复复制到另一个目录。

需要匹配编辑器的栅格过滤时，将导入材质赋给 MomoGraphicRenderer.sourceMaterial，并将 GraphicResolve Shader 赋给 resolveShader。调用 Render(material, seconds, width, height, 2)，得到预乘、数值 sRGB 的线性 ARGBHalf RT；接后处理时使用 inputIsLinear=false、inputIsPremultiplied=true。最终显示用 MomoTextureForge/Display/NumericSRGB 材质，将 _MainTex 设为 Output，支持透明 UV0 Mesh。也可直接使用图形材质而不创建 RT。每种模块与导入器只保留一份；替换或另存 parameters.json 可导入更多材质。

Render 要求 GameObject 处于 activeInHierarchy；可禁用组件来手动更新，但不能在从未激活的对象上分配运行资源。未激活对象会在分配前明确报错。
