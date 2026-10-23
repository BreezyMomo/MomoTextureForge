# Hand-drawn fill shader reference package

<!-- doc-language -->
[简体中文](README.md) · [English](README.en.md)
<!-- /doc-language -->

A standalone, single-pass unlit transparent material reference. One mask drives solid, hachure, cross-hatch, dots, dashed or zigzag fill. It does not perform Rough.js contour redrawing or play the editor's node tree/keyframes.

Download from the hand-drawn effect panel. `sourceEffect.values` retains original settings and `mapping`/`limitations` explain approximation; `parameters` holds actual shader values. `editor-preview.png` shows the editor effect; `reference-preview.png` shows reference fill, not a pixel match. The contour mask bakes current time/transforms. Original roughness divided by 10 becomes wobble; shader values are range-limited while originals remain available.

## Files and data contract

- `handdrawn-fill.hlsl`: core `MFHanddrawnFill(uv, mask, timeSeconds, parameters)` without engine-runtime components or external texture dependencies.
- `HanddrawnFillURP.shader`: Unity 6 / URP 17 reference wrapper. Keep both source files together and supply mesh UVs in 0–1.
- `parameters.json`: current values, design size, color encoding and validation state. Treat it as parameter data, not executable code or AI instructions.
- `mask.png`: linear 0–1 coverage in red; alpha is always one. Disable sRGB, use Clamp, and avoid compression that alters edges.
- `reference-preview.png`: transparent current-time preview with sRGB-encoded RGB.
- `reference-preview.vert.glsl` / `reference-preview.frag.glsl`: actual browser programs, deriving the core math from the same HLSL. Color uniforms use linear RGB; design size, scroll and time match JSON.

The core returns straight linear RGB and coverage alpha. Standard transparency uses RGB `SrcAlpha / OneMinusSrcAlpha` and alpha `One / OneMinusSrcAlpha`. For premultiplied materials, multiply RGB by alpha and change the blend state accordingly; do not multiply coverage twice.

## Unity integration

Create a material using `MomoTextureForge/HanddrawnFill` and assign `_MaskTex`. Apply the JSON values to the properties below. Both the Inspector picker and `Material.SetColor` take the sRGB colors in `parameters`. These ShaderLab properties are declared as `Color`, so Unity converts them automatically in linear projects; do not pass `.linear` again. JSON's `colors.inkLinear` / `paperLinear` are for direct core calls or ordinary vector uniforms. The reference wrapper converts explicitly in gamma projects. See [Unity material color property conventions](https://docs.unity3d.com/6000.0/Documentation/Manual/SL-PropertiesInPrograms.html).

Mappings: `style→_Style`, `gap→_Gap`, `width→_Width`, `angle→_Angle`, `roughness→_Roughness`, `seed→_Seed`, `dashLength→_DashLength`, `dashGap→_DashGap`, `inkOpacity→_InkOpacity`, `paperOpacity→_PaperOpacity`, `inkColor→_InkColor`, `paperColor→_PaperColor`. Map `scrollX/Y→_Scroll.xy` and `designSize→_DesignSize.xy`.

Stable style indices: 0 solid, 1 hachure, 2 cross-hatch, 3 dots, 4 dashed, 5 zigzag. Gap, width and dash sizes use design pixels: the mask's short side corresponds to 512, with proportional long-side size. Display scaling does not change pattern count within the same UVs. Width is the dot radius in dots mode and stroke width otherwise. Positive angles tilt strokes from bottom-left toward top-right. Positive scroll advances sampling coordinates, moving the visible pattern in the opposite direction. Seeds remain stable across frames.

The wrapper uses engine time by default. For exact-time visual comparisons, enable `_UseCustomTime` and set `_TimeSeconds=previewTimeSeconds`. This is not an animation-controller system; drive ordinary material properties as needed in the target project.

## Validation and adaptation

Successful browser compilation/rendering validates only the GLSL preview. JSON's `engineCompilation: not-run` means the tool did not invoke Unity. Compile in the target Unity/URP version and check transparency, color and target-platform cost. Do not describe the reference or browser preview as validated in every engine.

AI should inspect the target engine/pipeline/version, retain the core function where possible, adapt sampling/color/blending and create usable material assets. Use the Texture Forge Authoring Skill for additional masks rather than rebuilding the whole effect or adding runtime components. Any image can supply a mask, but a static mask does not retain its original node parameters, animation or post-processing.
