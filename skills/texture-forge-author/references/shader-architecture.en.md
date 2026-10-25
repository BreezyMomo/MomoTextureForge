# Shader responsibilities and extension rules

<!-- doc-language -->
[简体中文](shader-architecture.md) · [English](shader-architecture.en.md)
<!-- /doc-language -->

Before adding or changing a Shader, generator, postprocess or engine adapter, identify its responsibility and use the existing interfaces. These rules define module boundaries; they do not claim Unity support for every web feature or add fields/interfaces to current authoring JSON.

## 1. Two responsibilities

| Responsibility | Input and output | Examples |
| --- | --- | --- |
| Graphic generation | Coordinates, parameters, seed and optional time produce a graphic; the host converts scalar formulas to images, while RGBA generators output images directly | Geometry, gradients, noise, water and fire |
| Image postprocessing | An existing image and parameters produce a processed image; input may come from a bitmap, live RT or upstream generator | Blur, distortion, outlines and handdrawn conversion |

The standard composition is **procedural graphic / imported image → one or more ordered postprocess stages → layer composition and output**. Existing composition manages masks, blending and arrangement; each graphic need not reimplement them. Modules may require multiple rendering passes; do not force a single pass merely for uniformity.

A generator may process its own intermediate textures. That does not imply arbitrary external-image input is available in the current generator authoring interface. Consult actual schemas, catalogs and support reports.

## 2. Boundaries for new modules

- A new graphic implements its generation logic and specific parameters. Effects applicable independently to other images should use or extend reusable postprocessing; do not copy handdrawn, blur or outline algorithms into every graphic Shader.
- A new postprocess consumes explicit image input without hardcoding an upstream graphic ID, formula or screenshot. The core should remain reusable after replacing compatible inputs. Declare required channels, auxiliary inputs and static/dynamic capabilities; reject unsupported inputs explicitly.
- When both a new graphic and a new postprocess are needed, implement and validate them separately, then compose them in order. Internal steps intrinsic to a graphic may remain in its generator; avoid unnecessary fragmentation.
- Reuse existing resources, nodes and effect ordering instead of inventing a project format for one example. Do not disguise a generic postprocess as a library graphic tied to one source image.

For graphic authoring, use [scalar formulas](authoring-guide.en.md) or [RGBA generators](generator-guide.en.md). A new postprocess requires implementation in the tool's actual effect registration, parameters, order and rendering entry points. Existing `.graphic.json` / `.generator.json` are not generic postprocess plugin formats; invented fields do not implement integration.

## 3. Input/output contracts

Declare coordinates, resolution/aspect, parameter units, color space, straight/premultiplied alpha, time units and resource ownership. Make cross-stage conversions explicit to avoid double alpha multiplication, repeated color conversion or unintended stretching. Apply opacity and blending according to node composition semantics without duplicating them at added stages.

Static inputs may cache; changed inputs, parameters or relevant time must update. Never silently freeze a dynamic input. Identical input, parameters, seed and time should be reproducible. Modules owning intermediate RTs/buffers handle resizing, switching and release on failure/disable.

These are contract topics, not shared numeric constants. Short-side512 units, Compute/RFloat requirements and fill mappings belong to [handdrawn postprocessing](handdrawn-postprocess.en.md); do not automatically impose them on other effects.

## 4. Separate web and engine acceptance

Working in the web editor does not imply an HLSL/Unity adapter exists. When extending exportable graphics or effects, update actual support queries, parameter mappings, package/dependencies, runtime and any required importer together. Claim only implemented and verified capabilities. Current routes are [analytic graphic export](realtime-shaders.en.md) and [handdrawn postprocessing](handdrawn-postprocess.en.md); this does not establish Unity export support for other web post effects.

Unsupported nodes, effects, parameters or animation must report reasons and paths rather than being omitted or substituted. Static baking is an explicit choice, never described as realtime implementation. Retired light fill and frozen-stroke handdrawn exports remain unavailable.

Validate actual defaults and parameter boundaries, time/seed, transparent input and aspect. Replace postprocess inputs to verify reuse, then check ordering, color and alpha in composition. For runtime resources, verify cache/update, release and persistence. Record structural validation, browser rendering, HLSL compilation, target-engine visuals/playback and Player/platform checks separately; identify checks not performed. Changes to built-in visual formulas also follow repository thumbnail requirements.
