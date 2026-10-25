# Shader categories, postprocessing and Unity export

<!-- doc-language -->
[简体中文](14-shader-reference.md) · [English](14-shader-reference.en.md)
<!-- /doc-language -->

[Manual index](README.en.md) · [AI collaboration](10-ai-and-help.en.md)

## General responsibilities and extensions

Shaders have two responsibilities: **graphic generation** produces images from algorithms, coordinates, parameters and time; **image postprocessing** processes an existing image and is reusable with bitmaps, live RTs or upstream generated output. Compose them as “generated graphic / imported image → ordered postprocessing → layer composition and output.” Reuse generic postprocesses instead of copying their implementation into each graphic.

Before adding a Shader, read [responsibilities and extension rules](../skills/texture-forge-author/references/shader-architecture.en.md) for module boundaries, input/output contracts, color/alpha/time/size, resource lifecycle and verification. Both repository `AGENTS.md` and the authoring Skill route to these rules. Check web and Unity export coverage separately: analytic export covers adapted graphics, and formal generic postprocess export currently covers handdrawn, not every web effect.

## One handdrawn pipeline

Use **Export → Unity handdrawn postprocess (ZIP)** or **Composite → Handdrawn → Download handdrawn postprocess**. RGBA input goes through automatic contour extraction and fill, then composition. Images, runtime RT and reviewed generators share the same GPU core and component. There is no light fill or frozen-outline rendering alternative.

Query actual support first. The dialog/CLI/MCP reports unsupported native styles and parameter paths; editor controls remain available. Source adapters are automatic, reviewed producer, explicitly captured static RGBA or external texture/RT. Auto never silently snapshots unsupported animation. A captured input is the raw image before handdrawn processing, not a baked outline.

Read [Unified postprocess](../skills/texture-forge-author/references/handdrawn-postprocess.en.md) for CLI/MCP, native fill/source mappings, input alpha/color encoding, short-side512 design units and persistence. Packages include actual parameters, a true pre-sketch input, shared Shader/Compute/runtime, material/Prefab importer, source ZIP and references. Namespace and integrity checks allow multiple packages to coexist.

## Scope and verification

OriginalInput, solid, individual hachure and no fill have explicit native mappings. Unsupported styles/dashes/vertices and non-default vector preprocessing fail instead of being substituted or ignored. The core remains a declared Rough.js approximation, not exact vector/RNG equivalence. Node opacity is applied once after composition. Static inputs cache by version; runtime RT/producers update and resources release/rebuild correctly. Requires Compute/SM4.5/RFloat, with ARGBHalf for producers. Mobile/Player are unverified.

Exporter verification is separate from real Unity compilation, visual review and Play Mode. Validate the new package in its actual project, including semitransparent inputs, rectangular scale, original/no-fill, cache/switching, resources, overflow and Prefab reload.

## Retirement and analytic shaders

Existing project data is unchanged. Old `handdrawn`, `dynamic-handdrawn` and fill/frozen reference APIs return a migration error to `postprocess`. No old renderer is distributed by the Skill. Old test artifacts are historical evidence, not current export choices.

Without handdrawn processing, **Unity realtime Shader ZIP** remains the [reviewed analytic graph route](../skills/texture-forge-author/references/realtime-shaders.en.md). It does not silently omit post effects or replace the unified postprocess.
