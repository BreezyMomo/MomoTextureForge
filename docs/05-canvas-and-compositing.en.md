# 05 · Canvas, arrangement and compositing

<!-- doc-language -->
[简体中文](05-canvas-and-compositing.md) · [English](05-canvas-and-compositing.en.md)
<!-- /doc-language -->

[Manual contents](README.en.md) · Previous: [Formulas and generators](04-formulas-and-generators.en.md) · Next: [Animation](06-animation.en.md)

Open the [summoning-circle example](examples/summoning-circle.json) and select the radial-stars node to reproduce the arrangement interface in this chapter.

## 1. Select nodes, group and enter children

- Click a node or canvas graphic to select it. Ctrl/Cmd-click toggles multiple selections; Shift selects a range; drag empty canvas space for box selection.
- **+ Group** creates a container. Ctrl/Cmd+G groups siblings. Groups let you move, rotate and repeat coordinated decorations together.
- Double-click a group to enter it; use the path above the preview to return.
- Drop a tree node in the center to reparent it, or near an upper/lower edge to reorder it. Later nodes composite over earlier content.
- Alt-click cycles overlapping candidates; Esc cancels the current drag.

### Batch editing, alignment and even distribution

![Multi-selection parameters and alignment](images/en/selection-editing.png)

> Callouts: 1 Ctrl/Cmd-select nodes; 2 Existing tabs remain available; 3 Change mixed values together; 4 Alignment and distribution.

1. Ctrl/Cmd-select nodes or box-select on empty canvas. The inspector switches to **Batch editing**.
2. Use the same **Shape / Color / Transform / Layout / Animation / Composite** tabs. Different values show **Multiple values**; mixed checkboxes show a dash. Only adjusted fields are overwritten. Choose **Edit primary selection** for individual edits, then return to batch mode.
3. Under **Transform / Layout → Alignment & distribution**, choose Selection bounds or Canvas and align left/right/top/bottom or center horizontally/vertically.
4. With at least three nodes, distribute horizontally or vertically with equal edge-to-edge gaps. The outer nodes stay fixed. Insufficient space permits overlap.

Alignment uses rotated node-region bounds, not tightly cropped opaque pixels. Visible single-instance nodes under different parents can be aligned. Hidden nodes or nodes replicated by parent arrangements cannot be directly aligned; select the containing group instead.

Batch changes affect only outermost selected nodes, avoiding double edits when parents and children are both selected. Aspect-locked nodes update the other dimension. Out-of-range results cancel the whole operation. Each operation, including a continuous slider gesture, supports a single undo and autosaves.

| Tab | Batch-editable settings |
| --- | --- |
| Shape | Shape-specific radius/width when all nodes share a shape; UV/polar for shapes; built-in motion when all support it |
| Color | Opacity, coloring mode, solid/gradient, endpoints, palettes and multicolor stops |
| Transform / Layout | Position, dimensions, pivot, mirror, fit, boundary handling, arrangement and its random/gradient/flow settings, tile interfaces, alignment and distribution |
| Animation | Parent interval, loops/ping-pong, outside visibility, source progress, fixed progress and parameter-animation switch |
| Composite | Blending, contour, levels/invert, image filters and compatible masks |

Mixed shapes do not expose the primary shape's exclusive parameters. Shared tabs remain usable. UV does not affect groups, so mixed group selections explain this limitation. Rule tiling, contour arrangements and group-only coloring require all selected items to be groups. Unify differing arrangement/density types before editing dependent fields. Each group keeps its own children; candidates and contour sources are not generated automatically.

Color edits preserve unmodified modes and stops. For common colors, select **Custom coloring**, then solid or gradient. Applying a palette replaces stops together. Equal stop counts allow per-stop batch edits; otherwise apply a palette or restore individual two-color endpoints first. Independent child colors and parent-wide recoloring retain their existing behavior.

In ordinary editing, a field controlled by any selected animation cannot be batch-edited directly. **Record** writes keys at each node's current local progress; **Base values** retains its tracks. Edit individual keys, curves and time-remapping curves through **Edit primary selection**. Multicolor stops do not record keys.

![Batch color and opacity](images/en/selection-colors.png)

> Callouts: 1 Color tab; 2 Batch opacity; 3 Custom or inherited coloring; 4 Change only fill color.

![Batch radius and line width for matching shapes](images/en/selection-shape.png)

> Callouts: 1 Select matching shapes; 2 Shape tab; 3 Mixed radii; 4 Batch ring width.

## 2. Node region and graphic size

![Node-region dimensions](images/en/transform-region.png)

> Callouts: 1 Transform / Layout tab; 2 Node region.

These are distinct levels:

1. **Node region:** position, dimensions, rotation and pivot within the parent region.
2. **Shape parameters:** radius, line width and feathering of the pattern inside that region.
3. **Instance size:** the size of each repeated item in an arrangement.

Spatial values use normalized coordinates; rotations use degrees. If a wide canvas distorts a shape, inspect image fit, region fit and instance aspect ratio at the relevant level.

Canvas tools support moving, rotating and pivot editing. Shift locks movement axes or snaps rotation to 15°. Alt temporarily disables snapping. Hold Space to pan the view.

## 3. Choose an arrangement

![Radial stars and instance settings](images/en/arrangement.png)

> Callouts: 1 Choose an arrangement; 2 Set star count; 3 Set each instance's size.

| Arrangement | Main settings |
| --- | --- |
| Grid | Rows/columns, rectangular/diagonal/hex grid and instance size |
| Random scatter | Target count, radius, seed and spacing; actual count may be lower |
| Radial | Count, rings, layout radius, inner-radius ratio and orientation |
| Spiral | Golden-angle or regular spiral, divergence/turns and center opening |
| Along path | Bézier controls, count or spacing, orientation and end scale |
| Symmetry | Copies, angle offset and rotation/mirroring |
| Border | Rectangle/rounded rectangle dimensions, corner radius, path offset, count or spacing |
| Along graphic contour | First group child supplies alpha contour; later children decorate it |
| Herringbone / weave | Herringbone or basket pattern and repeat-block rows/columns |
| Rule tiling | Candidate child tiles with declared edge interfaces |

A shape repeats itself; an arranged group repeats the entire group by default.

### New arrangements and examples

Grid, diagonal grid, hex packing and rule tiling support up to 16×16 cells. Herringbone/weave supports 8×8 repeat blocks, up to 512 bricks. Ordinary radial/scatter layouts allow 128 instances; advanced layouts, borders and contours allow 512. Multiple rings and paired mirrored layouts share a total-instance budget. Ring count reaches 32; spiral turns and wave-field repetitions reach 24; seeds range from 1 to 99,999. Layout radius/path scale reaches 2, and inner/outer or start/end scale multipliers reach 4. Defaults remain unchanged.

Dense layouts cost more rendering time. Spacing/density constraints can reduce actual count, and rule tiling retains a search budget. Instances are not separate nodes; **Expand to independent nodes** still observes the 256-node canvas limit.

Open **Examples → Category → New arrangements**, select an outer node and inspect **Transform / Layout**. Puzzle boards also allow per-piece edits.

![New-arrangement examples and category](images/en/arrangement-examples.png)

> Callouts: 1 Filter new arrangements; 2 Open an example.

| Example | Main controls |
| --- | --- |
| Seamless halo continuation | Child overflow, parent repeat, contour/blur/Bloom and tile inspection |
| Content-boundary comparison | Left/right group boundary handling: clip versus overflow |
| Cross-cell light dots | Outer overflow and inner star Bloom; independent cell spacing and rows/columns |
| Puzzle connectors and corners | Per-piece connector style/roundness and body corners |
| Single-piece puzzle grid | Edge tabs/sockets, connector size and grid dimensions using body spacing |
| Colored puzzle board | Flat outside edges, inner connectors and independent colors |
| Rounded border lights | Border dimensions/radius, count/spacing, offset and tangent/normal orientation |
| Star-contour dots | Replace first child with a shape/group/transparent image; later children decorate it; optional source visibility |
| Herringbone background | Repeat-block dimensions and inner brick pattern/gap |
| Basket-weave background | Basket mode, 4×4-cell repeat blocks and up to 512 bricks |
| Fading decorative dots | Gradient direction and start/end scale, opacity and rotation |
| Wave flow-field lines | Wave/vortex, amplitude, phase, orientation-following and wave count |
| Connected pipes | Right/top/left/bottom interfaces for direct children, then grid dimensions and seed |

Contour layouts read the **final alpha of the first child**, including transforms and compositing. Points follow closed outlines and holes. Alpha threshold selects the contour; normal offset moves decorations to either side. Sampling is fixed at 256×256, so very fine detail may disappear; export resolution does not rearrange instances. Opaque photos produce rectangular outlines. Remove the background or use a luminance mask to follow their subject. The source appears once; remaining children repeat together, randomly or in order.

Herringbone/weave stretches content into brick regions. For continuous edges, enable **Boundary handling → Seamless repeat** on the group and inspect **Tile preview**. Canvas aspect changes brick proportions; recheck after rotating the group.

Gradients and flow fields modify existing arrangements. Gradients affect scale, opacity and rotation horizontally, vertically, radially or by instance index and can reverse direction. Flow fields affect position/orientation. **Flow phase supports keys**; the example loops from 0 to 360°. Scatter overlap avoidance temporarily bypasses gradients/flow to protect spacing, while retaining their settings. Positional gradients can create rhythm discontinuities at tile seams.

Rule tiling chooses tiles from declared interfaces, not image analysis. Draw connectors at edge midpoints. Without repeat, outside edges close; with repeat, opposite edges also match. The example includes all 16 interface combinations. Replace/remove candidates or disable a child to exclude it. Missing endpoints/corners/blank tiles can make the layout unsatisfiable; reduce dimensions or change seed if search is exhausted. Rule tiles stretch to cells and do not apply gradient/flow variation.

### Mix different graphics inside a group

1. Make each candidate a direct child of one group.
2. Arrange the group and choose **Instance content:** entire group, one random child, or sequential cycling/modulo.
3. Change the scatter seed for random selection or reorder candidates for cycling.
4. Use **Expand to independent nodes** for individual manual adjustments; it increases node count and supports undo.

Random selection permits repeats and does not guarantee equal frequency. A child group is one candidate; descendants are not sampled independently. Disabling arrangement shows the whole group again.

### Overlap avoidance and aspect ratio

Random scatter supports **Avoid overlap** plus extra gap. It uses conservative enclosing circles, so long or concave shapes do not necessarily pack tightly. Large instances or gaps reduce actual count.

**Instance fit → Keep design aspect** protects pattern proportions. Fill grid/fill region/distribution fit controls placement coverage, independently of the whole node's region fit.

### Single puzzle pieces and overflow tabs

![Configurable puzzle connectors](images/en/puzzle-piece.png)

> Callouts: 1 Four connector styles; 2 Connector curvature; 3 Independent settings for four edges.

**Puzzle piece** is one body. **Connector style** offers round tabs, square clips, trapezoid dovetails and waves. Roundness controls the connector curve/corners. Top/right/bottom/left independently choose flat, tab or socket. Size, neck, line width, feathering and outline/solid mode remain shared. Built-in presets cover styles, corner/edge pieces and rounded bodies.

![Connector style and independent body corners](images/en/puzzle-corners.png)

> Callouts: 1 Top-left: zero is square; 2 Top-right radius; 3 Bottom-right radius; 4 Bottom-left radius.

Expand body corners and set each to 0–0.4. Zero is a square corner; larger values round it. Sliders, numbers, undo and keyframes are supported. Rounded inner corners leave gaps, so keep touching interior corners at zero for a tight puzzle. Connector roundness and body-corner rounding are independent.

The connector/corner example places four styles side by side, each with a square top-left corner and three differing radii.

![Repeat puzzle pieces using a grid](images/en/puzzle-grid.png)

> Callouts: 1 Existing grid arrangement; 2 Columns; 3 Rows.

The body fills the blue node region, while tabs may extend outside it. Grid spacing follows the body: larger tabs do not shrink the body or push neighboring cells apart. Neighbors need complementary tab/socket edges with matching style, size, neck, roundness and orientation. Rectangular cells require stretch-to-region instance fit. Use flat edges along the outside border.

**Single-piece puzzle grid** repeats one graphic 16 times; **Colored puzzle board** uses nine independently colored pieces and flat outside edges. Puzzle pieces default to overflow; ordinary nodes default to clipping. Both use the general boundary setting below.

### Boundary handling: clip, overflow and repeat

![Boundary handling and logical region](images/en/content-overflow.png)

> Callouts: 1 Select the overflow group; 2 Switch boundary mode; 3 Blue frame remains the logical region.

1. Open the content-boundary comparison example and select the right-hand overflow group.
2. Under **Transform / Layout → Node region → Boundary handling**, choose **Clip to region**, **Allow overflow**, or **Seamless repeat**, which wraps outside content to the opposite side.
3. The blue frame still defines position, pivot, alignment and arrangement spacing. Extended stars, outside children, outlines, blur and Bloom can remain visible.
4. To pass through several ancestors, allow overflow on each relevant parent. Any clipping ancestor truncates content at its own region. The gold canvas remains the final export boundary.
5. In the seamless-halo example, the child allows overflow and the outer group repeats. Its upper-right star/glow continues on the opposite edges and corner. Inspect with Tile preview. Each node stores one independent boundary mode.
6. The cross-cell example uses a 3×3 grid. Outer overflow lets neighboring cells overlap; clipping cuts the rightmost star. Each graphic's own boundary setting still applies.

![Child overflow, parent repeat and glow continuity](images/en/seamless-overflow.png)

> Callouts: 1 Outer group uses seamless repeat; 2 Check edges and corners; 3 Choose 2×2, 3×3 or 4×4; 4 Child independently allows overflow.

Ordinary shapes/groups default to clip, puzzle pieces to overflow. Batch edits, undo/redo, persistence and discrete keys are supported. Visible overflow pixels can be clicked; blue bounds and handles retain their logical size. Box selection and alignment still use logical bounds.

Images, vectors and generators retain their own resource content bounds; overflow does not invent pixels beyond them. A whole child image can extend beyond its parent, and filters can expand. Masks retain their positions, bounds and inversion behavior. Seamless repeat uses the logical region as one period; allowing overflow does not enlarge that period.

## 4. Coloring, blending, masks and postprocessing

### Color controls

![Collapsed quick color controls](images/en/color-collapsed.png)

> Callouts: 1 Expand color and opacity.

The inspector's persistent quick-color row starts collapsed, showing color and opacity summaries. Expand with its arrow. The open state persists while switching nodes/tabs during the session and resets on reload. Its gradient strip or **Color settings →** opens the **Color** tab; solid swatches can be edited directly.

**Opacity** also appears at the top of Color as 0–1. Expanded quick controls use synchronized 0–100% controls. It works with solid, gradient, inherited and preserved colors and applies to the entire node/group; parent and child opacity multiply. Reset, keys, undo/redo and project saving are supported.

![Quick colors and inheritance source](images/en/color-inheritance.png)

> Callouts: 1 Persistent quick controls; 2 Make independent or visit source.

- **Inherited from [group]** identifies the source. Visit it to edit all nodes inheriting that palette.
- **Make independent** copies the visible palette locally, leaving the parent and others unchanged.
- A group preserving child colors can offer **Set colors for children**; already independent children remain unchanged.
- Images/generators preserving original colors say so explicitly. Custom coloring remaps their luminance.
- Parent-wide group recoloring identifies the final influencing group and lets you visit it.

![Gradient endpoints and presets](images/en/color-gradient.png)

> Callouts: 1 Color tab; 2 Gradient endpoint values; 3 Palette presets.

**Color → Fill mode** offers solid or value gradient. Use native color pickers or HEX such as `#80DFFF` or `F80`. Presets display color bands. Added stops show color and position directly, up to eight. Multicolor stops do not support keys; restore a two-color gradient to animate its low/high colors.

![Solid fill and HEX](images/en/color-solid.png)

> Callouts: 1 Edit color across tabs; 2 Solid or gradient; 3 Hexadecimal input.

A value gradient maps low/high pattern values, not left/right canvas position. Use a spatial-gradient graphic when position-based color is required.

### Compositing and filters

![Outer-ring compositing and postprocessing](images/en/compositing.png)

> Callouts: 1 Bloom strength; 2 Bloom radius.

1. Select a node and open **Composite** for blending, contour and filters. Opacity, palettes and gradients are in **Color**.
2. Set a parent palette and inherit it for coordinated colors, or use independent node palettes.
3. A mask affects only previously composited content in the same group. Reorder nodes to verify its scope.
4. Expand postprocessing for brightness, levels, invert, blur, Bloom, sharpening, chromatic aberration and toon levels.

Filters support keys. Groups composite children before filtering. Radii such as blur are normalized to a 512-pixel canvas and scale with export resolution. Bloom enhances bright regions; it does not change the underlying shape radius.

## 5. UV and viewing aids

**Shape → Internal UV** changes sampling rather than node bounds. Scale, rotation, offset, scrolling, swirl and polar coordinates modify the texture. Reset UV first when investigating distortion.

Zoom, checkerboard, node bounds, pivots, solo preview and tile inspection are viewing aids. **Tile count** chooses **2×2, 3×3 or 4×4** and enables Tile preview. Toggling it preserves the chosen count. These settings do not change the canvas, project or export dimensions. Tile inspection reveals seams but does not remove them; inspect even after enabling Seamless repeat.

Shortcuts: Ctrl/Cmd+D duplicates, Delete removes, Ctrl+Z undoes and Ctrl+Shift+Z redoes. Export always uses the full canvas bounds.

## 6. Inspect effect blending on backgrounds

![Fire alpha/additive comparison on light and dark backgrounds](images/en/effect-preview.png)

> Callouts: 1 Effect preview; 2 Background choice; 3 Compare alpha/additive; 4 Play or scrub.

1. Choose **Preview mode → Effect preview**, normally using the Color channel.
2. Select dark, light, side-by-side comparison or a custom background. Comparison displays two rows for dark/transparent-edge inspection.
3. View alpha, additive or both. Alpha retains occlusion; additive adds texture color multiplied by alpha to the background.
4. Existing playback, restart, scrubber and timeline controls update every tile with the same frame. Parameter edits update them together.
5. Display size changes coverage. Preview brightness simulates a 0–3 color multiplier. Reset restores the default dark side-by-side comparison.

Background, size, blend and preview brightness affect viewing only. They are not written to the project, node blend/opacity, export background, PNG or frame sequence. Change the actual texture in the inspector/export settings. Confirm engine-specific HDR, color-space and material behavior in the target project.

Canvas transform and UV dragging pause in effect preview; inspector edits remain available. Return to **2D canvas** for dragging, or use **3D material** for surface-lighting inspection.

## Channel curves

Select a graphic or group and open **Color → Channel curves**. Nodes inheriting a palette can use curves too. Groups composite their children before applying curves.

- Choose **Luminance / height, Master RGB, Red R, Green G, Blue B, or Alpha**. Luminance adjusts brightness and height; RGB changes color only. Alpha changes coverage and scales the height contribution accordingly.
- Click the graph to add a point, drag or use arrow keys to move it, or enter input/output values from 0–255. Endpoint inputs stay at 0 and 255; their outputs remain editable. Internal points can be deleted. Up to 16 points use smooth cubic interpolation through the controls, with continuous tangents and no overshoot. The graph, preview and exports share the same shape. Two-point curves remain straight.
- Editing points or applying a preset enables curves. Disable temporarily, reset one channel, or reset all curves. Undo/redo, project/resource saves and exports preserve them.
- Curves run after basic brightness/levels and before contours/image filters. Color order is luminance, master RGB, then individual RGB channels; Alpha follows. Unmodified channels preserve their original values, avoiding HDR clipping when adjusting only Alpha.
- Curve shapes currently support neither keyframes nor batch edits. For multiple selected nodes, edit the primary node. These curves remap pixel values, unlike parameter curves in the animation timeline.

For softer smoke or mask coverage, adjust Alpha. To change brightness while keeping transparency, use RGB. Mapping Alpha input 0 to a nonzero output also covers previously transparent areas inside the node region.
