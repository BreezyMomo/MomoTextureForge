# 开发、离线构建与静态部署

<!-- doc-language -->
[简体中文](development.md) · [English](development.en.md)
<!-- /doc-language -->

[手册目录](README.md) · [返回项目首页](../README.md)

## 本地启动

需要 Node.js 22+ 和支持 WebGL2 的桌面浏览器。在仓库根目录执行：

```sh
npm ci
npm start
```

打开 `http://127.0.0.1:8787/`。Windows 可双击 `start.bat`。指定其他端口：

```sh
npm start -- --port 8799
```

在线版、不同本地端口、不同浏览器及离线 HTML 的浏览器存储不自动共享。项目 ZIP 和资源 ZIP 用于备份与转移。

启动页的布局与首屏样式在 `web/index.html`，无需等待脚本下载即可显示。`web/startup.js` 负责真实阶段提示、界面切换与失败重试；源码入口和单文件构建共用这套逻辑，不显示虚构百分比，也不设置最短等待时间。初始化失败时保留错误详情与重新加载入口，不清除本地草稿或资源。

## 构建离线版

```sh
npm run build:standalone
```

- `dist/MomoTextureForge.html`：脚本、样式、内置定义与导出 Worker 内嵌在单个 HTML 中。
- `dist/MomoTextureForge-offline.zip`：用于分享。
- 使用生成文件无需安装 Node.js；本地编辑和导出可离线，刷新/下载远程资源需要网络。

分享画布时另附保存的项目文件，浏览器本地存储不是画布文件备份。

## 导出静态网站

```sh
npm run build:pages
```

该命令先构建离线 HTML，再同步到可提交的 `site/index.html`，保留 `.nojekyll`。部署 `site/` 即可，不需要 Node.js 服务，兼容 GitHub Pages 仓库子路径。`dist/` 不提交，`site/` 随源码更新。

### 正式站点访问统计

`build:pages` 额外内嵌 `web/site-analytics.js`，并仅为统计脚本允许 `https://hm.baidu.com`。`build:standalone` 的离线 HTML/ZIP 不含统计代码。脚本按 HTTPS 域名和路径白名单选择两个独立的百度统计站点：GitHub Pages（站点 23623715）和 WorkBuddy（站点 23623719）。本地、其他部署域名、其他 GitHub 项目及验证视图不统计。

每次打开页面仅手动发送一次 PV：编辑器与组合示例分别使用固定路径；不将查询参数、`sharecode` 或画布 `#tree` 放入 PV 地址，来源只保留域名。关闭自动 PV 和自动点击采集，统计脚本使用 `referrerPolicy=origin`，Referer 仅发送站点来源（协议和域名），不含路径、查询参数或画布数据。不能设为 `no-referrer`：百度会返回 HTTP 200 的空脚本，导致没有访问上报。当前不添加导出、参数编辑等行为事件，也不主动上报画布名称、图片或节点内容。百度服务仍会处理访问统计所需的网络/浏览器信息和访客标识；不能将其描述为完全无数据采集。

统计失败不阻塞编辑器启动。核验时分别访问两个正式站点，在百度统计对应网站的“代码安装检查”和访问报告中查看；新站点脚本及报表可能延迟生效，不能仅凭插入了 script 标签判定数据已入库。修改统计后运行 `node --test tests/site-analytics.test.mjs` 和 `node tests/site-analytics-browser-check.mjs`，后者检查静态包的白名单、CSP、请求来源与离线隔离。

`.github/workflows/pages.yml` 在推送 `main` 后执行检查、构建和 Pages 部署。首次配置在 GitHub 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**；也可在 Actions 中手动运行部署。实际部署状态以 Actions 结果为准。

[官方 Pages 说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)提供服务条件与限制。部署后访问者能获取网页中嵌入的代码和资源。在线版的个人图库与草稿仍在访问者浏览器内，远程图库需另行部署并配置跨域。

## 检查与生成 Skill

```sh
npm test
npm run validate:definitions
node build-authoring-kit.mjs
npm run build:pages
node tests/pages-browser-check.mjs
node tests/startup-browser-check.mjs
```

启动页检查覆盖加载阶段、正常进入编辑器、WebGL 初始化失败后的错误详情与重试，以及单文件版的编辑器、示例和验证视图。

`skills/texture-forge-effects/` 是效果指导 Skill 的维护源。创作 Skill 的一部分文本和随附 CLI 由构建脚本生成，修改相应源文件后运行 `build-authoring-kit.mjs`。生成文件不要只手改嵌入内容。

素材预设回归：`node tests/vfx-presets-browser-check.mjs`，检查透明覆盖、序列化、两个预设的预览、编辑链接及透明 PNG 导出，并生成 `test-results/presets/preview.png` 供视觉审核。

排列相关回归：`node tests/tree-arrangement-browser-check.mjs`（排列示例、三种画布比例、展开/导出一致性、界面保存与分类）和 `node tests/examples-browser-check.mjs`；单文件静态版再加 `--standalone` 运行后者。法线交互回归：`node tests/normal-strength-browser-check.mjs`。

节点树排列在 `web/tree-arrangement.js` 扩展：`arrange[0]` 的 13/14/15/16 分别为边框、透明轮廓、人字/编织、接口拼接；`arrangeExtra` 保存扩展设置，候选子节点的 `tileEdges` 用右1、上2、左4、下8 的位组合声明接口。旧标量公式的 59 项排列 ABI 和 0～12 模式保持兼容。实例记录附带 `opacity` 与规则选择的 `childIndex`，GPU、选区与展开均需使用同一记录。

按改动范围运行浏览器检查；Node 单元测试不等于已检查实际 WebGL 画面。

拼图回归：`node tests/puzzle-browser-check.mjs`，静态构建后加 `--standalone` 检查单文件界面。覆盖四种接口×四边共324种组合、36组接口配对、四角独立控制、凸耳越界、网格格距、三种半径的拼接、预览/导出、遮罩/滤镜和滑条保存。`renderPadding` 是公式定义的局部内容范围提示（0～0.5）。节点唯一字段 `boundary:clip|visible|repeat` 控制边界；`web/render-bounds.js` 负责逻辑矩形、物理比例变换与滤镜边距。渲染器分别计算方向性范围及祖先可见需求，中间纹理的 `bounds` 不参与格距；无缝重复输出严格保持单位周期；periodicCopies 枚举与该周期相交的实际副本，布局整组回绕，模糊／Bloom／轮廓在周期纹理上采样。子级自然范围参与副本计算，副本数受纹理表宽度和4096预算约束。已知公式使用保守轮廓范围，未知公式在祖先需要范围内采样；图像、矢量和生成器本体仍在资源范围内。最终画布保持裁切。教程截图运行 `node tools/capture-docs.mjs puzzle`。

平铺检查回归：`node tests/tile-preview-browser-check.mjs`，静态版加 `--standalone`。检查2×2、3×3、4×4的实际图案数量与参考框、关闭再开的预设保持、项目不变和导出原始尺寸。

通用超框回归：`node tests/overflow-browser-check.mjs`，加 `--standalone` 检查静态版。覆盖图形、单侧子节点、多层裁切、非方形旋转/镜像/轴心、遮罩与反向遮罩、模糊/膨胀、三种实例渲染路径、展开与流式导出、纹理池复用，以及三种边界的保存、撤销和多选。教程截图运行 `node tools/capture-docs.mjs overflow`。

面板布局回归：`node tests/dock-workspace-browser-check.mjs`；构建后加 `--standalone` 检查单文件版。覆盖实际拖动、标签合并、悬浮移动/缩放、保存与刷新恢复、三维上下文和 PNG 导出。布局模型在 `web/dock-layout.js`，DOM 控制器与样式在 `web/dock-workspace.js`、`web/dock-workspace.css`；只移动原有控件，布局本地存储与项目数据分开。

颜色面板回归：`node tests/inspector-color-browser-check.mjs`，构建后可加 `--standalone`。检查继承来源、复制为独立配色的画面一致性、HEX与顶部快捷色块、透明度滑条与百分比同步、父子透明度合成、撤销/重做、颜色和透明度关键帧、多色色标和刷新恢复。

图库卡片使用 `web/builtin-thumbnails.js` 中预先生成的缩略图。修改内置图形的视觉公式后，先更新对应缩略图，再构建静态网站。例如更新“流动水纹”：

```sh
node tests/builtin-release-browser-check.mjs --pattern FlowingWater --parameters
npm run build:pages
```

省略 `--pattern` 会重新生成全部内置缩略图；`--parameters` 同时检查参数两端的渲染。生成后查看 `test-results/builtin-release/gallery.png`，并在图库卡片中确认效果。

## 更新图文教程截图

截图生成工具：[tools/capture-docs.mjs](../tools/capture-docs.mjs)。它启动独立本地服务，用隔离的 Playwright 浏览器上下文操作真实界面，生成演示画布，不读取用户已打开的浏览器或草稿。

```sh
node tools/capture-docs.mjs
```

默认使用本机 Edge；环境变量 `DOCS_BROWSER` 可选 `chrome` 或已安装的 `chromium`，`DOCS_PORT` 可修改独立服务端口。需事先安装对应浏览器；使用 Playwright Chromium 可运行 `npx playwright install chromium`。

可只更新一组截图：

```sh
node tools/capture-docs.mjs workspace library combinations
node tools/capture-docs.mjs resources animation normal export remote-ai manager
node tools/capture-docs.mjs docking
node tools/capture-docs.mjs colors
```

| 组 | 画面 |
| --- | --- |
| examples | 通过真实“打开项目”入口检查四个示例 |
| combinations | 30 种组合/素材预设总览、十三种新增排列的分类截图与编辑入口 |
| overflow | 三种边界处理、逻辑蓝框、超出内容和无缝光晕接续 |
| puzzle | 拼图接口样式、独立四角、凸耳越界与网格行列数 |
| workspace | 总览、排列、合成和文件菜单 |
| docking | 面板标签、网页内悬浮与布局保存菜单 |
| colors | 颜色快捷区、继承来源、独立颜色页签、渐变和HEX |
| library | 图库、生成器参数、图形列表 |
| resources | 图片原图/去背景、公式、生成器 JSON、导入文件 |
| animation | 实际录制的关键帧与曲线 |
| normal | 高度、法线与三维受光 |
| export | PNG、序列帧图集设置、实际图集、矢量轮廓 |
| remote-ai | 远程订阅、AI 图形目录与帮助菜单 |
| manager | 独立演示图库的真实管理器与编辑窗口 |

使用 `--language en` 拍摄英文界面和英文演示名称，`--language zh-CN` 拍摄中文（默认）。例如：`node tools/capture-docs.mjs --language en workspace library`。也支持环境变量 `DOCS_LANGUAGE`。中文截图保存在 `docs/images/`，英文截图保存在 `docs/images/en/`，每次只同步对应语言文档的图下注解。英文标记文案维护在 `tools/docs-callouts.en.json`。

截图标记在 [tools/docs-annotations.mjs](../tools/docs-annotations.mjs) 中定义，按真实按钮/输入框定位绘制编号框，并自动同步各篇图下注解。标记只在拍摄时临时注入，不影响网页实际界面；目标不可见时拍摄报错，应滚动到正确位置或拆成两张图，避免用猜测坐标标注。修改相关界面时同时检查标记位置。

图片保存到 `docs/images/`，示例项目保存到 `docs/examples/`，临时图库和诊断只写入忽略的 `test-results/`。管理器示例通过隔离浏览器的文件系统 API 提供演示目录，不会弹出用户电脑上的目录选择器。

更新后逐张检查关键画面是否完成渲染、参数与图文是否对应、链接是否存在。界面变化时修改教程和生成脚本，再拍截图；不要用旧截图说明新的入口。

## GitHub 与 Gitee 同步

[GitHub](https://github.com/BreezyMomo/MomoTextureForge) 为主仓库，[Gitee](https://gitee.com/BreezyMomo/MomoTextureForge) 为国内镜像。日常提交与合并在 GitHub 完成，Gitee 使用仓库镜像管理中的 **Pull** 方向和 GitHub 的 **push Webhook** 自动拉取更新。

- 同步内容包含代码、文档、截图、`site/` 静态网页、分支与标签；Issue、Pull Request 和发行版附件不随 Git 镜像同步。
- 不直接向 Gitee 主分支提交独立修改，镜像更新会覆盖目标仓库的数据。
- 查看 **Gitee → 管理 → 仓库镜像管理** 的最近请求/完成时间；需要时点“更新”重试。比较两边 `main` 的完整提交 SHA，确认版本一致。
- 镜像使用专用的 GitHub fine-grained token，仅选择本仓库，权限为 Contents/Metadata 只读和 Webhooks 读写；不要把令牌写入代码、日志或文档。
- 当前同步令牌于 **2027-01-19** 到期。到期前更新凭据，并复查 Webhook 投递结果与镜像同步状态；撤销或到期会中断自动同步。

仓库同步不会自动生成国内在线站点。在线编辑器由 GitHub Pages 和 WorkBuddy 各自部署更新；也可从 Gitee 下载仓库中的 `site/index.html`，用 Chrome / Edge 离线打开。

## 仓库结构与深入资料

- `web/`：编辑器、资源管理与渲染，工作台入口 `tree-app.js`。
- `web/definitions/`：图形索引、定义、公式及公共函数。
- `library-manager/`：静态本地管理器。
- `skills/`：创作与效果指导 Skill。
- `docs/`：图文教程、截图与可打开的示例。
- `tests/`：单元测试与浏览器验证。
- `site/`：可部署网站；`dist/`、`test-results/`、`node_modules/` 不提交。

[图形定义规范](../PATTERN_DEFINITIONS.md) · [本地图形库](../LOCAL_GRAPHICS_LIBRARY.md) · [资源包格式](../RESOURCE-PACK.md) · [远程图库技术说明](../REMOTE_LIBRARIES.md) · [AI CLI](../AI_AUTHORING_CLI.md)

PSD 编码器许可见 [PSD-LICENSES.txt](../web/vendor/PSD-LICENSES.txt)，需要时运行 `npm run build:psd-vendor` 重建。

## 参数变量与语言

`web/parameter-metadata.js` 校验变量和别名；`web/language-config.json` 定义编译时语言编码、原生名称和默认语言，`web/language.js` 维护独立语言偏好与固定回退顺序；`web/ui-language.js` 只翻译应用声明的界面文案，不观察或重写任意用户内容。内置定义使用 `variable` 和 `aliases`，公式 ABI、slot、key 与动画路径保持原样。行为使用 `role`，不能再通过 label 判断羽化或图片模式。旧资源包仅在校验/显示边界兼容 label-only 定义，不能为迁移元数据直接改写旧资产，以免破坏原哈希。

参数显示通过 `parameterLabel`，不要给已解析的别名再套界面字典，否则会破坏作者设置的回退语言。别名修改参与资源哈希，语言切换不参与。固定界面文案采用稳定语义 key，中英文分别放在 `web/locales/zh-CN.json`、`web/locales/en.json`，由 `web/locales/catalogs.js` 注册。调用 `uiText('menu.file')`，动态句子用 `uiFormat(key, ...values)` 插值，插入的用户名称保持原文。HTML 使用显式 `data-i18n` 及属性绑定，不按中文内容反查。`messageError(key, ...values)` 携带错误身份，界面用 `uiError` 显示；Worker 通过序列化保留身份和插值数据。修改措辞只修改对应语言文件，不能重命名稳定 key。构建时 `tools/i18n-audit.mjs` 校验语言文件同键、占位符一致和引用完整。内置图形通过 `graphicLabel` 显示英文，元数据保持原样；自定义资源名称不经过界面字典。下拉框翻译显示文本，不翻译选项值；不要用中文标题或翻译结果作逻辑判断与DOM选择器。界面支持简体中文与英文；全局入口和别名编辑器只允许选择该配置提供的语言，不能手输编码、增加类型或重排语言。导入资源中的未启用语言别名保留在资源内，但不作为当前构建的回退语言。英文帮助内容在 `web/locales/help-en.js`，仓库文档分别维护中文与英文 Markdown。

验证：`node --test tests/parameter-language.test.mjs`、`node tests/parameter-language-browser-check.mjs`；构建后再执行 `node tests/parameter-language-browser-check.mjs --built`，检查固定语言选项、非法选择拒绝、持久化、回退、项目/撤销/渲染不变和编辑器元数据。

界面覆盖验证：`node tools/i18n-audit.mjs` 检查动态文案、静态标记、分类与词库；`node --test tests/ui-language.test.mjs` 检查词库和插值；`node tests/ui-language-browser-check.mjs` 检查实际面板、资源编辑、语言切换、示例及1600/1100/768宽度的顶栏。构建后加 `--built` 检查静态版。不要对整棵用户DOM做自动替换：启动静态标记须在用户内容挂载前注册，动态控件在其显示边界显式调用翻译。


### 图形资源名称

`web/graphic-name.js` 校验名称别名并提供纯数据解析与全语言搜索，`graphic-label.js` 按当前语言顺序显示，`graphic-name-editor.js` 复用固定语言选择控件。内置与导入定义的顶层 `aliases` 表示图形名称，参数各自的 `aliases` 仍表示参数名称；默认 `name` 必须保留。界面词库中不再存储 graphics.<id>.name。

名称元数据覆盖公式/生成器创作 JSON、图形定义、graphicResource、图形列表与远程目录；构造派生图片/新公式时不得继承 Circle 模板的名称别名。未提供的字段不补写，已导入资源不因语言切换被改写。版本更新必须保留 aliases；名称/别名编辑属于内容修改，语言切换只改变视图。创建画布节点时取当前显示名称，之后按节点自己的 name 保存。

验证：`node --test tests/graphic-name.test.mjs`，`node tests/graphic-name-browser-check.mjs` 及构建后的 `--built`。浏览器检查覆盖名称编辑、JSON/ZIP、跨语言搜索、列表持久化、节点名隔离与真实远程订阅。


## 中英文文档

保留中文 `.md` 与相邻英文 `.en.md`，不使用翻译词库。每篇顶部提供语言切换，正文链接跳到当前语言的文档；截图使用对应语言的界面，代码、示例共用。API 名称、配置键和数据格式保持原样，两版内容同步维护。`web/documentation-links.js` 将网页详细说明在 `zh-CN` 时指向中文，其余语言指向英文，并在语言切换后立即更新。GitHub/Gitee仓库入口在英文界面落到各自的英文README，中文界面保留仓库首页。

Skill 构建同时包含中英文参考文档，并生成两版排列参数表。中文创作 Skill 入口及规范来自 `web/ai-authoring.js`，应修改源文本后重建，不能只改生成文件。运行 `node tools/check-docs.mjs`、`npm test`，构建后检查源码与静态版的说明链接。见[文档计划](plans/bilingual-documentation.md)。
