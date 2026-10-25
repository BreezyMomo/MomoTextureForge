# Unified handdrawn postprocess

<!-- doc-language -->
[简体中文](handdrawn-postprocess.md) · [English](handdrawn-postprocess.en.md)
<!-- /doc-language -->

First follow [Game-engine integration rules](engine-integration.en.md), which apply to all effects. This page adds only handdrawn-specific input, parameter, runtime and support contracts, not a separate engine-integration workflow.

For turning images or generator output into handdrawn work, use the formal **RGBA input → automatic contours and fill → output** pipeline, mode `postprocess`. Light fill-only and frozen outlines are retired. Existing project/node/parameter data remains readable; never change a canvas to fit the exporter.

```sh
node scripts/texforge.mjs project shader-support /work/effect.zip --shader-mode postprocess --output /work/support.json
node scripts/texforge.mjs project shader /work/effect.zip --shader-mode postprocess --handdrawn-input auto --times 0,.75,1.5,2.25,3 --size 512 --output /work/handdrawn.zip
```

Read `modes.postprocess`, `inputAdapters`, `unsupportedParameters` and `approximations` first. `--node ID` selects a particular stage; omission requires one unambiguous stage. This is a generic postprocess package, not a claim to compile every canvas effect. `auto` selects only a reviewed RGBA producer or static source; unsupported animated sources block export, never silently snapshot. Explicit `--handdrawn-input texture` acknowledges a static pre-sketch RGBA input at the requested time. It is an input image, not baked contours; the postprocess still rebuilds from it. `external` supports user-supplied Texture2D/2D RT; `generator` requires a reviewed producer.

The code badge and Download Shader action in Add effects deliver a default-parameter module with external image/RT input and independent sample input, without reading or modifying the current canvas. Download from the added handdrawn effect panel to retain current parameter values.

Web: select a node and use **Composite → Handdrawn → Download handdrawn postprocess**; choose the RGBA input adapter in that effect panel. The effect-specific download is not a global export format. MCP: identify an enabled page with `forge_pages`, capture using `forge_capture({pageId})`, query `forge_deliver({snapshotId,kind:"shader-support",shaderMode:"postprocess"})`, then supported export using `forge_deliver({snapshotId,kind:"shader",shaderMode:"postprocess",handdrawnInput:"auto",times:[0,.75,1.5],size:512})`. Use one fresh snapshot and recapture after edits. `auto` handles a sketch stage only through this pipeline or fails. Retired `handdrawn` / `dynamic-handdrawn` return migration errors only.

Packages use `momo.handdrawn-postprocess/v1`, retaining actual native parameters, source hashes, real pre-sketch RGBA, one GPU core, coverage Shader, runtime, material/Prefab importer and optional independent RGBA producer. Producers do not duplicate handdrawn algorithms. Images, RT and generators share `HanddrawnEffect`. Follow [package instructions](shaders/postprocess/README.en.md) and `unityImporter`; references persist in Prefabs, input replacement automatically adapts aspect/cache. Do not depend on this conversation or temporary consumer projects, or rewrite available conversions.

Native source0 is alpha; source1 is **dot of premultiplied numeric sRGB RGB at the working stage**. `sourceAlphaMode` distinguishes Straight/Premultiplied and `sourceColorSpace` UnitySampled/NativeSRGB to prevent double alpha/color conversion. Design short side512 extends the long side proportionally. Initial captured stage crop sizes are retained; new inputs adapt automatically unless the user explicitly overrides scale. Unity SetColor receives sRGB. Node opacity applies once after original/fill/stroke composition.

`parameters.nativeFillMapping`: native0→OriginalInput2 (entire input plus outlines),1→Solid0,2→IndividualHachure1,4→NoFill3. Unsupported native styles, dashes/vertices or non-default vector preprocessing report exact paths and block export; never remove editor options, substitute styles or ignore settings. Native roughness1.3 and width4.8 retain their values, without normalized legacy fill controls. Contours/vector preprocessing/RNG remain declared approximations, not exact Rough.js equivalence.

Validate shared image/RT/producer processing, static caching/refresh, switching, semitransparent straight/premult input, source semantics, rectangular scale, OriginalInput/None, color/opacity, parameters/seed, Prefab reload/multiple instances, release/overflow. Exporter engine status stays `not-run`; record actual Unity verification separately. Browser compilation or earlier prototypes do not validate a new package. State untested mobile/Player scope. Retired light/frozen references are historical data only, never export recommendations.
