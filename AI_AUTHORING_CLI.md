# AI 命令行渲染

在 MomoTextureForge 工具目录执行，要求 Node.js >=22。首次安装：

```bash
npm ci
npx playwright install chromium
```

Linux 若缺系统库，可按 Playwright 的安装提示安装依赖。浏览器仅用于此命令行工具；静态网页用户无需安装 Node.js 或 Playwright。

```bash
node authoring-tool.mjs validate my-shape.graphic.json
node authoring-tool.mjs render my-shape.graphic.json --time 1.5 --size 512 --output preview.png
node authoring-tool.mjs check my-shape.graphic.json --times 0,0.25,0.5,1,2 --size 256 --output previews
```

- validate：仅结构/绑定检查。
- render：透明 PNG 和同名 `.report.json`。
- check：目录中的 `frame-00.png` 等独立透明帧、带时间标签和深色背景的 `contact-sheet.png`、`report.json`。
- `--size`：16～2048整数，默认512；check最多16帧。
- `--timeout`：渲染阶段超时毫秒数，默认60000，范围1000～300000；浏览器启动另有同值超时。
- 使用公式参数的默认值；检查参数范围时修改 JSON 中的 default 后重复运行。
- 运行结束自动关闭浏览器及临时本机 HTTP 服务，不改图形库，不上传内容。

成功退出码0，失败1。报告的 ok/frames/error 是本次运行结果；输出目录可能留有上一次的图片，失败时不要拿旧图片当新结果。编译错误行号属于生成后的 GLSL，不能直接当作用户源公式的行号。结构/GPU成功不代表符合视觉意图，visual 保持 not-reviewed，AI 必须自行查看生成图片后评价。不同GPU可能存在少量像素差异。

AI工作流：写创作JSON → validate → render/check → 读取报告并查看图片 → 修改公式/参数 → 重跑 → 将最终JSON交给用户导入。

用户优先使用编辑器“下载AI创作Skill”。ZIP已包含SKILL.md、规范、示例、scripts/texforge.mjs及独立渲染页面，无需项目源码。解压后让AI读取SKILL.md；AI在Skill目录安装依赖，执行 node scripts/texforge.mjs render/check。浏览器二进制首次运行时安装，不随ZIP捆绑。开发者可运行 node authoring-tool.mjs build-kit 重建下载包；静态构建自动重建。
