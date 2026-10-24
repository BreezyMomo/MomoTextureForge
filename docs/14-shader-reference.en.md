# Shader reference packages and AI integration

<!-- doc-language -->
[简体中文](14-shader-reference.md) · [English](14-shader-reference.en.md)
<!-- /doc-language -->

[Manual index](README.en.md) · [AI collaboration](10-ai-and-help.en.md)

## Download from the effect panel

Select a shape or group, tune **Composite → Post-processing → Hand-drawn style**, and inspect the usual canvas preview. **Download fill shader reference** at the bottom exports sources, current-frame settings and textures. There is no separate workbench or duplicate parameter window. Base-value editing exports base settings; animation editing exports evaluated current-frame values.

Only hand-drawn fill currently provides a reference: solid, hachure, cross-hatch, dots, dashed and zigzag-line. Original fill, no fill, zigzag fill and sunburst do not yet have references; attempting a download explains this. Other post-effects do not have a download entry yet.

## Read the two preview images

- `editor-preview.png` shows the current node in the editor, including its outlines and other post-effects.
- `reference-preview.png` shows the packaged shader fill, excluding Rough.js outlines, repeated strokes and advanced fill details.
- `parameters.json` contains actual shader values in `parameters`, original hand-drawn settings in `sourceEffect.values`, and explicit `mapping`/`limitations`. Roughness divided by 10 becomes line wobble; values outside shader ranges are bounded while originals remain available. This is not a pixel-identical conversion.

The mask captures content entering the selected node's hand-drawn effect, retaining child effects and skipping this node's hand-drawn and subsequent effects. Its contour uses current source, threshold and simplification settings. The static snapshot uses canvas coordinates and aspect ratio, at most 512 pixels on the long side. Transforms and the current frame are baked in; no node tree or keyframes are exported. Animation and complex transforms need target-project adaptation.

`mask.png` stores coverage in RGB with constant alpha one. **Read red, disable sRGB and use Clamp sampling.** Reading alpha would make the whole texture solid. Design pixels use a 512-unit short side; width is dot radius in dots mode. The bilingual package README documents the full contract.

## Give the package to AI

Download the **Authoring Skill** from Help and supply the package, target project and intended change, for example:

> Integrate the supplied shader into this project's URP material. Compare editor and reference images first; retain cross-hatch fill and color, and explain how outline differences will be handled. Compile and check transparency. Use Texture Forge for additional masks if needed.

`handdrawn-fill.hlsl` is the core; `HanddrawnFillURP.shader` targets Unity 6 / URP 17 as a reference wrapper. The internal GLSL reference image uses the same core math. **Browser success is not target-engine compilation**, recorded as `engineCompilation: not-run`. The Skill guides source/parameter inspection and adaptation to the actual project; texture authoring retains its existing workflow.

Downloading leaves project data and undo history unchanged. This is not a graphics-library resource ZIP.

## Hand an authored project to AI

Use **File → Save project** and supply the project ZIP plus the latest Authoring Skill to AI, together with Unity URP as the target, usage and performance requirements. No new screenshots or manual parameter transcription are needed. Project ZIPs include nodes, keyframes, actual formulas and image dependencies. The AI graphic catalog still describes the library only.

The Skill now supplies project inspect/render/check/handoff/shader tools. AI can inspect stable parameter identities and structure, render times in seconds, extract a node or the input before an effect, and create additional textures through formula/generator tools. Handoff preserves the original, an effect brief, sampled frames, a contact sheet and implementation instructions; it does not convert all effects automatically. See [AI command-line rendering](../AI_AUTHORING_CLI.en.md) for commands and contracts.

The first integration path uses the existing handdrawn fill reference: AI reads actual node IDs and runs project shader to export current parameters, mask, sources and comparisons. Extract into a dedicated Assets folder, place the supplied MomoHanddrawnImporter.cs in an Editor folder, then use **Assets → Momo Texture Forge → Import handdrawn reference** to select parameters.json and create a new material. The importer configures linear red-channel masks, Clamp, no compression and reference time without overwriting materials. An active URP asset is required.

The brief preserves animation data for AI implementation, while the handdrawn reference mask remains a frame snapshot. Strokes, complex compositions, particle/UI integration and animation driving require adaptation. Export results and actual Unity compilation/visual validation are recorded separately; texture preview success does not establish game reproduction.
