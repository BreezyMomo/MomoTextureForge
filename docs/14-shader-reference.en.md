# Shader categories, postprocessing and Unity export

<!-- doc-language -->
[简体中文](14-shader-reference.md) · [English](14-shader-reference.en.md)
<!-- /doc-language -->

[Manual index](README.en.md) · [AI collaboration](10-ai-and-help.en.md)

## General responsibilities and extensions

Shaders have two responsibilities: **graphic generation** produces images from algorithms, coordinates, parameters and time; **image postprocessing** processes an existing image and is reusable with bitmaps, live RTs or upstream generated output. Compose them as “generated graphic / imported image → ordered postprocessing → layer composition and output.” Reuse generic postprocesses instead of copying their implementation into each graphic.

Before adding a Shader, read [responsibilities and extension rules](../skills/texture-forge-author/references/shader-architecture.en.md) for module boundaries, input/output contracts, color/alpha/time/size, resource lifecycle and verification. Both repository `AGENTS.md` and the authoring Skill route to these rules. Check web and Unity export coverage separately: graphics and postprocesses ship their formal modules with resources; actual badges and support reports determine coverage. See [standard Unity modules](../skills/texture-forge-author/references/unity-modules.en.md) for contracts.

When bringing editor effects into a game engine, AI must first follow [Common integration rules](../skills/texture-forge-author/references/engine-integration.en.md): check actual support, prefer provided Shaders, runtimes, importers and parameter mappings, adapt existing modules where needed and implement only missing or unsuitable parts. This applies to all effects and target engines; handdrawn and currently adapted graphics are specific implementations.

## Choose a delivery route

| Need | Entry | Output |
| --- | --- | --- |
| Continue editing or ask AI to revise work | File → Save project | Native project ZIP with nodes/dependencies, not a Unity material |
| Deliver rendered images/animation | Export → PNG, GIF, EXR, frames or atlas | Pixels; see [Export guide](08-export.en.md) |
| Generate one graphic algorithmically in Unity | Select a graphic node → Shape → Graphic selection → Unity graphic Shader | Formal sources, all native graphic parameter mappings, current values and importer; not a recreation of the node or whole canvas |
| Apply handdrawn processing to an image/RT | Composite → Handdrawn → Download handdrawn postprocess | Shared effect core, input adaptation, parameters, runtime and importer; optional reviewed graphic producer |
| Process an existing image/RT | Add-effects card or added effect → Download Shader | Badged effects supply their own complete parameters, runtime and dependencies; cards use defaults and added panels use current values |

Saving projects and sharing graphics also carries existing Unity sources and dependencies. AI reads and reuses these formal implementations instead of translating GLSL again. Extract offline with the authoring Skill's `modules` command, or use module source paths returned by MCP `forge_resource`.

Global export has no Unity Shader option. Graphic downloads include current base parameters, excluding node colors, transforms, arrangement, keyframes, composition and post effects. Graphics and postprocesses are reusable modules. For complex work, AI must read the native project, extend available modules and combine, modify and validate them in the target project. Do not promise one-click conversion of arbitrary canvases.

The code badge on a graphics-list thumbnail means its base graphic provides a Unity Shader. Hover or keyboard-focus it for the download location and scope. It sits beside the animation badge over the original shared top gradient, without individual icon fills or frames, and does not claim support for the card's composition or post effects. Badge availability uses the same resource-to-formal-module binding checks as download, independent of names or built-in origin.

Library cards show the same animation and code badges. Use More → Download Shader in the graphics list, or Details & management → Download Shader on a library card. Both preserve that resource's base parameter values without adding nodes or changing the current canvas. Local and downloaded remote resources are checked using their actual packaged source and animation settings; browsing does not download uninstalled remote resources to identify badges.

Postprocess cards in Add effects use the code badge and offer Download Shader for supplied modules, including blur, bloom, sharpen, chromatic aberration and handdrawn. Cards deliver default parameters; handdrawn also includes an independent sample input. Modules process external images/RTs without adding effects, modifying the canvas or copying demonstration settings. Download from an added effect panel for current values. See [Standard Unity modules](../skills/texture-forge-author/references/unity-modules.en.md) for connection and final display.

Query support before Shader export, inspect specific nodes/parameters and approximations, then follow the package README and unityImporter in the target Unity project. Verify actual color, alpha, animation and persistence. Baked pixels, realtime generation and postprocessing are distinct delivery routes.

## One handdrawn pipeline

Select the target node and use **Composite → Handdrawn → Download handdrawn postprocess**, choosing the input adapter in that effect. Effect-specific delivery stays in context rather than global export formats. RGBA input goes through automatic contour extraction and fill, then composition. Images, runtime RT and reviewed generators share the same GPU core and component. There is no light fill or frozen-outline rendering alternative.

Query actual support first. The dialog/CLI/MCP reports unsupported native styles and parameter paths; editor controls remain available. Source adapters are automatic, reviewed producer, explicitly captured static RGBA or external texture/RT. Auto never silently snapshots unsupported animation. A captured input is the raw image before handdrawn processing, not a baked outline.

Read [Unified postprocess](../skills/texture-forge-author/references/handdrawn-postprocess.en.md) for CLI/MCP, native fill/source mappings, input alpha/color encoding, short-side512 design units and persistence. Packages include actual parameters, a true pre-sketch input, shared Shader/Compute/runtime, material/Prefab importer, source ZIP and references. Namespace and integrity checks allow multiple packages to coexist.

## Scope and verification

OriginalInput, solid, individual hachure and no fill have explicit native mappings. Unsupported styles/dashes/vertices and non-default vector preprocessing fail instead of being substituted or ignored. The core remains a declared Rough.js approximation, not exact vector/RNG equivalence. Node opacity is applied once after composition. Static inputs cache by version; runtime RT/producers update and resources release/rebuild correctly. Requires Compute/SM4.5/RFloat, with ARGBHalf for producers. Mobile/Player are unverified.

Exporter verification is separate from real Unity compilation, visual review and Play Mode. Validate the new package in its actual project, including semitransparent inputs, rectangular scale, original/no-fill, cache/switching, resources, overflow and Prefab reload.

## Retirement and analytic shaders

Existing project data is unchanged. Old `handdrawn`, `dynamic-handdrawn` and fill/frozen reference APIs return a migration error to `postprocess`. No old renderer is distributed by the Skill. Old test artifacts are historical evidence, not current export choices.

Adapted graphics are downloadable in the graphic selection section. The [analytic graphic route](../skills/texture-forge-author/references/realtime-shaders.en.md) also retains bounded CLI/MCP composition delivery for AI after per-node support checks. It is not a general canvas converter, does not silently omit post effects and does not replace the unified postprocess.
