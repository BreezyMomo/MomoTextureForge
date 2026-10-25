# Illustrated manual

<!-- doc-language -->
[简体中文](README.md) · [English](README.en.md)
<!-- /doc-language -->

[Project home](../README.en.md) · [Open online editor](https://breezymomo.github.io/MomoTextureForge/)

Gold numbered boxes mark operation targets. The caption below each screenshot explains its numbers; numbering is local to that image. Screenshots show the English interface with English callouts. The Chinese edition has its own screenshots.

Start with Quick start, then consult individual chapters as needed. Screenshots come from the real editor using demonstration data isolated from user drafts. Window size may cause controls to wrap or inspector panels to scroll.

![Editor overview](images/en/workspace.png)

> Callouts: 1 Open the graphics library; 2 Select a node; 3 Switch texture channel; 4 Edit the selected node.

## Find a workflow

| Goal | Tutorial |
| --- | --- |
| Start with an empty canvas, learn the interface and save | [01 · Quick start](01-quick-start.en.md) |
| Find graphics, add to canvas, trial-edit and back up resources | [02 · Graphics library and graphics list](02-graphics-library.en.md) |
| Upload, remove backgrounds, extract colors, center and convert SVG | [03 · Images and SVG](03-images-and-svg.en.md) |
| Write formulas, enter generator JSON, adjust fire and smoke | [04 · Formulas and generators](04-formulas-and-generators.en.md) |
| Select/group, transform, repeat, blend and filter | [05 · Canvas, arrangement and compositing](05-canvas-and-compositing.en.md) |
| Search post-effects, compare previews, reorder and retain settings | [Node post-processing](05-canvas-and-compositing.en.md#node-post-processing-and-execution-order) |
| Pin controls to the node tree or apply them to all nodes | [Node shortcuts](05-canvas-and-compositing.en.md#pin-common-settings-to-the-node-tree) |
| Create folded ribbon, membrane and particle strand textures | [Ribbon and trail textures](05-canvas-and-compositing.en.md#ribbon-and-trail-textures) |
| Batch-edit colors/sizes, align and distribute | [Batch editing](05-canvas-and-compositing.en.md#batch-editing-alignment-and-even-distribution) |
| Compare alpha/additive on light/dark backgrounds and check fading | [Effect preview](05-canvas-and-compositing.en.md#6-inspect-effect-blending-on-backgrounds) |
| Record keys, edit curves, set timing and loops | [06 · Animation and timeline](06-animation.en.md) |
| Complete abilities, replaceable arrays, flowing rings and aurora curtains | [13 · Ability, ring and curtain presets](13-effect-presets.en.md) |
| Understand Shader categories and export realtime graphics or handdrawn postprocessing | [14 · Shader categories and Unity export](14-shader-reference.en.md) |
| Generate normals and inspect height and 3D materials | [07 · Normals and 3D preview](07-normal-and-material.en.md) |
| Export PNG, EXR, frame sequences, atlases, PSD and SVG | [08 · Export and delivery](08-export.en.md) |
| Subscribe to libraries and maintain/publish your own | [09 · Remote libraries and manager](09-remote-libraries.en.md) |
| Download Skills, supply a catalog and import AI results | [10 · AI collaboration and help](10-ai-and-help.en.md) |
| Dock, split, merge, float and save layouts | [11 · Custom panel layouts](11-workspace-layout.en.md) |
| Set language and edit resource/parameter/option aliases | [12 · Language and aliases](12-language-and-aliases.en.md) |
| Run locally, build offline, deploy and maintain screenshots | [Development and deployment](development.en.md) |
| Missing graphics, preview/export differences and storage recovery | [FAQ](faq.en.md) |

## Downloadable demonstration canvases

Download a JSON file and open it through **File → Open project**. These examples use built-in graphics only.

- [Summoning circle](examples/summoning-circle.json): groups, rings, radial stars and a rotation track.
- [Breathing-star starting point](examples/animation-star.json): follow the width-keyframe exercise; initially no keys.
- [Animated caustics material](examples/water-caustics.json): inspect height, normals and 3D lighting.
- [Flame sequence](examples/fire-sequence.json): generator motion and sprite-atlas export.
- [Folded ribbon starting point](examples/ribbon-trails.json): a transparent trail on a wide canvas; choose a style preset to continue.

A project stores editable structure and dependencies. An exported image is a delivery result. Keep both when you need future edits.

## Support the project

If the tool helps your work, voluntary donations support continued development and maintenance. Thank you!

**Scan with WeChat to donate:** use WeChat to scan the code below.

<img src="images/wechat-appreciation.png" alt="Scan with WeChat to support Momo Texture Forge" width="280">
