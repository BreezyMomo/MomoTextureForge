# Resource creation and image processing

<!-- doc-language -->
[简体中文](image-editor.md) · [English](image-editor.en.md)
<!-- /doc-language -->

Create resource has Image, Import files, Formula and Generator tabs with shared name/category/description. Successful preview can be imported into the library, then reused in the list/canvas. Skill downloads are in Help, not this dialog.

## Image tab

Image nodes default to keeping source aspect within their node region, including legacy nodes. Stretch intentionally distorts it. This node setting does not change source pixels, the whole group or arrangement coverage. Logical bounds are not opaque-pixel contours. Instance fit and region fit are separate levels.

Cards/import entries label bitmap or SVG according to saved MIME. Converted SVG becomes a vector resource; formulas/ordinary PNGs are not SVGs.

Upload PNG/JPG/WebP up to 4096 longest side and 16 MB, or static SVG up to 2 MB. SVG retains source and rasterizes at rendering size. Scripts, external links, animation, CSS and text are rejected; convert text to paths. SVG and bitmap controls differ.

Paste actual clipboard image files with Ctrl+V/⌘V in the Image tab or image editor. Text paste stays normal; URLs/HTML-only references are not downloaded. Use file selection when the browser supplies no image. The page does not proactively read the clipboard or ask for extra read permissions.

| Control | Effect and guidance |
| --- | --- |
| Image mode | Original RGBA, luminance mask or alpha mask. Mask modes support node coloring; recoloring can also alter luminance intensity |
| Scale/rotation | 10–400%, clockwise −180–180° about canvas center, fixed canvas and clipped overflow; reset available |
| Keep original | No background removal |
| Remove specified color | Pick on original, adjust tolerance/transition. Edge-connected-only retains enclosed regions; disabling can also remove subject colors |
| Extract specified color | Keep matching pixels anywhere, retain RGB and multiply alpha; tolerance/transition broadens/softens matches. No connectivity filter/background unmix. Bitmap only; can precede SVG conversion |
| Black-background to alpha | Suppress black in bright effects; threshold/transition need checks on black/white backgrounds |
| Auto center | Center nontransparent processed bounds without scaling or resizing canvas |
| Contour reconstruction | Reshape simple blurry edges; cannot restore photographic/unknown detail |
| Adjust colors | Unchanged/tint/replace, source eyedropper and target color, tolerance/transition. Preserve semitransparency for soft edges; disabling never fills fully transparent backgrounds |
| View original | Compare input/result on checkerboard/black/white; preview follows its scroll region |
| Convert to SVG | Monochrome outlines/holes from processed alpha; threshold, denoise, smoothing, detail and size trade precision for complexity; gradients/soft edges/multiple colors simplify |

During the draft, compare input, disable processing or reset transforms. Saving/importing confirms the result: processed bitmaps bake to transparent PNG at original pixel dimensions without a recoverable background/center/contour/color/transform history. Later edits start from the result. Image mode, node colors, region/layout and animation remain editable. Unprocessed files need not be reencoded; SVG retains paths. Exporting old projects bakes processed bitmap copies without rewriting old files or deleting old libraries.

Preview is immediate where possible; complex conversion/baking takes time. Failures retain the previous frame, not proof of new settings. Failed baking does not save the original as a substitute. Baking reduces later processing, though background removal was not necessarily per-frame, and PNG may exceed the old JPEG's size.

Many paths can be slow. More than 50,000 anchors produces guidance; SVG over 2 MB needs reduced sampling/detail or a bitmap. Adequate-resolution bitmaps often make sense. Use Photoshop for complex motifs/retouching; this is a lightweight editor.

## Image to height and normals

1. Add an image in original RGBA mode. Height is luminance × alpha, including internal brightness on opaque images; transparent areas have zero height.
2. Select Height or Normal above the canvas. Normals use neighboring height differences, not real-world reconstruction; photo shadows can become apparent height.
3. Adjust normal strength, Sobel/Scharr, X/Y flips, inverted height and pre-smoothing. Zero strength is flat. Inversion swaps relief; Y flip matches a consuming normal convention.
4. Inspect a neutral lit material in 3D, rotating or changing lighting, then return to 2D for actual normal pixels. Color mode shows flat artwork.
5. Select Normal separately in Export and choose PNG/another format. Generation settings persist with projects; the image's colors remain. Changing preview does not rewrite the source or auto-change export content.

## Import files tab

Select one/multiple authoring JSON files or paste/parse JSON. A single item can be edited; batches retain individual metadata and require selection. ZIPs must be official resource/library exports with manifests and dependencies. Extract ordinary JSON/preview collections first. Skill ZIPs are not graphic packs. For missing manifests, identify the file type rather than adding empty files. Parsing does not publish. Follow identity-conflict save-as guidance.

## Formula tab

GLSL expression/body plus helpers, up to 16 variable/alias/range/step/default controls. Variables match code; the system manages slots. Unused-variable guidance is not a compilation error; actual compile errors block save. Right-side trial values affect preview, while left-side defaults are saved. Seconds can play/scrub; only time-aware code moves.

Image/status remain visible while parameters/playback scroll separately; short windows reduce preview size and narrow screens may require scrolling. Do not confuse trial values with defaults. Validate & preview tests the draft; repair information exports diagnostics, and authoring-file export saves JSON. Recommend Authoring Skill for new code rather than manual internal slots/IDs.

## Generator tab

Paste/select generator JSON for native RGBA and ordered GLSL passes, without templates. Up to 64 parameters, 16 passes and three earlier inputs per pass. Validation builds controls; sliders update previews and saved defaults. Errors retain old output and must be repaired before saving. Export JSON for code editing or official ZIP for dependencies; Import files also accepts it.

Built-in smoke/fire/etc. can be edited and saved separately. Custom generators retain code editing. Time-aware built-ins include the seven original effects, water/caustics/fire/lightning and volumes. Speed zero freezes motion where exposed. Seed/parameters/time reproduce results. Preview time and node speed/offset/freezing are distinct from parameter keys. No cross-frame simulation or user JS is supported. Authoring Skill covers algorithms; this Skill explains controls/workflows.
