# 图形资源多语言名称

状态：已完成并验证；未提交、未推送。

1. 在图形定义与资源元数据增加可选 aliases，统一名称解析、校验与搜索。默认 name 保持兼容，回退为所选语言、配置语言顺序、name、id。
2. 内置298图形名称迁入各自定义，界面词库只保存界面文案；公式、图像、生成器、组合和图形列表保留别名。
3. 名称旁提供多语言名称编辑，固定语言选择，支持保存、创作JSON、完整ZIP及远程目录往返与搜索。
4. 加入画布时使用当前语言名称作为初始节点名，之后独立保存，语言切换不改节点与资源。
5. 同步文档和Skill，完成资源/版本/哈希、浏览器与静态导出检查。

修改名称别名属于资源内容更新；切换语言仅改变显示。旧资源未提供 aliases 时按 name 显示；不自动给用户资源补写别名。未启用语言的已有别名保留。


## 验证结果

- `npm test`：323项通过，含名称回退、校验、版本、哈希、资源ZIP、远程目录及图形列表往返。
- `npm run validate:definitions`：298个内置图形通过；名称迁移未改变渲染定义。
- `node tools/i18n-audit.mjs`：1575个语义消息，语言键与占位符一致。
- `node tests/graphic-name-browser-check.mjs` 及 `--built`：公式、图片、生成器、组合的名称编辑和保存，创作JSON/ZIP导出，跨语言搜索、列表持久化、节点名称独立、远程目录与插入均通过。
- `node tests/parameter-language-browser-check.mjs`：固定语言选择、参数别名、选项和多选回归通过。
- `node tests/ui-language-browser-check.mjs --built`：34个英文界面通过。
- `npm run build:pages` 与 `node tests/pages-browser-check.mjs`：静态网页构建、PNG导出、内嵌Worker、生成器、3D预览、示例及撤销/重做通过，无浏览器脚本错误或外部静态资源依赖。
- `git diff --check`：通过。

真实图片流程检查同时修正变量校验器将 `imageMode` 误判为GLSL类型的问题；保留对实际GLSL类型名的限制，并补充参数变量回归断言。
