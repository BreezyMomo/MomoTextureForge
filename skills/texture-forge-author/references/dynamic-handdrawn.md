# 旧手绘导出模式已退役

<!-- doc-language -->
[简体中文](dynamic-handdrawn.md) · [English](dynamic-handdrawn.en.md)
<!-- /doc-language -->

轻量填充、冻结描边和旧 dynamic-handdrawn 导出模式已经退役。原项目数据仍可读取；旧渲染/导出调用会提示迁移，不再使用旧渲染器。请使用[统一 RGBA 手绘后处理](handdrawn-postprocess.md)：输入 → 自动轮廓与填充 → 输出。本页只说明迁移，不提供另一套渲染出口。
