# Unity 标准 Shader 资源

<!-- doc-language -->
[简体中文](unity-modules.md) · [English](unity-modules.en.md)
<!-- /doc-language -->

图形的 Unity 模块是该图形在目标引擎中的可调实现，同时供用户学习、直接使用和 AI 组合参考。先遵守[引擎接入规则](engine-integration.md)。已有模块必须优先读取和复用，不再让 AI 把同一份 GLSL 翻译一遍。当前正式目标为 Unity 2022.3 / URP 14。

## 读取与提取

原生项目和图形资源 ZIP 会携带图形的 Shader/HLSL、参数映射、导入器和必要依赖。图形文件在 `shaders/资源哈希/`；作品使用的后处理在 `engine-shaders/effects/效果ID/`。`manifest.json` 的资源描述符列出精确路径。内容完整性随资源校验，改名不改变实现绑定；算法变化会使旧绑定失效。

组合与手绘 Shader 下载附带的 `source-project.zip` 只保存主画布与实际依赖，不复制编辑器的整个图形列表。`source.archiveSHA256` 标识传入快照（无快照时标识包内参考项目）；`packagedArchiveSHA256` 校验包内参考项目。原生项目保存仍保留其图形列表。

不需要浏览器即可提取已提供的源码：

```sh
node scripts/texforge.mjs modules source.project.zip --output engine-modules
```

先读生成的 `index.json`，再只读取相关模块的源码和接入说明。命令提取现有文件，不生成新 Shader，不执行自定义 C#，也不声明已经通过 Unity 验收。没有模块的资源会缺席，不能因此跳过作品中的对应效果。

连接网页时，先 `forge_pages` 确认目标并捕获新鲜快照。`forge_resource` 针对实际依赖保存原生资源 JSON，并返回 `shaderModules` 中的源码绝对路径、参数映射和目标。直接读这些文件；原生 JSON 中仍保留完整资源。不要读取其他标签页或整个用户图库。

## 图形模块

下载保留正式 Shader/HLSL，不随参数变化重新翻译。当前图形参数值写入 `Unity/parameters.json`；参数按稳定 `variable` 与 `slot` 对应材质 `property`。半径、线宽、羽化、种子、速度等属于图形的所有参数都必须保留原生语义和有效范围，不能把它们固化为代码常量。

将 `Unity/` 中除 `Shared/` 外的文件放入 `Assets/MomoTextureForge/Graphics/图形ID/`；`Shared/` 合并到 `Assets/MomoTextureForge/Shared/`，图形与后处理共用一份。用包内 Assets → Momo Texture Forge 导入器选择该图形的 `parameters.json`。也可创建材质并设置属性。公式时间为秒，`_MF_UseExplicitTime=1` 时由 `_MF_Seconds` 驱动；自动时间使用 Unity `_Time.y`。输出透明区域不含画布背景。颜色在 Linear 工程最终转线性并预乘；透明混合为 One / OneMinusSrcAlpha。

节点额外挂载的配色、变换、排列、关键帧与后处理由相应模块或组合代码处理；基础图形包不冒充整个节点或作品。具体受限组合出口见[实时图形与组合](realtime-shaders.md)。

同一图形模块只导入一份。更新参数时替换或另存 `parameters.json`，重新运行导入器创建新材质，避免重复 C# 类。

直接图形材质适用于 UV0 Mesh。需要匹配编辑器的 2 倍栅格采样时，使用 `MomoGraphicRenderer`，赋予 `sourceMaterial` 与包内 `GraphicResolve` Shader，调用 `Render(material, seconds, width, height, 2)`。输出为预乘、数值 sRGB 的线性 ARGBHalf RT；接入后处理时设置 `inputIsLinear=false`、`inputIsPremultiplied=true`。组件会在每次绘制前清空中间目标，并复用、按尺寸重建和释放资源。

图形渲染器由脚本调用时设置 `automaticUpdate=false`，由调用方管理时间与更新顺序；自动模式使用 `sourceMaterial`，`automaticTime=false` 时读取 `seconds`。

## 图像后处理模块

效果卡片下载默认参数模块，已添加的效果面板下载当前参数。将包内 `Unity/` 内容合并到 `Assets/MomoTextureForge/`，保持 `Shared/` 和 `Postprocess/` 结构，多个模块共用一份 Shared，避免重复 C# 类。使用 Assets → Momo Texture Forge → Import postprocess module 选择该模块的 `parameters.json`，得到带正式 Shader 引用的预制体。

组件暴露所有自身参数。`input` 可接图片或实时 RenderTexture；`Render(input, seconds)` 显式更新，默认也可自动更新。声明 `inputIsLinear` 与 `inputIsPremultiplied`。输出是线性 ARGBHalf RT 中的**预乘、数值 sRGB RGBA**，与网页中间合成一致；链入下一个模块时使用 `inputIsLinear=false`、`inputIsPremultiplied=true`。显示到 Linear 场景前需要转换输出颜色。法线 `heightMode`：0 读取 alpha，1 读取亮度，2 使用显式 `heightInput`。半径按 512 像素短边基准缩放。

最终显示可用包内 `MomoTextureForge/Display/NumericSRGB` Shader 创建透明 UV0 Mesh 材质，将 `_MainTex` 设为图形渲染器或最后一个后处理的 `Output`。此 Shader 负责数值 sRGB 到项目显示颜色空间的转换和预乘混合；不要把中间 RT 当作已经线性化的颜色直接显示。

模糊/泛光保留所需中间绘制步骤。组件负责输入/尺寸变化、临时 RT 回收以及禁用/销毁释放。按原生顺序连接效果，不能把多步骤实现简化成一个相似片段。手绘另使用[统一手绘模块](handdrawn-postprocess.md)，其完整参数支持仍按实际报告判断，不能套用其他后处理的输入契约。

后处理自动更新使用 `input` 与组件时间。完全由脚本按顺序调用 `Render` 时，先将组件 `enabled=false`，再逐帧调用公开方法，避免其 `LateUpdate` 再次自动刷新或因空 `input` 回收结果；销毁组件仍会释放资源。


Render 要求 GameObject 处于 activeInHierarchy；可禁用组件来手动更新，但不能在从未激活的对象上分配运行资源。未激活对象会在分配前明确报错。

手绘在离线提取索引中标记为 `shared-source-template`：共享源码可供参考，但实际参数、命名空间与支持检查仍需通过 `project shader-support` 和 `--shader-mode postprocess` 生成交付包，不能把模板直接当作完整 Prefab 包导入。

## 自定义资源也可携带实现

资源对象可提供 `engineShaders.unity`，schema 为 `momo.engine-shader/v1`。它包含 `id`、`kind: "graphic"`、`target`、`shaderFile`、`hlslFile`、完整 `parameters`、`files` 与原生 `sourceSignature`。`parameters` 的每项以 `variable`、`slot`、`property` 绑定自身参数；`files` 为相对安全路径到 UTF-8 源码的映射，并包含 `Unity/parameters.json` 与正式导入依赖。

公式/生成器创作 JSON 可提供同一 `engineShaders` 字段；首次提供时可省略 `sourceSignature`，导入器会绑定实际解析后的源码。已有绑定不能在算法改变后原样沿用。保存、分享、远程图库和离线提取都会保留文件。新增这种资源不需要修改框架中的图形名单；未提供实现的图形仍正常在编辑器使用，只不宣称有 Unity 模块。

## 验收

统一按批次验证编译、全部自身参数映射/响应、代表性时间、透明/深浅背景、不同输入尺寸、导入保存重开与资源释放。低分辨率下，编辑器中间栅格过滤与解析采样可能有边缘差异；记录实际误差和参考分辨率，明显结构或参数语义差异不能作为完整支持发布。

浏览器对照、HLSL 编译、Unity 编译与视觉、Player/移动端分别记录。包内状态是来源信息，不代替目标工程验证。交付明确列出复用、适配与新增部分。
