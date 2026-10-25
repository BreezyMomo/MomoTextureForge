# 实时作品 Shader

<!-- doc-language -->
[简体中文](realtime-shaders.md) · [English](realtime-shaders.en.md)
<!-- /doc-language -->

先遵守[游戏引擎接入通用规则](engine-integration.md)。本页仅描述当前 Unity 图形模块与受限组合交付；通用复用优先级不受这些当前支持项限制。

图形和后处理优先使用[随资源交付的标准 Unity 模块](unity-modules.md)：直接读取正式源码与完整自身参数映射，无需让 AI 重复翻译。本文以下的解析组合出口是额外的受限能力，不提供任意画布的一键转换。复杂作品由 AI 读取原生项目，连接已有模块并补齐缺口，再在目标工程验证。手绘另使用[统一后处理](handdrawn-postprocess.md)。

## 受限组合出口

动画手绘、不使用预烘焙边框贴图时，改读[实时轮廓与逐笔填充](handdrawn-postprocess.md)，从支持报告选择明确的动态模式；解析单Pass仅用于无后处理图形；轻量与冻结出口均退役。

| 类别 | 范围 |
| --- | --- |
| 图形 | 已携带兼容标准模块的当前源码，逐节点查询实际支持；自定义资源可自带 Unity 实现 |
| 变换 | 静态位置、宽高、轴心、旋转、镜像、contain/stretch；静态 UV 缩放、旋转、偏移、扭曲 |
| 配色 | 继承、保留、独立纯色或双色渐变；透明度 |
| 合成 | 原生 over/add/max/multiply/subtract/screen/difference/overlay/softlight/dodge、同级 mask/inverseMask、附加蒙版的高度通道 |
| 时间 | 公式持续秒数、各节点公式时钟速度/偏移/冻结；导出时长不是无缝周期 |
| 暂不支持 | 关键帧/节点时间重映射、排列、重复或越界、UV滚动/极坐标、多色渐变/重映射、后处理/曲线/轮廓、图片及未审查公式 |

逐节点查询会返回 `nodeId`、能力、原因与适配路线。遇到不支持项，整幅实时导出失败；不会跳过、自动烘焙或修改作品。需要邻域采样的模糊/辉光使用独立后处理模块，不在此解析组合出口中跳过；手绘不通过此解析出口跳过后处理，统一使用 postprocess。

## 离线 CLI

从实际 Skill 安装目录运行：

```sh
node scripts/texforge.mjs project shader-support source.project.zip --output support.json
node scripts/texforge.mjs project shader source.project.zip --shader-mode realtime --times 0,.75,1.5,2.25,3 --size 256 --output realtime-shader.zip
```

不传 `--node` 导出完整主画布；传入时为该节点的原生 solo 语义，排除父级和兄弟节点。`--shader-mode auto` 遇到手绘阶段会使用统一后处理或明确失败；显式手绘用 `--shader-mode postprocess --handdrawn-input auto --node ID --time 1.5`，不再使用已退役的 handdrawn 模式。新增适配先读[职责与扩展规范](shader-architecture.md)。

## 已连接网页的 MCP

先按[连接约定](live-editor.md)确认页面并捕获快照。用同一新鲜 `snapshotId`：

```json
{"snapshotId":"实际快照ID","kind":"shader-support"}
```

支持后调用 `forge_deliver`：

```json
{"snapshotId":"实际快照ID","kind":"shader","shaderMode":"realtime","times":[0,0.75,1.5,2.25,3],"size":256}
```

输出文件在 MCP 主机，不会修改画布或 AI 客户端配置。CLI／MCP 的解析组合出口仅覆盖上表子集，不作为网页通用导出项。网页选中已适配的图形节点，在 **图形 → 图形选择 → Unity 图形 Shader** 下载独立图形模块：只取当前基础参数，不含节点配色、变换、排列、关键帧、合成或后处理。该下载不是原作品的完整实时还原。

## 产物与 Unity 接入

ZIP 的 `Unity/` 包含独立前缀的 `.shader`、`.hlsl`、`parameters.json` 与 `Editor/*Importer.cs`。将整个目录内容复制进目标项目 `Assets/` 下的独立文件夹，保留层级；目标为 **Unity 2022.3 / URP 14 / Mesh UV0 / 无光照透明 Pass**，不是内置管线、UI stencil 或粒子顶点流的通用适配。

启用 URP 资产后，使用 **Assets → Momo Texture Forge → Import <包编号> material** 选择对应 `parameters.json`。导入器创建新材质、检查 Shader 错误，不覆盖旧资产；也可调用该包独立 C# 命名空间的 `MaterialImporter.ImportFile`。每包 Shader 名、文件和导入器命名空间独立；同类型节点参数也独立。

`parameters.json` 使用 `momo.realtime-shader/v1`，包含实际属性、`nodeId → properties` 映射、源码与原包哈希、可选源快照、目标版本、时间/UV/设计比例、输入贴图清单（首批为空）、支持报告与验证状态。`source-project.zip` 保留完整原始作品依赖；`sources/` 保留本次算法源码和图结构。

核心按编辑器语义计算 **sRGB 数值预乘 RGB + 覆盖 alpha**；URP 最后在 Linear 项目转换直通颜色再预乘。ShaderLab 使用 `Blend One OneMinusSrcAlpha`。配色属性为 sRGB 数值 **Vector**，用 `SetVector`，不要再次 `.linear` 或重复乘 alpha。公式强度是覆盖，已提供正式模块的 RGBA 生成器保留原色并单独计算标量高度；附加蒙版读取高度，同级 mask 读取 alpha。

自动时间为 `_Time.y` 秒；逐帧对比用 `_MF_UseExplicitTime=1` 和 `_MF_Seconds=0.75`。每节点公式时钟另有映射，属性可由材质实例或 `MaterialPropertyBlock` 驱动。UV0 左下到右上为0–1；网格比例需匹配 `uv.designAspect`。材质输出透明覆盖，不烘入画布背景或高度/法线输出选择；原设置单独记录在 manifest。

`reference-*.png` 是原生透明背景直通 RGBA，`generated-*.png` 是解析程序预览。黑白背景误差记录为 `verification.frames`。原生渲染有中间纹理采样，解析程序可能出现少量边界差异；浏览器通过不是引擎通过。工具始终保持 `engineCompilation=not-run`，真实 Unity 编译、播放、参数修改与多背景对照由消费工程另行记录。不要把 HLSL 核心编译等同于整个 URP Shader 编译。
