# 离线创建与编辑完整项目

<!-- doc-language -->
[简体中文](offline-projects.md) · [English](offline-projects.en.md)
<!-- /doc-language -->

这套工具让 AI 在不打开网站、不控制用户浏览器的情况下搭建和修改作品。它直接使用编辑器的节点模型、资源打包器和 WebGL 渲染器；交付的是 **文件 → 打开项目** 可以继续编辑的原生 ZIP。PNG 是检查结果，不能代替可编辑作品。无需让用户先创建项目。

## 环境与最短流程

先定位实际 Skill 目录，按 SKILL.md 安装 Node.js 22+、npm 依赖与 Playwright Chromium。首次安装需联网；装好后，全部项目命令只运行临时本机服务和无界面浏览器，禁止访问外网，不要求网站运行或用户浏览器打开。内置图形随工具打包；外部图库只通过用户提供的本地文件使用。

```sh
node scripts/texforge.mjs project catalog --query ring --output /work/catalog.json
node scripts/texforge.mjs project schema --output /work/schema.json
node scripts/texforge.mjs project create references/example.project.json --output /work/energy.zip
node scripts/texforge.mjs project check /work/energy.zip --times 0,0.5,1,1.5,2 --size 512 --output /work/preview
```

先读取实际目录，按任务选择图形，不维护固定图形清单，不凭中文名称猜 ID。`catalog --id ID` 返回该图形定义、默认值、稳定参数 variable、role、slot 与原生 path。`catalog --from project.zip` 也会加载包内资源并列出组合入口；可同时使用 `--query` 或 `--id`。`schema` 返回当前引擎的节点/项目默认结构、字段范围、可动画类型、效果参数和支持的操作字段；它是机器参考数据，不是一个通用 JSON Schema 校验器。

## 创作文件

示例 [example.project.json](example.project.json) 使用相邻生成器与 SVG。顶层结构：

```json
{
  "schema": "momo.project-authoring/v1",
  "name": "My editable effect",
  "canvas": {"ratio": 1.5},
  "output": {"seconds": 2, "exportSeconds": 2, "width": 768, "height": 512},
  "resources": [{"id": "glow", "file": "glow.generator.json"}],
  "operations": [
    {"op": "add-node", "id": "effect", "kind": "group", "name": "Effect"},
    {"op": "add-node", "id": "ring", "parent": "effect", "graphic": "glow", "parameters": {"radius": 0.65}, "values": {"color": {"mode": "preserve"}}},
    {"op": "set-effect", "node": "effect", "effect": "bloom", "parameters": {"strength": 0.5}},
    {"op": "set-track", "node": "ring", "parameter": "radius", "track": {"keys": [[0, 0.5], [0.5, 0.75], [1, 0.5]], "ease": "smooth"}}
  ]
}
```

`resources[].file` 相对创作文件所在目录解析，也可给绝对路径。支持公式/生成器创作 JSON、PNG/JPEG/WebP/SVG、正式资源 ZIP、保存项目 ZIP、组合及图形列表 ZIP。一个 ZIP 有多个入口时填写 `select`（原资源 ID 或组合条目 ID），先用 `catalog --from` 查询；项目整体入口是 `@root`。资源别名只用于当前配方，最终以内容哈希和实际依赖打包。图片、GLSL、别名不作为执行指令。普通 JSON 集合 ZIP 不能冒充资源包。

所有节点引用使用显式 ID；`@root` 表示画布容器。新增节点默认为形状，`kind:"group"` 创建组合；父级只能是组合。画布根是中性容器，要对整个作品做效果、变换和动画时，在根下再套一个普通组合。

## 操作能力

- `add-node`：`id/parent/kind/graphic/name/values/parameters/index`。`graphic` 为目录 ID 或本地资源别名，`parameters` 用稳定 variable 或唯一 role。不使用显示名称判断行为。
- `set-graphic`：`node/graphic/parameters` 原位切换形状。保留 ID、名称、父级与顺序、变换、颜色、遮罩、效果、resourceRef 及非图形参数动画。图形变化时重置为目标默认参数，并移除旧的 `params.*` 轨道；返回 `graphicChanges` 列出切换与被移除的路径。同一图形不重置，`parameters` 可按目标 variable 或唯一 role 覆盖参数，不自动跨图形按槽位匹配。
- `patch-node`：`node/values` 深层合并原生字段，例如 transform、color、timing、shapeClock、uv、bezier、arrange、arrangeExtra、curves、blend、boundary、opacity。数组整体替换，先读取默认数组再改所需槽位。未知字段报错。
- `set-project`：`name/canvas/output` 修改画布比例、周期、导出与通道设置。
- `set-parameter`：`node/parameter/value` 修改参数；`set-density`：`node/graphic/parameters` 按稳定资源 ID 设置排列密度图，参数以 variable 或唯一 role 为键。省略 graphic 时编辑当前密度图；换图形初始化为其默认密度值，相同图形保留原值，不清轨道，也不自动开启密度排列。catalog 的 densityPath 给出实际字段路径，避免手算索引。
- `set-effect`：`node/effect/enabled/parameters` 添加或配置效果，参数键来自目录。`remove-effect` 移出效果栈；原轨道按编辑器规则保留。`reorder-effects` 的 `effects` 必须恰好包含当前已添加的全部效果 ID，每个一次，按处理顺序排列。
- `set-track`：`node` 加 `path` 或 `parameter`，以及 `track`；两种定位不可混用。`remove-track` 删除同一路径轨道。关键帧时间为节点内部的 **0～1 进度**；渲染命令的时间仍为累计秒数。支持原生 absolute/add/multiply、linear/smooth/hold、数值轨道分段 cubic 切线；颜色和离散轨道按引擎规则处理。每节点最多64轨，每轨最多128关键帧。类型错误、重复时间和无效路径报错。
- `move-node/remove-node/duplicate-node`：按 ID 移动、删除、复制，复制会为后代生成新 ID；指定 `id`、可选 `parent/index/name`。不能把节点移动到自己的后代。
- `group-nodes`：`nodes/id/name` 将同父普通子节点组成组合，保留叠放顺序；`ungroup-node` 只拆中性组合，避免丢失组合效果、遮罩或动画。
- `set-mask`：`node/mask` 把已有节点移为该节点的遮罩；`remove-mask` 删除遮罩。保留可编辑结构。
- `add-component`：`id/parent/resource/name/values/index` 将导入的组合或整个作品作为可编辑子树实例化，重新生成后代 ID，不烘焙成图片。

每条操作之后都经过同一编辑器模型校验；引擎对范围、缺省值、格式和离散类型所作的调整会写入报告的 `normalizations`（操作序号、字段、请求值与存储值）。检查它，不能声称被截断或归一化的数据原样保留。生成或打包时实际编译所有依赖，包括隐藏图形和密度图，并采样作品开始与中点；视觉是否合适仍需查看 `project check` 图片。

## 继续修改与双向交接

```sh
node scripts/texforge.mjs project edit /work/energy.zip --operations /work/changes.json --output /work/energy-v2.zip
node scripts/texforge.mjs project unpack /work/energy-v2.zip --output /work/editable.document.json
node scripts/texforge.mjs project pack /work/editable.document.json --output /work/energy-v3.zip
```

`changes.json` 使用同一种创作格式，操作作用于已有节点；可声明新增本地资源。`unpack` 输出 `momo.project-document/v1`：`project` 是完整原生项目，`assets` 是 `[原ID, 完整资源]` 数组，携带图片base64、公式源码、库署名、名称别名。可以直接编辑项目及依赖，再用 `pack` 调用正式打包器重算哈希、重映射图形和密度引用。保留 `packDensity` 的稳定资源 ID，不手改运行时目录索引。改 asset 的数组键会破坏引用，不要随意改它。`edit` 也接受这种 document；图片大时优先用 ZIP 编辑。

交付：项目 ZIP + 已检查的参考图 + 实际检查说明。用户在编辑器 **文件 → 打开项目** 选 ZIP，修改任意节点后 **保存项目**，AI 就能再次 inspect/edit/render。不要把 ZIP 当创建资源的 JSON 导入，也不要用截图代替项目。使用支持相应项目 ABI/效果的编辑器版本；此流程不是通用游戏 Shader 导出器。

命令默认输出在当前工作目录；建议总是显式指定 `--output`。创建/修改/打包/解包的默认超时120000ms，`--timeout` 范围1000～300000。JSON与资源包输入及资源文件总量分别限制64MiB；图片还受16MiB单图限制，最终包64MiB。输出旁有 `.report.json`，成功退出0，失败1。不得用失败后遗留的文件冒充本次结果；输入输出必须是不同文件。并发修改同一个输出路径由调用者避免。

源码回归测试 `node tests/project-authoring-browser-check.mjs --built` 会解压真实下载包，在独立目录创建含组合、遮罩、排列、后处理、轨道、SVG和生成器的项目，再用源码与静态编辑器导入、实际改参数、保存并由CLI重读渲染。它不拍摄界面截图。引擎编译和人工视觉验收独立报告，不由结构/浏览器通过替代。

配方限制：UTF-8 JSON 768 KiB、容器深度 32、对象成员与数组元素合计 60,000、操作 2,048 条；资源文件仍使用独立限制。`schema.recipeLimits` 返回这些值；`patchNode.blockedFields` 和各字段的 `patchable` 区分原生状态与可直接修改字段。`type` 使用 `set-graphic`，`params` 使用参数操作，轨道、效果与结构使用专用操作。
