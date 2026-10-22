# 图案定义与公式文件

每个内置图案各自拥有独立目录和配置，由 `web/definitions/builtin.json` 的有序索引注册；公共数学/周期/矢量函数在 `libraries/`。启动时校验并读取本地资源，浏览器和 Node 使用同一份定义，不需要生成步骤或生产依赖。现有参数面板、图层/蒙版、动画、排列、平铺、法线与导出消费这份目录；宿主多 pass 渲染和编码逻辑保留。

`NaturalWood`（自然木纹）追加于目录末尾，使用16参数与独立的 `natural-wood-v1` 库，函数统一为 `nw` 前缀，避免与用户导入的木纹创作文件冲突。内置记录保留可移植创作源码，编辑器可以继续编辑和导出参数。原有 `Wood` 及其它图案索引不变。

```text
web/definitions/
  builtin.json                 # 分类、公共库、{id,file} 图案索引
  libraries/                   # 共享 GLSL 数学函数
  patterns/
    Circle/
      pattern.json             # 该图案的完整配置
      formula.glsl             # 普通公式
    Brick/
      pattern.json
      formula.glsl
      periodic.glsl            # 可选：原生周期公式
```

本轮完成结构与内置图案迁移，暂未提供公式上传/编辑 UI。直接编辑文件后刷新可重新加载；更新旧版本运行中的服务时先重启 `start.bat`，服务需要支持 JSON/GLSL MIME 与同源静态资源读取。配置不是 JavaScript，不使用 eval；GLSL 资源仍是可信本地开发输入，结构校验不是任意代码的安全沙箱。

## 目录结构

索引根 `schema` 为 `momo.texture-index/v1`，包含正整数 `revision`、`abi: momo-pattern/16-v1`、有序 `categories`、具名 `libraries` 和有序 `patterns` 引用。每条引用为 `{id,file}`，例如 `{ "id":"Circle", "file":"patterns/Circle/pattern.json" }`。引用路径相对索引 JSON，ID 必须与实际配置相符，路径不能重复。分类为 `{id,name}`；函数库为 `{file,abi}`，其 `.glsl` 路径也相对索引。目录使用 `math-v1`；内置周期和矢量路径另外声明 `periodic-v1`/`vector-v1`。

完整图案记录放在每个目录的 `pattern.json`。其中公式路径相对该配置文件，例如 `formula.glsl`、`periodic.glsl`；不需要知道图案在全目录中的路径。API/CLI 仍接受此前内联 `momo.texture-library/v1` 目录（附带它引用的源文件），运行时先统一解析为已校验的内存目录，消费端无需区分文件组织方式。

每个图案字段：

| 字段 | 契约 |
|---|---|
| schema / revision / abi | `momo.texture-pattern/v1`、正整数版本、`momo-pattern/16-v1` |
| id / name | 稳定英文 ID 与中文显示名；ID 不重复 |
| category / order / variant | 分类 ID、全目录索引、分类内索引；按原有顺序追加，不能重排现有 ID |
| defaults | 16 个有限数值，保留旧槽位；可见槽位必须等于参数 default |
| parameters | `{slot,key,variable,aliases,min,max,step,default}`；最多 16 个，槽位不重复 |
| parameters[].type / options | 公式也可声明 `type:"select"` 与 `{value,variable,aliases}` 选项数组；值须为范围内整数，参数动画按离散值切换 |
| renderPadding | 可选0～0.5的对称渲染留白，仅标量公式可用；不改变主体的0～1坐标、轴心、选区或排列格距 |
| outputs.scalar | 所有图案必需的标量公式描述，供混合/蒙版/排列/高度/法线使用 |
| outputs.vector | 可选 `{library:"vector-v1"}`，图案输出模式使用矢量函数库，标量采样仍保留 |
| seamless | `blend`、`repeat` 或 `periodic`，见下文 |
| editor | `kind: parameters / gear / star / bezier`；复杂编辑器明确声明能力和所需槽位 |

图案例子可直接查看 `patterns/Circle/pattern.json`、`patterns/Gear/pattern.json` 和 `patterns/BezierRibbon/pattern.json`。添加图案时新增目录/配置/公式，再向索引末尾追加引用；为新记录设置全目录末尾 order 和分类内下一个 variant，不重排既有图案。修改现有图案参数或公式只需编辑它自己的文件。参数槽键按顺序固定为 `R W N S D K H T A B C E F G I J`；这些键是 ABI 绑定，显示名称可自由命名。数值数组/关键帧沿用旧 v5 数据；没有把现有项目转换成另一套参数命名。

`PuzzlePiece` 为单块拼图，四边独立选择平边、凸耳、凹口，支持轮廓／实心。槽9选择圆头／方头／燕尾／波浪，槽10调接口圆润度；槽11～14为左上／右上／右下／左下主体圆角，0为直角，最大0.4。主体占满0～1，凸耳在区域外；使用现成网格排列。相邻凹凸使用相同接口参数并镜像同一局部轮廓；主体圆角会在格点留空。该定义以 `renderPadding:0.46` 声明最大局部凸耳范围；新建时 `boundary:visible`。所有节点共用 `boundary:clip|visible|repeat`；渲染器按实际内容、变换、滤镜与祖先需求计算方向性边界，蓝框、轴心及格距独立于纹理留白。普通组合默认裁切，可改为允许超出；最终画布始终裁切。留白图形新建时区域会缩小以完整展示，手动改为区域宽高1则仍受最终画布裁切。资源包保留定义元数据。

## 公式描述和 ABI

公式描述为以下两种之一，`file` 与 `inline` 只能出现一个：

```json
{
  "kind": "expression",
  "file": "formula.glsl",
  "libraries": ["math-v1"]
}
```

`expression` 支持多行表达式，不包含语句、函数定义或分号；宿主生成 `return sat(表达式)`。`body` 是多行函数体，支持局部变量、分支、有限循环和返回值；宿主放入独立 switch case 作用域。body 应返回有限的 0–1 标量，例如：

```glsl
float value=0.;
for(int i=0;i<3;i++) {
  value+=exp(-dot(q,q)/(R*R));
}
return sat(value/3.);
```

完整公共函数可以放在另外的 `.glsl` 库文件中，在目录 `libraries` 声明并由公式引用。额外库按实际依赖合并一次，随后使用既有函数裁剪。依赖列表不能引用未注册库；额外库之间按声明顺序编译，避免重复定义宿主函数。定义不支持外部 URL、`#include`/`#version` 或执行 JavaScript；最终 GLSL 语法/类型仍由 GPU 编译器检验，初始化结构/文件错误直接显示，渲染编译错误走已有错误反馈。

普通公式可访问 `u`（经过该图层 UV 变换的坐标）、`q=u*2.-1.`、`r=length(q)`、`angle=atan(q.y,q.x)`、`time` 和四个原始参数向量 `a/b/c/d`。便利变量 `R/W/N/S` 对应 a，`D/K/H` 对应 b.xyz，`T=time*b.w`；需要原始槽 7 或扩展槽 8–15 时直接使用 b.w/c/d，例如贝塞尔曲线。`sat/fill/line/noise/fbm/profileShape/ribbonShape` 等来自 `math-v1.glsl`，算法没有在迁移中重写。

`periodic` 公式 ABI 沿用 u/a/b/time 和 R/W/N/S/D/K/H/T，只读取前 8 槽；不能把需要 c/d 的普通公式原样塞入此入口。矢量库沿用宿主 `rawVectorAt/vectorAt` 接口及 `{{id:图案ID}}` 索引引用，所有引用 ID 都必须存在；它保留曲度/方向/时间/蒙版、HeightNormal 法线通路和 RG 编码。新增矢量图案还需在该库提供对应分支，不能只设置 vector 标记。

## 无缝与复杂能力

- `blend`：沿用通用边缘融合。
- `repeat`：声明 `extent` 外接范围算法（radius/ring/rectangle/cross/ellipse/polygon/capsule/heart/profile/bezier），宿主约束有效缩放并重复形状；原始编辑值不被覆盖。
- `periodic`：声明独立 `source`、稳定周期 `order`、`countSlot`（可选，默认2，前8槽内的已声明参数）、`countMultiplier`（1 或 2）、`evenCount` 与 `rows`；宿主按这些策略对周期数量/旋转/Brick 行数吸附。

Star/Gear/Bezier 的专用选择器、条件参数、曲线拖拽与关键帧由 `editor.kind` 选择，具体 ABI 槽位继续保持原义。排列、图层合成、法线多 pass、RGBA 打包、透明度、图集/逐帧/批量都是宿主能力，不要求每份公式重新实现。已有 v1-v5 项目迁移和旧模式补偿代码保留；项目/预设/分享仍保存 ID 与参数，不携带公式文件。将来用户导入能力需要另行定义公式携带/版本解析与执行约束。

## 校验与渲染验证

```powershell
npm run validate:definitions
node validate-definitions.mjs <本地目录JSON路径>
npm test
```

校验器检查 schema/ABI、顺序/ID/分类、索引与配置的 ID 一致性、参数绑定/范围/default、能力、依赖、源文件内容与路径，加载成功前不发布目录。先读取独立配置再读取公式，两个阶段各最多 8 个并发，每个文件只读一次；注册记录冻结。301 份配置与 310 份 GLSL 文件均经过实际读取，CLI 单独报告 configurationFiles/sourceFiles。CLI 校验结构与文件，不替代 GPU 编译。

图案库去重已删除11份定义，并连续重排全局和分类索引。用户明确不要求旧画布兼容，迁移前的固定快照及其测试已移除；不保留旧ID重定向。当前验证覆盖定义加载/路径/资源完整性、预设保存读取、节点运算与实际GPU渲染。公式本身更改应调整相应revision并重新验证。

OgeeFlowerTile 只绘制居中单体，使用body公式文件；周期复制由通用斜向网格排列器负责。该图案由独立Node与GPU周期/参数回归覆盖。


## 内置公式

当前注册 298 个图形，实际目录以 `web/definitions/builtin.json` 为准。参数由各图形的定义文件声明，支持灰度、蒙版、法线及部分图形的矢量输出；无缝行为按定义选择周期、重复或边缘融合。

### 特效素材

`PlumeSmoke`（蓬松烟团）、`LayeredFog`（层叠雾气）、`TurbulentFlame`（湍流火焰）、`BallisticSparks`（喷射火花）、`BranchedLightning`（分叉闪电）、`BokehDust`（散景浮尘）与 `FilmGrain`（胶片颗粒）声明 `generator.schema: momo.generator/v1`，使用独立生成器通路。公式图形继续沿用原来的 16 槽 ABI；生成器可声明最多 64 个参数，槽 16 起的键名为 `P16`、`P17` 等。

烟雾先生成种子确定的烟团，叠加密度、进行双向模糊，再做域扭曲与边缘处理；雾气使用密度和后处理步骤；火花与闪电先生成轨迹几何，再叠加两个尺度的辉光。火焰、浮尘和颗粒通过各自的全屏着色器生成。生成结果同时提供原色、透明度和标量采样，继续使用现有节点变换、排列、蒙版、配色与输出通路。原色模式保留生成器颜色，节点配色模式只替换颜色并保留透明度。

`generator.programs` 引用 `generator.libraries` 中的渲染着色器；资源包会携带这些依赖。CPU 烟团/轨迹生成由工具的 v1 生成器引擎执行，接收端需要支持该能力；未知引擎版本明确报错。资源配置不执行 JavaScript。图形编辑器提供完整的参数面板，保存结果仍是可编辑资源，不烘焙成图片；单公式 AI 创作文件不承载生成器，请使用资源包导出。

含生成器的资源包声明 `momo-pattern/16-v1+generator-v1` 接口版本，使旧工具拒绝导入而非显示空图。普通公式资源包继续使用原来的接口版本。底层三图层 `Renderer` 不合并同 ID 的多套生成器参数，调用方应使用节点 `TreeRenderer` 分别生成再合成；工作台已经使用该通路。

这七项提供动画速度和秒数时间驱动，也可通过节点关键帧改变参数。速度设为 0 时静止；相同种子、参数、时间和尺寸可复现输出。无缝平铺使用通用边缘融合，不宣称原生周期或动画首尾循环。胶片颗粒使用 Ashima Arts/Stefan Gustavson 的 MIT simplex 噪声实现，声明与许可随对应 GLSL 依赖分发。

### 自定义生成器

“创建资源 → 生成器”接受 `momo.generator-authoring/v1` JSON，声明参数、辅助函数和按顺序执行的 GLSL 步骤；不是内置效果的模板选择器。详细约定及示例见[生成器创作规范](skills/texture-forge-author/references/generator-guide.md)。公式与生成器 JSON 可通过“导入文件”一起导入，生成器也可使用随附 CLI 的 validate/render/check 命令。

资源内部使用 `generator.effect: pipeline`，`passes` 每项声明 `id`、`program`、`inputs` 和 `scale`，`program` 引用携带的 GLSL 库；`helpers` 为辅助函数库名数组。输入只能引用前面的步骤，最多三个，按顺序绑定到 input0～input2。最后一步为全尺寸输出；运行时在后续步骤不再使用中间纹理时回收。它仍使用 `momo.generator/v1` 能力及生成器资源包 ABI，旧版本不认识 pipeline 时明确拒绝加载。

用户 GLSL 在浏览器 WebGL2 中执行，不运行用户 JavaScript 或任意 CPU 轨迹代码。GLSL 提供 `time`（秒），随节点时钟及导出帧时间传入；检测到实际代码读取 time 时，缓存键包含时间，静态生成器继续复用缓存。内置几何生成器可通过可选布尔字段 `generator.usesTime` 声明宿主几何阶段使用时间；旧资源未声明且着色器不读取 time 时仍保持静态。没有跨帧反馈。编辑器保存、节点组合和导出继续使用同一生成器通路。

### 动态与体积生成器

`FlowingWater`、`WaterCaustics`、`Bonfire`、`AnimatedLightning`、`VolumeFlame`、`VolumeExplosion`、`VolumeSmoke` 使用 pipeline 与 time。体积效果使用24～96步有界采样，支持密度、湍流、光照和采样步数；爆炸按演化速度周期重启。连续流动效果不保证导出首尾相同。焦散核心改编自 pixy.js，MIT 许可随 GLSL 分发。

节点 `postFx` 数组依次为模糊半径、Bloom强度、Bloom半径、Bloom阈值、锐化、色散距离、卡通阶数；默认值 `[0,0,16,0.6,0,0,0]`。组合先合成后处理；PSD 遇到启用滤镜的组合会合成为像素。`output` 内的 `normalAlgorithm`、`normalFlipX`、`normalFlipY`、`normalInvert` 和 `normalSmooth` 同时作用于法线与RGBA法线通道。旧画布缺省采用原来的 Sobel 输出。

## 参数变量与别名

variable 在图形内唯一，使用 GLSL 可用的 ASCII 标识符（最多80字符，允许下划线开头，拒绝关键字、gl_、双下划线及宿主保留名）。slot/key 是固定渲染绑定，不能按语言变动。aliases 为可选语言标签映射，按全局语言顺序选第一个非空值；全无匹配显示 variable。新定义必须有 variable；旧资源包的 key/label 仅在资源读取边界兼容，不改原哈希。role:feather 表示宿主羽化行为，role:edge-softness 仅标记导出轮廓时的软边提示，不改变默认值；role:image-mode 表示图片通道模式，禁止用显示名称决定逻辑。选项保留稳定 value，可提供 variable 与 aliases。具体格式和操作见[语言与参数别名](docs/12-language-and-aliases.md)。
