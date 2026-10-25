# Frequently asked questions

<!-- doc-language -->
[简体中文](faq.md) · [English](faq.en.md)
<!-- /doc-language -->

[Manual contents](README.en.md)

## Why is the canvas empty after adding to the graphics list?

The list stores reusable copies. Click **+ Add** to create a canvas instance. See [Graphics library](02-graphics-library.en.md) for the three resource/instance scopes.

## Where are the inspector parameters?

Select a shape or group in the node tree. No parameters are shown without a selection. Some settings appear only for a particular layout or mode; another graphic's parameter table may not apply.

## Why can I not change a parameter?

An animation track may control it. Use **Base values** for the underlying state or enable recording to edit a time. Also check whether an export is running.

Playback itself does not lock ordinary parameters or pause when adjusting sliders, colors or transforms. Explicit timeline seeking or switching recording/base modes still pauses. See [Animation](06-animation.en.md).

## Why does a static website still need a local MCP service?

The page edits/renders, while both it and the AI client connect to one local service. Browser WebSocket connections are clients and cannot listen as a local MCP server. Install the Authoring Skill and send its startup instructions to AI, which prepares and starts the service; users need not manually install prerequisites. See [Three-step connection](10-ai-and-help.en.md).

## Why does AI see only read tools or lack the new export route?

Check that the updated Authoring Skill is loaded, the new service is running, the client refreshed its MCP tool list and the intended page is enabled. Installed files do not update old processes or client caches. Use forge_pages/forge_schema before requested edits; an old tool list does not authorize unrelated page automation. See [Connection and updates](../skills/texture-forge-author/references/live-editor.en.md).

## Why can the webpage display an effect that Unity Shader export rejects?

The editor has a complete native rendering flow; Unity export covers implemented graphic adapters and handdrawn postprocessing only. Inspect the support report's nodes, parameter paths and reasons. Unsupported content is not silently omitted, substituted or frozen. Native image/animation export remains available. See [Shader categories and export](14-shader-reference.en.md).

## Why did node shortcut bindings or appearance not follow me to another device?

Pins, module expansion/order, panel layouts and appearance are preferences for the current browser and site, outside project and resource files. Choose **All nodes, including new nodes** in a pin's scope menu for a common shortcut. Preview insertion retains bindings within the same browser; set them again on another device. See [Node shortcuts](05-canvas-and-compositing.en.md#pin-common-settings-to-the-node-tree).

## Why does a color texture look raised in 3D?

Check the preview channel. **Color** displays a flat pattern; **Normal** displays lighting from generated normals. Ordinary artwork does not need to be treated as height. The model and lights are inspection aids.

## Why does export still produce color after I viewed normals?

Preview and export channels are independent. Choose **Output content → Normal** in Export; see [Normals](07-normal-and-material.en.md).

## Why does a looping animation jump at the seam?

Playback looping and omitting the export endpoint do not repair the motion. Check keyframe endpoints, formula seconds, UV scrolling and per-instance phase together.

## Why does opening a project leave my graphics list unchanged?

A project restores the canvas and its dependencies, not the entire reusable list. To move reusable items, save them to the library and export resources.

## Why is my data missing on another port or in offline HTML?

Storage is isolated by browser and origin, including domains and ports. Use project ZIPs and official resource ZIPs for backups. You can try reopening the previous address to inspect its stored data.

## Which image remains after a preview fails?

It may be the last successful image. Read the error before saving. Retry with lower resolution, fewer nodes or fewer instances. If the GPU context is lost, close other demanding pages before retrying.

## Why does SVG differ from the PNG?

SVG/PSD vector contours extract single-color paths from sampled alpha. Gradients, feathering and semitransparency are simplified. Use PNG or suitable layered PSD output when the original pixel appearance matters.

## Can a processed image recover its source file?

The editing draft can compare the original, but saving a processed bitmap bakes the result without retaining the full processing history. Keep the source separately; see [Images](03-images-and-svg.en.md).
