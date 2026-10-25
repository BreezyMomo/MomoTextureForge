# Retired handdrawn export modes

<!-- doc-language -->
[简体中文](dynamic-handdrawn.md) · [English](dynamic-handdrawn.en.md)
<!-- /doc-language -->

The fill-only/frozen-stroke and dynamic-handdrawn exports are retired. Existing project data remains readable, but rendering/export calls return migration instead of using the old renderer. Use [Unified RGBA handdrawn postprocess](handdrawn-postprocess.en.md): input → automatic contours/fill → output. This page is a migration notice, not an alternate rendering route.
