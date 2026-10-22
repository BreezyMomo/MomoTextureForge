# Momo Texture Forge

<!-- doc-language -->
[简体中文](AGENTS.md) · [English](AGENTS.en.md)
<!-- /doc-language -->

本仓库维护 Momo Texture Forge 网页图形与纹理创作工具。

- 命令均从仓库根目录执行，使用 Node.js 安装依赖、运行测试和构建。
- 保留内置图库扩展机制，以 web/definitions/builtin.json 及对应定义为当前目录。外部图库不随工具自动分发或下载。
- 保留现有公共 GLSL 库的署名和许可文本，不因图形目录调整而删减或替换公共函数。
- 图形公式修改应针对明确问题或用户确认的视觉改进，不为制造实现差异而改写。不在仓库维护历史审查、修改记录或旧公式指纹清单。
- 修改内置图形视觉公式后，运行 node tests/builtin-release-browser-check.mjs --pattern <图形ID> 更新对应图库缩略图，再构建静态网站；检查实际卡片效果。
- 教程截图通过 tools/capture-docs.mjs 拍摄，操作标记在 tools/docs-annotations.mjs 维护；按真实控件定位编号框，同步图下注解，保证操作目标可见。
- 编辑器入口：web/tree-app.js；内置图形：web/definitions。
- 图形参数必须有稳定且图形内唯一的 variable，显示名称使用 aliases 语言映射与全局顺序回退；无匹配别名时显示变量名。行为判断用 role，不用中文 label。语言切换不得修改项目、关键帧或资源哈希；格式见 docs/12-language-and-aliases.md。
- Skill 源文件在 skills/，修改后运行 node build-authoring-kit.mjs，同步生成文件。
- AI 上下文仅从图形库导出，不恢复选中节点上下文或固定图形清单。
- 安装：npm ci。验证：npm test、npm run validate:definitions。构建：npm run build:standalone。
- 测试输出放在 test-results/，离线产物放在 dist/；npm run build:pages 将网页同步到可提交的 site/ 目录供静态部署。不提交依赖目录和浏览器用户数据。
- 提交、推送与发布按用户指令执行。

- 固定界面文案用稳定语义 key 调用 `uiText(key)`，动态句子用 `uiFormat(key, ...values)`；各语言独立 JSON 在 `web/locales/`，由 `catalogs.js` 注册，禁止中文作 key 或运行时按文案反查。HTML 用显式 `data-i18n` 绑定，程序错误用 `messageError` 携带 key 与参数，界面通过 `uiError` 显示。修改措辞只改语言文件，构建校验所有语言同键与占位符一致；参数别名用 `parameterLabel`，用户命名与代码不得自动翻译。选项值、DOM选择器和判断条件不使用翻译结果。修改界面后检查 `tests/ui-language.test.mjs` 与源码/静态版 `tests/ui-language-browser-check.mjs`，保留英文窄屏顶栏可用性。

- 语言类型、原生名称与默认语言由 `web/language-config.json` 在构建时固定；全局入口和参数别名编辑器只提供选择控件，不允许手输语言编码或增改语言类型。参数按所选语言优先、再按配置顺序回退；未启用语言的导入别名保留，不自动删除。

- 图形名称归资源所有：内置与自定义定义顶层 `name + aliases`，参数仍使用各自 `variable + aliases`。显示调用 `graphicLabel`，搜索调用 `graphicSearchText`，不在界面词库维护图形名称。图形库/列表/创作JSON/ZIP/远程目录必须保留名称别名；派生模板不得继承旧名称别名。创建节点时使用当前显示名称，之后不随语言切换改名。

- 仓库文档保留中文 `.md` 与相邻英文 `.en.md`，正文链接留在当前语言，顶部语言切换除外；两版同步维护，截图使用各自语言的真实界面（英文在 `docs/images/en/`，中文在 `docs/images/`），示例和代码共用。网页详细说明在 `zh-CN` 跳中文，其余跳英文。运行 `node tools/check-docs.mjs` 检查覆盖、路径和锚点；Skill 下载包含两版，排列参数表同时生成英文。
