# Standard Unity Shader resources

<!-- doc-language -->
[简体中文](unity-modules.md) · [English](unity-modules.en.md)
<!-- /doc-language -->

A graphic's Unity module is its adjustable target-engine implementation, for user learning, direct use and AI composition. Follow [Engine integration rules](engine-integration.en.md). Read and reuse existing modules before implementing gaps; do not translate the same GLSL again. The current formal target is Unity 2022.3 / URP 14.

## Read and extract

Native project and graphic-resource ZIPs carry supplied Shader/HLSL sources, parameter mappings, importers and dependencies. Graphic files are under `shaders/resource-hash/`; used postprocesses are under `engine-shaders/effects/effect-id/`. Resource descriptors referenced by `manifest.json` identify exact paths. Resource integrity covers these files. Renaming preserves implementation binding; algorithm changes invalidate old bindings.

The composition/handdrawn Shader download's `source-project.zip` contains the main canvas and its dependencies, without copying the editor's entire graphic list. `source.archiveSHA256` identifies the incoming snapshot (or the packaged reference when no snapshot was supplied); `packagedArchiveSHA256` verifies the packaged reference. Native project saves still preserve their graphic list.

Extract supplied sources without a browser:

```sh
node scripts/texforge.mjs modules source.project.zip --output engine-modules
```

Read the resulting `index.json`, then only the relevant implementation and setup files. Extraction generates no new Shader, executes no custom C#, and does not establish Unity verification. Resources with no module are absent; do not omit their effects from the work.

For live work, use `forge_pages` to identify the intended page and capture a fresh snapshot. `forge_resource` saves the actual dependency's native JSON and returns `shaderModules` with absolute source paths, parameter mappings and target information. Read these files directly. Native JSON retains the complete resource. Do not access other tabs or the entire user library.

## Graphic modules

Downloads preserve the formal Shader/HLSL without retranslating when values change. Current graphic values populate `Unity/parameters.json`; stable `variable` and `slot` map to material `property`. Preserve all native parameters, including radius, width, feather, seed and speed, with their meaning and ranges; do not bake them into constants.

Place Unity files other than `Shared/` in `Assets/MomoTextureForge/Graphics/graphic-id/`. Merge `Shared/` into `Assets/MomoTextureForge/Shared/` once, sharing it across graphic and postprocess modules. Use the package's Assets → Momo Texture Forge importer with its matching `parameters.json`, or create and configure a material. Formula time is seconds: `_MF_UseExplicitTime=1` uses `_MF_Seconds`; automatic time uses Unity `_Time.y`. Transparent output excludes the canvas background. Linear projects convert final color to linear and premultiply, using One / OneMinusSrcAlpha blending.

Additional node palettes, transforms, arrangement, keyframes and postprocesses belong to their corresponding modules or composition code. A base graphic package does not represent the whole node or work. See [Realtime graphics and composition](realtime-shaders.en.md) for the bounded composition exporter.

Import each graphic module once. Replace or save another `parameters.json` and rerun its importer for new material values, avoiding duplicate C# classes.

Direct graphic materials support UV0 meshes. For editor-matched 2x raster sampling, assign `sourceMaterial` and the included `GraphicResolve` Shader to `MomoGraphicRenderer`, then call `Render(material, seconds, width, height, 2)`. Output is premultiplied numeric-sRGB in a linear ARGBHalf RT. Connect postprocesses using `inputIsLinear=false`, `inputIsPremultiplied=true`. The component clears the intermediate target each frame, reuses/resizes targets and releases resources.

For scripted graphic rendering set `automaticUpdate=false` and manage time/order in the caller. Automatic mode uses `sourceMaterial`, reading `seconds` when `automaticTime=false`.

## Image postprocess modules

Picker downloads use module defaults; an added effect's panel downloads current values. Merge the complete `Unity/` tree into `Assets/MomoTextureForge/`, preserving `Shared/` and `Postprocess/`. Multiple modules share one copy of Shared to avoid duplicate C# classes. Use Assets → Momo Texture Forge → Import postprocess module with that module's `parameters.json` to create a prefab with a serialized Shader reference.

Components expose all their own parameters. `input` accepts images or live RenderTextures; `Render(input, seconds)` updates explicitly, with automatic updates also available. Declare `inputIsLinear` and `inputIsPremultiplied`. Output is **premultiplied numeric sRGB RGBA** in a linear ARGBHalf RT, matching editor intermediates. Chain using `inputIsLinear=false` and `inputIsPremultiplied=true`. Convert output color before display in a Linear scene. Normal `heightMode` reads alpha at 0, luminance at 1 or explicit `heightInput` at 2. Pixel radii use a 512-pixel short-edge design grid.

For final display create a transparent UV0 mesh material using the included `MomoTextureForge/Display/NumericSRGB` Shader. Assign the graphic renderer's or final postprocess's `Output` to `_MainTex`. This Shader converts numeric-sRGB output into the project's display color space and uses premultiplied blending. Do not display intermediate RTs as if their colors were already linear.

Blur/bloom retain their intermediate rendering steps. Components handle input/size changes, temporary RT return and disable/destroy cleanup. Connect effects in authored order; do not replace a multi-step implementation with a similar-looking fragment. [Unified handdrawn modules](handdrawn-postprocess.en.md) retain their own parameter support report and input contracts.

Automatic postprocess updates use `input` and component time. For fully caller-ordered `Render` calls, set the component `enabled=false` before calling its public method each frame, preventing `LateUpdate` from replacing results or releasing them for an empty `input`. Destroying the component still releases resources.


Render requires an activeInHierarchy GameObject. Disable the component for manual updates, rather than allocating resources on a never-active object. Inactive calls fail before allocation.

Handdrawn extraction is labeled `shared-source-template`. Reuse its shared source, then query `project shader-support` and export with `--shader-mode postprocess` to bind actual parameters/namespaces and check support. The templates alone are not a complete importable prefab package.

## Custom resources can supply implementations

Resource objects may provide `engineShaders.unity` with schema `momo.engine-shader/v1`: `id`, `kind: "graphic"`, `target`, `shaderFile`, `hlslFile`, complete `parameters`, `files` and native `sourceSignature`. Each parameter binds `variable`, `slot` and `property`. `files` maps safe relative paths to UTF-8 source, including `Unity/parameters.json` and formal importer dependencies.

Formula/generator authoring JSON may include the same `engineShaders` field. On first supply, omit `sourceSignature` to bind the actual parsed native source. Do not reuse an old binding after algorithm changes. Saving, sharing, remote libraries and offline extraction preserve files. These resources require no framework graphic-list changes. A graphic with no supplied implementation remains usable in the editor without claiming a Unity module.

## Acceptance

Validate in batches: compilation, every native parameter mapping/response, representative times, transparent/dark/light backgrounds, input sizes, import/persistence and resource release. At low resolutions, editor raster filtering and analytic sampling can differ at edges; record measured error and reference resolution. Clear structural or parameter-semantic mismatches cannot ship as full support.

Record browser comparison, HLSL compilation, Unity compilation/visuals and Player/mobile checks separately. Package status is provenance, not a substitute for target verification. Report reused, adapted and newly implemented parts.
