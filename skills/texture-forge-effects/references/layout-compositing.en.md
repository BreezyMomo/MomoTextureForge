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

Shape contains Opacity (0–1, multiplied through parents, with keys) and Node colors. Color source is a dropdown for inherited/custom palettes; groups can preserve child colors or remap together. Visit the inheritance source or copy its evaluated palette independently. Levels, Invert and Channel curves are in Shape. Composite contains blends, masks, contours and image filters.

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
- Curves run after basic brightness/levels and before contours/image filters. Color order is luminance, master RGB, then individual RGB channels; Alpha follows. Unmodified channels preserve their original values, avoiding HDR clipping when adjusting only Alpha.
- Curve shapes currently support neither keyframes nor batch edits. For multiple selected nodes, edit the primary node. These curves remap pixel values, unlike parameter curves in the animation timeline.

For softer smoke or mask coverage, adjust Alpha. To change brightness while keeping transparency, use RGB. Mapping Alpha input 0 to a nonzero output also covers previously transparent areas inside the node region.
