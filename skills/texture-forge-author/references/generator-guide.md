# 自定义生成器

适用于需要原生 RGB/RGBA、多个渲染步骤或中间纹理的程序图形，例如彩色火焰、柔光、烟气与纹理。简单标量形状仍优先使用公式。图库已有生成器可直接编辑参数并另存；创建入口没有模板选择。

交付 UTF-8 `.generator.json`，schema 为 `momo.generator-authoring/v1`。用户可在“图库 → 创建资源 → 生成器”粘贴或选择文件，验证预览并导入图形库；“导入文件”页签也识别此 JSON，支持与公式 JSON 一起多选。已保存生成器可重新编辑代码、导出生成器 JSON，或通过“导出资源”打包完整依赖。

参考 [完整三步骤示例](example.generator.json)。不要生成资源 ID、参数槽、内容哈希或 ZIP 清单。

## JSON 字段

- `name`、`category`、`description`：名称 1～80 字，分类默认“我的图形”，说明最多 2000 字。编辑器顶部名称、分类和说明用于最终保存。
- `scalar`：`alpha` 或 `luminance`，决定遮罩、高度、法线等用途使用透明度还是亮度；原色预览保留 RGBA。
- `parameters`：最多 64 项，每项含 `variable`、可选 `aliases`、`min`、`max`、`step`、`default`。范围必须 min < max、step > 0，默认值在范围内。必须包含名为 `seed` 的随机种子参数；使用固定种子保持结果可复现。
- 参数可加 `type: "color"`（24 位 RGB 整数，范围 0～16777215，步长 1），或 `type: "select"` 和 `options: [{value: 整数, label: 文字}]`。其余生成数字框和滑动条。参数均绑定为 float，整数用途显式转换。
- `aliases`：语言标签到别名的映射，如 `{"zh-CN":"半径","en":"Radius"}`；可以只填一种语言、为空或省略。按用户全局语言顺序选择第一个非空别名，全部缺失时显示 variable。旧 `label` 作为中文别名读取；显式 aliases 不再隐式回退到 label。下拉 options 也支持 aliases 和稳定 variable，省略选项变量时按 value 自动生成。变量名必填且互不重复，可由字母或下划线开头，后续允许数字，最多80字符；排除 gl_、双下划线、GLSL关键字和宿主保留名称。
- `helpers`：可选全局 GLSL 辅助函数，最多 1MB。辅助函数位于参数宏之前，通过函数参数接收可调值。
- `passes`：1～16 个步骤，按数组顺序执行。每步包含唯一 ASCII `id`、`source`、可选 `inputs`、可选 `scale`。
- `inputs`：之前步骤的 ID 数组，最多 3 个，按顺序绑定到 `input0`、`input1`、`input2`。不能引用自己、后面步骤或不存在的步骤。没有连接的输入不能采样。
- `scale`：相对于最终渲染尺寸的采样比例，默认 1，范围 0.125～1。最后一步必须为 1，最后一步就是最终输出。中间步骤可降低分辨率节省开销。
- 每步源码最多 65536 字符，整个创作文件最多 2MB。

## GLSL 环境

GLSL ES 3.00，每步实现 `vec4 generate(vec2 uv)`。`uv` 为 0～1 坐标，原点在左下角。返回非预乘 RGBA：RGB 是原色，A 是 0～1 透明度；不要把 RGB 再乘 A。中间纹理也使用相同约定，混合和模糊时自行处理透明边缘。所有输出应为有限值。

可直接使用本步骤的参数变量、`generatorSeed`、`generatorResolution`（本步骤像素宽高）和已连接的 `sampler2D input0`～`input2`。用 `texture(input0, uv)` 读取前一步；输入的真实尺寸可用 `textureSize(input0, 0)` 查询。可用宿主 math-v1 中的 PI、TAU、sat、rot、fill、line、noise、fbm、segment；其他函数在 helpers 或本步源码定义。

不要声明 `main`、版本指令、外部 include，或重复声明宿主 uniform。参数名用唯一、非保留的 ASCII 标识符，不能占用 `uv`、`generate`、`input0`、`gp`、`generatorResolution` 等宿主名称，不要与自己要调用的函数或 GLSL 类型重名。

这是单帧渲染流程：不执行用户 JavaScript，不提供任意 CPU 几何脚本、网络访问、上一帧反馈、持久缓冲或物理模拟。GLSL 可读取内置 `time`（秒），跟随节点时钟的速度、偏移与冻结；读取 time 的生成器自动随时间重绘。动画也支持参数关键帧。未使用 time 的生成器保持静态缓存。需要跨帧模拟的效果应说明限制，并提供其他制作方式。

## 验证与交付

随附 CLI 同时支持公式和生成器：

```sh
node scripts/texforge.mjs validate effect.generator.json
node scripts/texforge.mjs render effect.generator.json --size 512 --output preview.png
node scripts/texforge.mjs check effect.generator.json --size 512 --output previews
```

`validate` 只检查结构和连接；`render`、`check` 使用真实 WebGL2 渲染。仍需查看生成的 PNG，检查颜色、透明度、孔洞、边缘，以及参数默认值、最小值、中间值、最大值。测试参数变化时修改 JSON 中相应 default 后重新渲染；check 的不同时间帧不等于参数范围检查。没有执行能力时明确未完成哪些检查。

限制循环次数和采样开销，避免除零及非法 sqrt/pow/normalize。错误提示中的步骤 ID 用于定位具体 GLSL；不能把结构校验通过说成编译或视觉验收通过。编辑器编译失败会保留上次预览，但不能保存错误代码。最终交付完整 JSON 和实际预览，说明入口、可调参数及尚存限制。

生成器顶层可选 `aliases` 保存图形名称的多语言映射，例如 `{"zh-CN":"冰霜护盾","en":"Frost Shield"}`；每个名称最多80字。默认 `name` 仍必需，名称别名与参数自己的 `aliases` 独立，不填写界面消息 key。名称会随JSON和资源ZIP保存；未配置时使用默认名称。
