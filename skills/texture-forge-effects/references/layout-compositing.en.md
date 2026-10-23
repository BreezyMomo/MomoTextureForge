# Transform, arrangement and compositing

<!-- doc-language -->
[简体中文](layout-compositing.md) · [English](layout-compositing.en.md)
<!-- /doc-language -->

## Three different size controls

1. Node region under Transform / Layout: X/Y relative to parent (usual center 0.5/0.5), dimensions, degrees, pivot 0–1, aspect lock, mirror and stretch/contain fit.
2. Shape radius/width changes artwork inside the region. Identify the responsible level before enlarging a small result.
3. Instance size controls each arranged item; shape settings change its content, layout settings its distribution.

The fixed canvas clips final output. Move the contents together with a parent group. Check Y direction with a small adjustment rather than assuming image-pixel coordinates.

## General boundary handling

Select shape/group → Transform / Layout → Node region → Boundary handling: Clip, Allow overflow or Seamless repeat. Multi-editing/discrete keys work. Blue bounds define logical dimensions, pivot, alignment and spacing; overflow never expands those bounds. Ancestors handle clipping/overflow/wrapping independently; the final gold canvas always clips. A node stores one boundary mode; seam algorithm/blend-width controls appear only in repeat mode.

Group overflow reveals outside children. Shape overflow can reveal formula extents, outlines and filters. Images/vectors/generators cannot invent outside pixels, but their positions/glow can exceed parent bounds. Masks still affect actual content. Repeat wraps by the logical period; overflow does not enlarge it. Trace clipping ancestors/masks when content disappears. Boundary comparison, cross-cell dots and seamless-halo examples illustrate these combinations.

## Single puzzle pieces

Puzzle piece is one body with round/square/dovetail/wave connector styles and roundness. Each top/right/bottom/left edge independently selects flat/tab/socket; outline/solid modes remain. Four body corners independently use 0–0.4, zero square. Rounded touching inner corners leave gaps, so keep them zero for tight tiling. The body fills blue bounds; tabs overflow and grids use body spacing. Neighbors need complementary edges with matching style/size/neck/roundness/orientation. Flat outside edges form a clean board. Presets/examples show styles, corners, edges and individually colored boards. Puzzle defaults to overflow, ordinary nodes to clip; allow overflow on relevant parents too. The final canvas still clips.

## Internal UV

Shape → Internal UV affects sampling, not region placement. Scale 0.1–8, rotation −360–360°, offsets −2–2, scroll speed −2–2 plus direction, swirl −6.28–6.28 and polar mapping modify texture coordinates. Sampling scale is not identical to canvas zoom. Change gradually and reset to diagnose distortion.

## Arrange content inside a region

Choose Transform / Layout → Arrangement. Shapes repeat themselves; groups repeat their subtree or choose one direct child per position.

| Mode | Controls |
| --- | --- |
| Off | One item |
| Grid | Rectangular/diagonal/hex cells, rows/columns, staggering and instance size |
| Random scatter | Entire region or density pattern, target count, minimum center distance, density threshold/contrast |
| Radial | Rings, radius, inner ratio, coverage and staggering; equal spacing or equal count per ring; fixed/radial/tangent orientation |
| Spiral | Golden angle (about 137.508°) and center opening, or regular turns/inner radius; outer scale multiplier |
| Path | Bézier endpoints/controls, scale, progress range, count/spacing, end scale and tangent/normal orientation |
| Symmetry | Count, angle and rotation-only or mirrored pairs |
| Border | Rectangle/rounded dimensions, corners, offset, count/spacing, tangent/normal |
| Contour | First child's final alpha supplies contour; later children decorate |
| Herringbone/weave | Pattern type, 4×4-cell repeat blocks, 1–8 block rows/columns, stretched bricks |
| Rule tiling | Direct-child right/top/left/bottom interfaces, 1–16 rows/columns, seed and opposite-edge matching |

Shared settings include overall rotation, position/scale/rotation jitter, seed and center offsets. The layout center offset defaults to zero, unlike node position 0.5.

Center resets offsets. Fill grid, Fill region for scatter, and distribution fit adjust coverage. Fill region sets radius 0.5 and offsets zero, retaining size/count/rotation/randomness; it does not guarantee filling all space. Anti-overlap can still limit count. Instance phase −1–1 offsets local animation, not automatic time-formula loop closure.

Keep design aspect is the default instance fit. Items fit the physical cell/region short side while centers cover the full layout, protecting proportions in wide/tall canvases. Explicit stretch is available. Whole-group contain fit is different and shrinks the distribution, so do not substitute it. Rotation, spacing, physical periods, selection and expansion use consistent transforms. Aspect changes can rearrange scatter; export pixel dimensions should not.

Expand fixes the current arrangement into nodes, retaining internal animation and undo. Some modes allow 512 instances, with actual count reduced by constraints. See [ranges](layout-parameters.en.md) for mode-dependent limits.

## New-arrangement workflows and limits

Examples → New arrangements contains thirteen demonstrations: seamless halo, boundary comparison, cross-cell dots, puzzle connectors/corners, single-piece grid, colored board, border lights, contour dots, herringbone, basket weave, fading dots, wave lines and connected pipes. Open editable canvases, select outer nodes and inspect Transform / Layout. Puzzle pieces can be edited independently.

Contour layouts require groups. First child is the source, later children decorations. Final alpha is sampled at fixed 256×256, including holes. Threshold/normal offset select and shift boundaries; source visibility draws it once. Opaque images yield rectangular contours; remove their background or use luminance masks first. Fine detail is sampling-limited and export resolution does not rearrange it. Border/contour support count/spacing, offset and orientation.

Herringbone/weave stretches into brick regions, four-by-four per block, up to 512 items. Enable group repeat and inspect seams after rotation/aspect changes.

Gradient/flow variations modify existing arrangements: horizontal/vertical/radial/index scale, alpha and rotation gradients, reversibility, wave/vortex position and orientation. Flow phase supports keys. Scatter overlap avoidance temporarily bypasses these variations while retaining settings. Position gradients may jump across tile boundaries.

Rule tiling requires candidate direct children and declared edge-midpoint connections; it does not analyze pixels. Disabled children are excluded. Without repeat, outer interfaces close; with repeat, opposite edges match. Missing candidates can prevent a solution; add endpoints/corners/blank tiles, reduce size or change seed. Tiles stretch to cells and bypass gradients/flow so connections remain intact.

## Group instance content: whole, random or modulo

Put candidates directly under one arranged group. Shape nodes/disabled arrangements do not show this option.

| Choice | Each position draws | Adjust |
| --- | --- | --- |
| Entire group | All composited children | Repeat a coordinated unit |
| One random child | Uniform choice among enabled direct children, repeats allowed | Shared scatter seed; no weights or guaranteed coverage |
| Sequential/modulo | Generated-point index cycles A,B,C,A,B,C | Reorder direct candidates; fixed by point index, not screen coordinate |

Child groups count as one candidate. Disabled children skip, temporarily animated-hidden children retain slots, masks are excluded. One candidate repeats; none is transparent. Random choices remain seed-stable across reload/play/export. Modulo selection does not change with time/seed, though seed can move random points. Candidate count/order/enabled changes remap choices. Disabling arrangement shows the whole group.

## Scatter overlap avoidance and density

Entire-region/density-pattern scatter supports Avoid overlap and extra gap 0–0.5, step 0.005, off by default. It considers selected content/size/rotation for random/modulo mixtures and persists with project/resources.

- Offset enclosing circles approximate visible content rather than transparent full-node bounds or one maximum random size. Long, hollow or concave shapes remain conservative, not tightly nested contours.
- Extra gap and minimum center distance both apply, normalized to the layout's short side. Check both, content size and radius for excessive empty space.
- Count is a target. Space, density and bounded attempts can reduce generated count. Reduce size/gaps/distance or enlarge the radius before raising count.
- Repeat mode also considers across-edge neighbors. Child transforms/effects/phases participate in sampling; outer group masks/contours/postprocessing occur after arrangement and are not individual collision extents.

Sampling is fixed at 128×128 with alpha threshold 1/255 and a small margin. Extremely thin/faint detail can be missed. Do not call this exact pixel collision or guarantee separation at every animation time.

## Aspect and expansion choices

For wide/tall canvases, change Canvas settings and retain instance design aspect. Distribution covers the full region; each design keeps its own proportions rather than forcing ellipses to circles. Unarranged nodes use region fit; stretched ancestors require checking that level. Missing legacy instance-fit settings default to design aspect; explicitly stretch when needed.

Instances share content, so editing a shape does not edit just one repetition. Save a project first, then Expand to independent nodes to fix current positions and random/modulo selections with copied content/animation, retaining outer timing/compositing. Old arrangement-parameter animation no longer drives separate nodes. One undo restores it; large expansions increase node/render cost. Exported pixels cannot restore editable source.

## Spatial seamless repetition and inspection

Inspect Tile preview, then enable the target node's Seamless repeat.

- Automatic uses native periodic rules or repeated independent shapes. Period constraints may adjust effective counts/UV rotation/jitter; arbitrary settings need not retain identical effective behavior.
- Generic edge blending mixes sides where no specialized rule exists. Width 0.05–0.45 softens joins but can ghost.
- Group repetition wraps the composite. Child seams need their own treatment; internal seams differ from final canvas-edge matching.

Spatial repetition does not establish a temporal loop.

### Multisegment Bezier editing

Bezier Ribbon and Along path share the expanded editor: zoom with the wheel/buttons, pan empty space, and Fit all to reveal points. Points use a move cursor and hover highlight; background uses a hand, locked points a prohibited cursor. Insert anchor subdivides a span without initially changing its shape; Extend adds a span. Keep 1–8 cubic spans with shared anchors and coordinates −8…8. Anchors carry adjacent handles. Point edits support undo/keys; topology edits lock during recording or existing point animation.

The first span stays in `params[0…7]` for ribbon shape or `arrange[40…47]` for layout. Extra spans use the flat `bezier.shape` / `bezier.layout` tail: six numbers per additional span (two handles and its endpoint). Existing single-span projects remain valid.

## Compositing, color and masks

Shape contains Opacity (0–1, multiplied through parents, with keys) and Node colors. Color source is a dropdown for inherited/custom palettes; groups can preserve child colors or remap together. Visit the inheritance source or copy its evaluated palette independently. Levels, Invert and Channel curves are in Shape. Composite contains blends, masks, contours and post-processing.

Solid fill preserves color while edges affect alpha. Value gradients map pattern intensity, not horizontal location. Two-to-eight stops have positions 0–1, palettes and reset to endpoints. Use a gradient graphic for spatial coloring.

| Blend | Intent |
| --- | --- |
| Normal | Alpha over |
| Add | Brighter glow, potentially overbright |
| Maximum | Retain brighter components |
| Multiply | Darken/modulate |
| Subtract | Remove brightness, not transparent holes |
| Screen | Lighten |
| Difference | Color difference; overlap can darken |
| Overlay / Soft light | Contrast, gentler for soft light |
| Color dodge | Strong brightening; control opacity |
| Mask / Inverse mask | Keep/remove earlier content within the same group |

For holes use inverse masks, not background-colored paint. Group base and mask together to avoid affecting unrelated layers.

Contours: off/outer stroke/dilate/erode, width 0–0.1 of short side. Outer stroke keeps only outside lines; dilate expands and erode shrinks. Groups composite first. Duplicate layers for fill plus outer stroke.

Levels: brightness −0.6–0.6, contrast 0.1–3, gamma 0.1–4, input/output remapping and invert. These can affect masks and gradient mapping; reset them when diagnosing colors.

## Ribbon and trail textures

Search the graphics library for `FoldedRibbon` (Folded ribbon strands), `RefractionMembrane` (Refractive membrane), or `ParticleStrands` (Particle strands). They are ordinary graphic resources, not new node kinds. Start with a transparent 4:1 or 8:1 canvas and a Trail style preset in graphic parameters. Folded strands gather into creases; the membrane is a continuous sheet with independent interior/edge colors; particle strands have independent distortion phases and width/opacity variation. Inherited membrane colors retain its palette; node colors can override it.

Widths are relative to graphic height. Evolution speed supports reverse motion and freezes at 0; UV scrolling is independent. Horizontal seamless rounds frequencies to whole cycles and disables end fading, joining spatial edges without guaranteeing matching first/last animation frames. Shared opacity, colors, curves, filters, keyframes and exports remain available; do not change the generic node structure for these graphics.

## Channel curves

Select a graphic or group and open **Shape → Channel curves**. Nodes inheriting a palette can use curves too. Groups composite their children before applying curves.

- Choose **Luminance / height, Master RGB, Red R, Green G, Blue B, or Alpha**. Luminance adjusts brightness and height; RGB changes color only. Alpha changes coverage and scales the height contribution accordingly.
- Click the graph to add a point, drag or use arrow keys to move it, or enter input/output values from 0–255. Endpoint inputs stay at 0 and 255; their outputs remain editable. Internal points can be deleted. Up to 16 points use smooth cubic interpolation through the controls, with continuous tangents and no overshoot. The graph, preview and exports share the same shape. Two-point curves remain straight.
- Editing points or applying a preset enables curves. Disable temporarily, reset one channel, or reset all curves. Undo/redo, project/resource saves and exports preserve them.
- Curves run after basic brightness/levels and before contours/post-processing. Color order is luminance, master RGB, then individual RGB channels; Alpha follows. Unmodified channels preserve their original values, avoiding HDR clipping when adjusting only Alpha.
- Curve shapes currently support neither keyframes nor batch edits. For multiple selected nodes, edit the primary node. These curves remap pixel values, unlike parameter curves in the animation timeline.

For softer smoke or mask coverage, adjust Alpha. To change brightness while keeping transparency, use RGB. Mapping Alpha input 0 to a nonzero output also covers previously transparent areas inside the node region.


### Node post-processing and execution order

Use **Composite → Post-processing** on a shape or group. Each effect has its own switch, disclosure, help and parameter reset. Help does not expand the parameters. Disabling an effect retains its settings. Drag its **⠿** handle, or focus the handle and press keyboard **↑ / ↓**, to change the actual execution order: each effect processes the previous result, from top to bottom. Dragging shows a floating header and placeholder while other effects move aside smoothly. Release to settle; Esc or releasing outside the panel cancels without changing effect order.

Effect order belongs to the node and supports undo, unlike inspector-module sorting, which only changes the interface. Saving, copying and inserting a graphic as a component retains its parameters, switches and effect order. A group composites its children before applying its effects. Wrap content in an outer group for a whole-composition effect; there is no separate canvas post-processing state.

Available effects: Gaussian blur, bloom, sharpen, chromatic aberration, posterize, pixelate, edge shading, scanlines, kaleidoscope, mirror tiling, swirl, edge detection, three-color mapping, radial mask, remove black, height to normal and hand-drawn style. Bloom retains strength, radius and highlight threshold. Chromatic aberration supports horizontal, vertical and radial offsets. Posterize has separate shadow/highlight levels; zero highlight levels follows shadows. Edge detection follows luminance changes, unlike alpha contour outlines.

Numeric and color parameters use existing keyframes, batch editing and pinned controls. Zero scanline speed freezes motion; phase remains adjustable. Blur, bloom, color offsets, pixel blocks, edge widths and normal sampling steps scale from a 512-pixel short edge. Rotations use degrees. Radial masks affect alpha and height together; remove black retains existing transparency while recovering color.

Height to normal converts current height into node colors while retaining alpha and height. Later compositing and color filters still affect those colors. Normal output separately derives normal data from final height. Base levels, inversion, channel curves and contours still run before this effect list. Legacy projects retain their original filter order and `postFx.*` animation paths.


### Creative style effects

Ten new effects share the node stack with the original seventeen. Open **Composition examples → Composition practice → Creative effect comparison** for the original and all ten styles. Three additional examples demonstrate Comic print, Retro handheld and Hologram glitch. Read the comparison left to right, top to bottom; select a node to inspect its settings.

| Effect | Controls and uses |
| --- | --- |
| Print halftone | Round dots, square dots or lines; size 2–64, angle, monochrome ink/paper or RGB screens, scatter and seed. Coverage follows image tone, unlike uniform hatching inside a traced outline. |
| Palette dithering | Bayer 4×4, Bayer 8×8 or seeded noise; RGB levels, grayscale, two colors or four-tone handheld colors; levels 2–16, cell size 1–24, strength and seed. |
| Glitch slices | Horizontal/vertical slices, count 2–128, probability, displacement 0–128, RGB offset, change rate, phase and seed. |
| Zoom blur | Center X/Y, outward/inward/both directions, distance 0–256, inner/outer radii and sampling quality. Full effect inside the inner radius fades towards the outer radius; if outer is smaller, the transition occurs at the inner radius. |
| Kuwahara painting | Four quadrants or eight elliptical sectors aligned to local edges; radius 1–24, region sharpness, anisotropy and sampling quality. Useful for painterly clouds, noise and gradients. |
| Bevel relief | Alpha contour or height source; width, light angle/elevation, relief strength, light/shadow colors. Changes shading colors without rewriting height. |
| Pencil / XDoG | Extended difference of Gaussians; line scale, scale ratio, edge weight, threshold, softness, ink/paper colors and retained source colors. Extracts internal tone detail. |
| Retro CRT | Barrel curvature, scanline density/strength, RGB phosphor stripes, grain, flicker, edge shading, rate, phase and seed. |
| ASCII art | Embedded density glyphs, blocks or binary 0/1; glyph size 6–64, source/ink colors, inverted tone, paper color and opacity. No system font dependency. |
| Pixel sorting | Horizontal/vertical, luminance/hue/saturation, ascending/descending, lower/upper thresholds, alpha threshold, run length 2–256 cells and cell size 1–24. Actually reorders contiguous runs. |

All new effects have **Mix 0–1**; zero bypasses processing. Mode-specific controls appear as needed and retain hidden values. Numbers, colors, toggles and modes support keyframes, batch editing and pinned node controls. Sizes use a 512px short-edge reference; positions are node coordinates, with Y=0 at the bottom.

Halftone, dithering, painting, bevel and pencil preserve alpha and height; ink/paper colors do not fill transparent backgrounds. ASCII stays within existing content; zero paper opacity makes glyph gaps transparent and also masks height. Glitches, zoom blur, CRT curvature and sorting move or filter color, alpha and height together. Wide bevels, painting and high-quality zoom blur require more sampling. Painting quality changes its fixed sampling density; zoom quality uses 8/16/32 samples.

A zero change rate freezes glitch and CRT motion. Fixed seed and time reproduce frames without relying on playback history, so timeline scrubbing and exported sequences agree. Random changes do not automatically form seamless loops; arrange phase and switches when a loop is required.

Pixel sorting operates on eligible contiguous runs. Transparent and out-of-threshold cells break runs; the maximum span splits longer runs. Thresholds apply to the selected metric: luminance, normalized hue or saturation. Reversed thresholds bypass sorting. Analysis uses the node's fixed 512px short-edge grid and produces a displacement map; final color and height still sample full-resolution content. Larger cells create coarser sorting blocks and reduce work. Analysis is limited to 1,048,576 cells and a side length of 4096 or the device limit. Exceeding this budget asks for larger cells or smaller node extent rather than silently reducing precision. Semi-transparent cells sort by straight color; equal keys retain source order.

Try **Pixelate → Palette dithering** for handheld graphics, **Print halftone → Edge detection** for comic print, or **Glitch slices → Scanlines → Bloom** for holographic interference. Put effects on the outermost group to process a complete composition.

### Noise distortion

Enable **Composite → Post-processing → Noise distortion**. This resamples the current composited result of the effect stack using a displacement field. It supports shapes, imported images and groups. A group composites its children first, then warps their color, alpha and height together. Drag to choose whether distortion runs before or after blur, outlines or bloom. Put the effect on the outermost group to process a complete canvas.

- **Distortion mode**: heat haze uses vertically stretched soft noise; water ripples combine crossing waves with noise for refraction; energy turbulence uses layered noise domain warping. Changing mode preserves shared parameter values.
- **Horizontal/vertical displacement**: 0–64 each, measured at the node's 512px short-edge reference. Zero disables that axis; both zero bypass the effect.
- **Disturbance scale**: 8–256; larger values produce broader disturbances. **Detail octaves**: 1–5, with more detail requiring more processing.
- **Motion direction**: -180° to 180°, with 0° right and 90° up. **Motion speed**: 0–128 reference pixels/second; zero freezes the seeded field. **Seed**: 1–65535. Identical input, settings, seed and time reproduce the result.
- **Mix**: 0–1, interpolating displacement rather than crossfading two images. Zero bypasses the effect exactly.

**Continuous flow** translates the noise field using absolute time, suitable for rising heat haze, without matching endpoints. **Closed trajectory loop** samples the same field on a closed path and exposes a 0.1–60 second duration. Positions and motion directions match at complete periods; the direction control sets the initial trajectory tangent. The hidden duration retains its value. Pausing, jumping in time, reopening and sequence export evaluate the same time directly, independent of playback history.

A closed trajectory guarantees only this effect's field period. Source graphics, image sequences, child animation, other effects and relevant keyframes must also match at that duration. Playback looping or omitting a duplicate export endpoint does not make continuous flow seamless.

Uses the node's **Clip / Allow overflow / Seamless repeat** boundary. Clip and overflow sample transparent border taps rather than stretching the last opaque pixel. Overflow reserves the maximum displacement on each axis. Repeat wraps source sampling and makes the disturbance field periodic at node boundaries; the disturbance scale aligns to whole periods, and the source must still be suitable for tiling. Transparent holes remain part of the sampled input, empty content stays empty, and HDR colors are not clamped in floating-point rendering.

Three **Composition examples → Composition practice** examples compare original content on the left with composited grid, ring and star distortion on the right: Heat haze distortion, Water ripple refraction and Energy turbulence. Heat haze demonstrates continuous motion; the water and energy examples use three-second and 3.6-second closed trajectories over static child graphics, making their endpoints match. Expand the right group to edit its source. Modes, settings, switches, order and keyframes travel with saved nodes/components; batch editing and pinned post-processing controls are supported.

### Hand-drawn style

Open **Examples → Composition exercises → Hand-drawn heart** for a ready-made example with dark double strokes and red cross-hatching. The white background comes from canvas output settings; the effect belongs to the heart node.

Enable **Composite → Post-processing → Hand-drawn style**. Locally bundled Rough.js traces and redraws the current result on a shape or group, in the chosen effect order. Alpha contours are the default. For opaque images, select luminance contours and adjust the contour threshold.

There are 10 modes: original colors, solid, hachure, cross-hatch, outlines only, zigzag, dots, dashed hatching, zigzag-line hatching and sunburst. The first five retain their saved indices, so existing projects and keyframes keep their meanings. Sunburst is a tool extension built with Rough.js strokes; the other drawing fills use native Rough.js algorithms.

- Outlines: roughness 0–10, bowing 0–20, maximum randomness offset 0–20, preserved vertices, stroke width/color/opacity and multiple strokes. Fill strokes independently follow the outline setting, use a single stroke or multiple strokes.
- Hatching and dots: fill color/opacity, angle, gap and weight. Weight becomes dot diameter; dots also have curve steps, fitting and tightness. Dashed hatching has dash length/gap; zigzag-line has zigzag offset. Solid fill has an additional edge-roughness gain.
- Dash patterns: outline and fill each accept space- or comma-separated length lists, such as `8 4 2 4` for a long dash, gap, short dash and gap. Empty means solid. Up to 32 lengths of 0–512 are accepted, with at least one positive length; Canvas repeats odd-length lists to make an even cycle. Each pattern has an independent phase offset and supports discrete keyframes.
- Sunburst: center X/Y, ray count, angle, weight and color. Centers use node coordinates with Y=0 at the bottom; rays clip to the actual outline and preserve holes.
- Paths: contour source/threshold/simplification, path detail retention (0 off, values near 1 retain more detail), and coordinate decimal places (-1 disables rounding). Advanced controls live in More outline settings, More fill settings and Contour and path settings, with remembered expansion. Style-specific controls appear as needed; hidden values are retained. Batch editing shows controls needed by any selected style.

Original colors overlays the strokes on the previous result. Other modes replace its color and use stroke/fill coverage as height. Contour holes stay open; transparent regions do not become paper. Open **Examples → Composition exercises → Hand-drawn style comparison** to compare the original with all eight drawing fills on nine hearts. The original Hand-drawn heart remains available as a red cross-hatching example.

A fixed seed reproduces every style, including dot layout, for the same static input and parameters. Stroke and hatch sizes use a 512-pixel short edge. Contour sampling is bounded; strokes are redrawn at the requested output size. Dense dots and very short dash/zigzag segments have a geometry budget; increase spacing/segment lengths or reduce curve steps if it is exceeded. Higher contour simplification removes details. Excessively fragmented contours report a limit and suggest adjusting simplification or threshold. Clear icons/shapes work best; soft gradients, smoke, tiny fragments and changing contours can produce different or shifting strokes. Canvas redraws use 8-bit color, losing HDR precision; original colors retains the source, while added strokes remain 8-bit overlays.

Settings, colors, seed and effect order travel with saved/copied nodes and components, and use existing keyframes, batch editing and pinned controls.
