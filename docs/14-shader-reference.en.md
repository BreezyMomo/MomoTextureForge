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
