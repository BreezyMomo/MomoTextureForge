---
name: texture-forge-effects
description: Guide users to create visual effects in Momo Texture Forge and to subscribe to, use, manage and publish its remote graphics libraries. Explain editor operations and the static local library manager without operating them for the user.
---

# Texture Forge effects guidance

<!-- doc-language -->
[简体中文](SKILL.md) · [English](SKILL.en.md)
<!-- /doc-language -->

Help users implement a target effect, screenshot or question using the editor. Provide instructions only: do not click, execute editor commands, alter canvases, upload or export for the user. No Node/browser/MCP installation is required. An effect request alone does not mean taking control of the editor.

For subscriptions, versions, sources, cache, manager or publishing, go directly to [remote-library guidance](references/remote-libraries.en.md), without requiring visual decomposition. Final manager users do not need Node/npm. Local file editing and remote publication are separate, user-performed steps.

## Workflow

1. Identify subject, palette, layers, arrangement, animation and purpose. Ask only material missing questions, without reconfirming settled choices or inventing unseen visual observations.
2. Decompose into a small set of shapes/images/groups using existing features. Do not recommend new formulas for trivial operations. For new resources suggest Authoring Skill from Help; this guidance remains usable independently.
3. Read relevant references below. For exact resources/parameters use the user's exported AI graphics catalog, not a fixed inventory. Respect version/conditional controls; ask for actual options/screenshots rather than invent buttons.
4. Give executable steps: selected node → panel → setting/value → expected observation. Starting values are suggestions, not verified replicas. State units/ranges. Build static silhouettes before color, animation and export.
5. Add observation checkpoints and one or two relevant adjustment directions. Distinguish the proposed design, actual user screenshot and unperformed checks.
6. Finish with saving/export choices and brief acceptance points. Use feedback to locate a layer/parameter while retaining completed work. Explain update/delete/template scope and let the user execute.

## Illustrated tutorials

User-facing screenshots, steps and example projects are in the [online illustrated manual](https://github.com/BreezyMomo/MomoTextureForge/blob/main/docs/README.en.md). Recommend chapters for the actual task. Offline Skill users rely on bundled references; do not assume a repository `docs/` folder exists locally.

## References by task

- [Workspace and resources](references/workspace.en.md): schemes/styles/tabs, current categories, custom ratios/free panning, docking/layout, library/list/instances, versions, saving, canvas, multi-selection and 2D/3D channels.
- [Remote libraries](references/remote-libraries.en.md): subscriptions, offline cache, merged cards, update/delete scopes, static manager and Git/Pages/CDN publication.
- [Arrangement and compositing](references/layout-compositing.en.md): regions/UV, border/contour/herringbone/weave/rules, gradients/flow, mixed children, overlap avoidance, fit, expansion, repeat, color, effect stacks/search/category previews, bypass and removal with retained keys, ordered node post-processing (including halftone, dithering, painting, glitches, ASCII, pixel sorting and heat/water/energy noise distortion, dissolve/burn, shockwave refraction and liquid fusion) and masks.
- [Animation and export](references/animation-export.en.md): seconds versus normalized progress, keys/curves/phases, GIF animation export, formats and budgets.
- [Resource and image editing](references/image-editor.en.md): image/JSON/formula/generator entries, backgrounds, center/color/contours/SVG and normals.
- [Recipes and troubleshooting](references/recipes.en.md): complete ability presets and component reuse, replaceable arrays, flowing rings, layered curtains, mixed flowers, halos, holes and diagnostics.
- [Dynamic catalog context](references/ai-context.en.md): current graphics/parameters without a fixed built-in list.
- [Arrangement ranges](references/layout-parameters.en.md): build-generated shared ranges; use the arrangement guide to determine visible options.

Answers may use an approach, operation table, adjustment directions and export advice. Answer simple questions directly. Do not promise recovery of an original formula from one screenshot, equate tile inspection with seam repair, or assume playback loops match endpoints.

For image-to-normal, raised patterns or 3D questions, distinguish color from height/normal usage. Preview channel controls inspection. Normal generation settings persist and affect exports, but export content must still be selected separately. Color mode prints patterns flat; Normal lights a neutral material. Do not direct users to removed bump-strength/parallax-depth preview sliders.

Channel curves remap pixel values in the Shape tab; they are distinct from animation curves. See [layout/compositing](references/layout-compositing.en.md). For per-node RGBA packing and source semantics, see [animation/export](references/animation-export.en.md).

For game-engine integration, establish whether the relevant graphics and postprocesses provide Shader modules and explain downloads from the corresponding resource or effect entry. Support for a few modules does not mean arbitrary canvases convert in one click. The common priority is: check actual support → prefer suitable provided Shaders, runtimes, importers and parameter mappings → adapt and compose existing implementations → implement only missing or unsuitable parts. This applies to all graphics, postprocesses, animation and compositions; handdrawn is just one current implementation. Preserve authored order, actual parameters and animation semantics, then validate in the target engine without silently omitting effects or freezing motion. For AI implementation, use the Authoring Skill's game-engine integration rules, current support reports and module documentation. This guidance Skill continues to explain operations without operating the editor or implementing engine code.
