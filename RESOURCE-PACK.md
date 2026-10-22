# 图形资源包 v1

<!-- doc-language -->
[简体中文](RESOURCE-PACK.md) · [English](RESOURCE-PACK.en.md)
<!-- /doc-language -->

项目、组件、组件库与基础图形使用同一个 ZIP 容器。旧 JSON 仍可导入；JSON 不含外部依赖。生成图片的 PNG/EXR/序列帧导出不受影响。

## 文件布局

```text
manifest.json             包格式、公式接口版本、入口及图形资源索引
content.json              作品、组件、组件列表或纯图形入口
shapes/<sha256>.json      图形定义及公式/图片引用
formulas/<sha256>.glsl    公式正文与依赖函数库
images/<sha256>.png       原始图片（也支持 JPEG/WebP）
```

manifest 的 `schema` 为 `momo.texture-pack/v1`，基础 `abi` 为 `momo-pattern/16-v1`，含生成器时为 `momo-pattern/16-v1+generator-v1`，`content` 指向入口 JSON。`assets` 是 `{id, hash, file}` 数组：id 为节点引用的图形标识；hash 为解析后资源的规范 JSON 的 SHA-256；file 指向图形定义。所有路径均相对包根目录，不允许绝对路径、外部 URL、空路径段、`..` 或重复文件名。

入口 schema 支持 `momo.texture-tree/v1`（项目）、`momo.texture-subtree/v1`（单组件）、`momo.texture-library/v1`（presets 数组）、`momo.texture-assets/v1`（纯基础图形，无节点）。

图形资源含 `kind: formula | image`、`definition`、`libraries`。definition 沿用现有 `momo.texture-pattern/v1` 定义与 16 槽参数 ABI；输出与无缝公式的 `file` 指向公式正文，libraries 的每个条目为 `{file}`。图片额外含 `mime` 与 `file`。公式可以是 expression 或 body，包含完整参数定义，不需要写成一行。参数槽与 key 保持现有契约，不在这次迁移中重排。

图片支持原色与透明度、亮度遮罩和透明度遮罩；原色模式保留RGBA，高度使用亮度乘透明度。支持UV、排列、蒙版和动画，原图分辨率限制放大细节。有处理的位图保存时固化最终结果，SVG保留源路径。

## 使用方式

- **保存项目**：当前画布及其依赖导出ZIP；用“打开项目”恢复。
- **图形库 → 导出资源**：导出勾选资源及依赖，外层图库ZIP索引完整的单资源包；也可导出单项资源。
- **创建资源 → 导入文件**：接受正式资源/图库ZIP及支持的创作或旧版JSON，项目ZIP使用“打开项目”。
- **创建资源 → 图片**：导入PNG/JPEG/WebP/SVG。
- 图形列表独立保存在浏览器；项目只打包画布依赖，不作为整个常用列表的备份。

导出会包含用到的内置图形定义与函数库，因此对方不必拥有同一基础图库，但必须实现兼容的公式 ABI。蒙版以及排列的密度图引用（含密度图关键帧）也会收集；包中的密度引用先使用图形 ID，导入时转换为本地运行时索引。相同公式文件按内容去重。矢量函数库作为完整依赖文件保留。

## 修改公式并重新打包

1. 在基础图形卡片导出资源包，然后解压。
2. 修改 shapes 中的名称、参数定义，及其引用的 GLSL 文件。不要删除被引用的函数库。
3. 在工具目录运行：

```shell
node pack-resource-folder.mjs ./我的解压目录 ./我的图形.zip
```

脚本会重新生成内容哈希与索引。旧 ZIP 解压后手改文件再直接压缩，会因校验值不一致被拒绝；应使用该脚本更新校验信息。公式资源也可在图形库的编辑窗口修改并保存。

## 导入与持久化

先检查 ZIP CRC、路径、数量、解压长度、依赖与 SHA-256，再验证图形定义、解码图片并试编译/绘制普通与无缝模式。成功后保存。资源使用 IndexedDB；项目草稿和组件节点仍使用现有 localStorage。

与本机内置图形完全相同的资源复用内置 ID。不同内容使用 `asset_<sha256>` 标识；同名不会替换已有图形，同内容重复导入不会增加资源副本。组件本身仍追加为独立组件。失败时撤回临时注册的资源，并报告错误。

支持 ZIP Store 和 Deflate；不支持加密、多卷或 ZIP64。包与解压后总内容最多 64 MiB，单文件最多 16 MiB、4096 个文件；旧的256个自定义资源与40个组件数量限制已移除；图片尺寸最多 4096×4096。公式接口不兼容或显卡无法编译时明确拒绝导入，不静默替换为圆形。浏览器可能另有存储配额限制。

`validate-resource-pack.html` 提供独立 GPU 往返验证页，不修改用户项目或持久化组件库。

## 多语言参数元数据

图形 definition 的 parameters 携带稳定 variable 和可选 aliases，选项同理。导入导出不按当前显示语言改写这些元数据。别名本身参与内容哈希；切换浏览器语言偏好不参与哈希。读取旧 label-only 资源时保持原始描述符及校验哈希，在显示边界兼容为中文别名。完整规则见[语言与参数别名](docs/12-language-and-aliases.md)。
