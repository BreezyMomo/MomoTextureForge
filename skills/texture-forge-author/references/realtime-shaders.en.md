# Realtime project shaders

<!-- doc-language -->
[简体中文](realtime-shaders.md) · [English](realtime-shaders.en.md)
<!-- /doc-language -->

First follow [Game-engine integration rules](engine-integration.en.md). This page describes current Unity graphic modules and bounded composition delivery; current coverage does not limit the common reuse priority.

The tool provides a few adapted graphic generation Shaders and postprocess modules, not one-click conversion of arbitrary canvases. For complex work, AI must read the native project, reuse, combine and modify modules for the target engine, then validate the result. Query actual support before Unity delivery; handdrawn uses the [unified postprocess](handdrawn-postprocess.en.md). Having GLSL source is not proof of Unity support.

For animated handdrawn effects without baked outline inputs, read [Live contours and individual strokes](handdrawn-postprocess.en.md) and select the reported live mode. The analytic single-pass route below is for graphs without post effects; old light/frozen renderers are retired.

## First supported subset

| Category | Scope |
| --- | --- |
| Graphics | Current reviewed sources of Circle, Ring, RoundedRect, LinearGradient, RadialGradient, LedBar, FlowingWater and TurbulentFlame |
| Transforms | Static placement, size, pivot, rotation, mirror, contain/stretch; static UV scale, rotation, offset and twist |
| Color | Inherited, preserved or own solid/two-color gradients; opacity |
| Compositing | Native over/add/max/multiply/subtract/screen/difference/overlay/softlight/dodge, sibling mask/inverseMask, attached masks using height |
| Time | Continuous formula seconds and per-node clock speed/offset/frozen seconds; export duration is not a seamless-loop promise |
| Not supported yet | Keyframes/time remapping, arrangement, repeating/overflow boundaries, scrolling/polar UV, multi-stop/remapped color, effects/curves/contours, images and unreviewed formulas |

The query returns each affected nodeId, capability, reason and adaptation route. Any unsupported feature blocks the complete realtime export: no nodes are omitted, no implicit bake is substituted, and the project is not edited. Blur/bloom need a future validated multi-pass adapter or an explicit bake. Handdrawn uses the unified postprocess instead of skipping its stage in this analytic exporter.

## Offline CLI

Run from the actual installed Skill directory:

```sh
node scripts/texforge.mjs project shader-support source.project.zip --output support.json
node scripts/texforge.mjs project shader source.project.zip --shader-mode realtime --times 0,.75,1.5,2.25,3 --size 256 --output realtime-shader.zip
```

Omit `--node` for the complete canvas. With a node ID, native solo semantics exclude ancestors and siblings. `--shader-mode auto` uses the unified postprocess for a handdrawn stage or fails explicitly. Select it with `--shader-mode postprocess --handdrawn-input auto --node ID --time 1.5`; the old handdrawn mode is retired. Before adding adapters, read [responsibilities and extension rules](shader-architecture.en.md).

## MCP for a connected editor

Identify and capture the intended page using the [live connection contract](live-editor.en.md). Use the same fresh snapshotId with `forge_deliver`:

```json
{"snapshotId":"actual-snapshot-id","kind":"shader-support"}
```

When supported, export:

```json
{"snapshotId":"actual-snapshot-id","kind":"shader","shaderMode":"realtime","times":[0,0.75,1.5,2.25,3],"size":256}
```

Files live on the MCP host. No canvas or client configuration is changed. The CLI/MCP analytic composition route covers only the subset above and is not a global webpage export format. In the webpage, select an adapted graphic node and use **Shape → Graphic selection → Unity graphic Shader** to download its independent generation module with current base parameters. Node colors, transforms, arrangement, keyframes, composition and post effects are excluded. This download does not recreate the original work.

## Package and Unity integration

ZIP directory `Unity/` contains uniquely prefixed `.shader`, `.hlsl`, `parameters.json` and `Editor/*Importer.cs`. Copy its complete contents to a dedicated folder under the target project's `Assets/`, preserving the hierarchy. Target: **Unity 2022.3 / URP 14 / Mesh UV0 / unlit transparent pass**, not a universal built-in pipeline, UI stencil or particle-stream adapter.

Activate a URP asset, then choose **Assets → Momo Texture Forge → Import <package ID> material** and select that parameters.json. The importer checks Shader errors and creates a new material without overwriting assets. Its package-specific C# namespace exposes `MaterialImporter.ImportFile`. Every export has a distinct Shader path/file prefix/importer namespace; same-type nodes also retain separate properties.

`parameters.json` uses schema `momo.realtime-shader/v1`: actual properties and nodeId mappings, source/archive hashes, optional snapshot identity, engine/pipeline target, time/UV/design aspect, input textures (empty in this subset), support and verification. `source-project.zip` retains the complete source dependencies; `sources/` includes the current graph and algorithm sources.

Core math blends **premultiplied numeric sRGB RGB + coverage alpha**. In Linear projects the URP wrapper converts final straight color to linear and premultiplies again, using `Blend One OneMinusSrcAlpha`. Palette properties are numeric sRGB **Vectors**: use SetVector without Color.linear or multiplying alpha twice. Scalar formulas provide coverage; FlowingWater keeps native RGBA and separate scalar height. Attached masks read height; sibling mask reads alpha.

Automatic time is `_Time.y` seconds. Exact-time comparisons use `_MF_UseExplicitTime=1` and `_MF_Seconds=0.75`. Per-node clocks have independent mappings. Drive properties through material instances or MaterialPropertyBlock. UV0 runs from bottom-left to top-right over 0–1; mesh aspect should match `uv.designAspect`. Material output is transparent color coverage, without baking the canvas background or height/normal output selection; original settings are recorded separately.

`reference-*.png` are native straight RGBA transparent references; `generated-*.png` are analytic previews. Black/white background differences are recorded in `verification.frames`. Analytic evaluation can differ slightly at boundaries from the editor's intermediate texture filtering. Browser success is not engine success: the exporter keeps `engineCompilation=not-run`. Record real Unity compilation, playback, parameter changes and background comparisons separately in the consuming project. HLSL core compilation alone does not establish complete URP Shader compilation.
