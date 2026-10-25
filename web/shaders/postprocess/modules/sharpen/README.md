# Unity 后处理模块 · sharpen

<!-- doc-language -->
[简体中文](README.md) · [English](README.en.md)
<!-- /doc-language -->

将 Unity 文件夹内容合并到 Assets/MomoTextureForge，保持 Shared 与 Postprocess 结构；多个模块共用同一份 Shared，勿复制为多份 C# 类。通过 Assets → Momo Texture Forge → Import postprocess module 导入本模块 parameters.json，创建带正式 Shader 引用的预制体；设置 input 为图片或实时 RT。完整参数、类型、范围与绑定见 module.json。可调用 Render(input, seconds) 显式更新；默认自动更新，时间为秒。

输入可声明线性 RGB 与预乘状态；输出为预乘、数值 sRGB 的线性 ARGBHalf RT，与网页中间合成一致。链入下一模块时设置 inputIsLinear=false、inputIsPremultiplied=true。法线的 heightMode=0 用 alpha、1 用亮度、2 用显式 heightInput。半径使用 512 像素短边基准。禁用/销毁释放运行资源。目标 Unity 2022.3 / URP 14；HLSL 编译通过不代表目标引擎视觉验收。

最终显示可创建 MomoTextureForge/Display/NumericSRGB 材质，将 _MainTex 设为组件 Output，用于透明 UV0 Mesh；该材质负责将数值 sRGB 输出转换为目标项目的显示颜色空间。

自动更新读取 input；需要脚本完全控制 Render 调用顺序与时间时，先将组件 enabled=false，再调用公开 Render 方法；销毁仍会释放资源。

Render 要求 GameObject 处于 activeInHierarchy；可禁用组件来手动更新，但不能在从未激活的对象上分配运行资源。未激活对象会在分配前明确报错。
