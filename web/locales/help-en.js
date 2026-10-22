export default {
workspace:`# Workspace and resources

## Panels and layout
The default workspace has a node tree and graphics list on the left, a canvas in the middle, and an inspector on the right. Selecting a node opens Shape, Color, Transform / arrangement, Animation and Composite tabs.
Drag a panel tab to another panel's edge to split the area, or to its center to combine tabs. Drag separators to resize panels. Use the arrow button or Alt-drag to float a panel inside the browser. Escape cancels a drag. Closing a panel keeps its content; reopen it from Layout.
Layout includes default, animation and focused-canvas presets. The current layout is saved in this browser. You can save up to 12 named layouts. Layouts are separate from projects and undo history.

## Three resource levels
- Graphics library: reusable formulas, images, generators and compositions, including bundled resources, your local resources and subscribed remote libraries.
- Graphics list: your frequently used resource copies, stored in the current browser across canvases. Opening or creating a canvas keeps this list.
- Canvas nodes: editable instances. Editing a node does not automatically update its library resource or other instances.
Use Directly add to canvas on a library card to create an independent instance immediately. Add to graphics list stores a reusable copy; use its + Add button to instantiate it. Clicking a list thumbnail opens a trial-editing session. Back to canvas returns to your work, while Add to canvas inserts the edited result.
Update in graphics list updates that list entry only. Save as a new entry creates another resource. Renaming a list entry changes future instances, while existing instance names remain unchanged.
Use File → Save project for an editable project backup. Library resource exports include their dependencies. Browser storage is not a substitute for backups.

## Selection and color
Click to select, Ctrl/Cmd-click to toggle multiple nodes, or Shift-click for a range. Drag empty canvas space to select a rectangle. Multi-selection edits shared fields; matching shape types also expose their specific parameters. Mixed fields show Multiple values. Only changed fields are applied. When a parent and its descendant are selected, only the outermost selected node is edited.
The color shortcut at the top of the inspector starts collapsed. Expand it to edit opacity and quick colors; Color contains full fill, gradient and color-stop settings. Inherited colors show their source. Independent child colors and group-wide remapping have different effects.
Opacity belongs to Color and affects the entire node. Parent and child opacities multiply. Animated fields are locked in normal mode; use Record to add keys or Base values to edit their underlying values.

## Canvas tools
Drag to move; double-click a group to enter it. Hold Shift to constrain movement or snap rotation to 15 degrees. Alt-click cycles overlapping nodes; right-click lists candidates. Space temporarily pans. Ctrl/Cmd+D duplicates, Ctrl/Cmd+G groups siblings, Delete removes, and Ctrl/Cmd+Z undoes.
Zoom, background, guides, pivots, solo preview and 2×2 / 3×3 / 4×4 tile inspection are viewing tools. They do not set export dimensions or make a texture seamless. The gold frame marks the final output boundary.

## Language
Language lets you choose Simplified Chinese or English from a fixed list. Language codes and fallback order are set when the website is built. Parameters use the selected language first, then the configured fallback order, then the stable variable name. The alias editor also uses fixed language choices; imported aliases for inactive languages are preserved. Graphics store multilingual names in their own aliases. Expand Multilingual names beside the default name in a graphic editor or save dialog to edit them. Search matches every alias and the default name, including in remote libraries. Names travel with authoring JSON and resource ZIPs. New canvas nodes start with the current display name; existing node names, project names and resource content remain unchanged when the interface language changes.`,
layout:`# Arrangement and compositing

## Arrange a shape or group
Select a node and open Transform / arrangement. Shape controls define one source shape; arrangement repeats it. A group can repeat its whole subtree or choose direct children for each instance.
Grid uses rows and columns; radial layouts use count, radius and orientation. Scatter uses a stable seed, target count and density. Path arrangements place copies along a Bézier curve. Advanced layouts include border lights, contour sampling, herringbone, weaving, gradients, flow fields and rule-based connector tiles.
Instance size changes each copy. Layout area changes where copies are placed. Instance aspect, node region fit and an image's fit are separate settings. Keep design aspect to retain the source proportions on wide or tall canvases.
Random child selection may repeat children. Sequential selection cycles the direct children in tree order. Seeds give repeatable results during playback and export. Expanding an arrangement into separate nodes freezes the current placement so each copy can be edited independently.

## Scatter spacing
Enable overlap avoidance when scattered copies should stay apart. Start with small sizes and zero extra gap, then increase spacing gradually. The actual count can be lower than the target when there is insufficient space. Hollow rings still reserve their outer area.

## Boundaries and seamless textures
Clip to region trims content at the node's region. Allow overflow keeps protruding parts visible outside that region, while the final canvas boundary still crops the output. Seamless repeat wraps copies across the region edges. These boundary modes are alternative choices for a node.
A puzzle tile's main body fills its cell; tabs protrude outside it. Matching tabs and sockets align when cell dimensions and spacing match. Corner radii and connector shapes affect the source tile; arrange it with the existing grid or rule-based tiling.
Use Tile preview to inspect repeated edges. It does not fix seams automatically and does not export a multi-tile image. Common edge blending can soften seams but may alter edge details.

## Blend and masks
Composite controls include blend, contour, inversion and post effects. Blending follows node order. A mask affects earlier content in the same group. An inverted mask cuts holes; verify transparency on the checkerboard. Child masks do not globally mask unrelated groups.
Use a filled circle for a circular mask. A visible ring is only an outline unless you deliberately configure it as a mask; it does not automatically clip everything inside it.

## Align and distribute
Multi-select independent visible nodes, then use alignment relative to the selection bounds or canvas. Spacing distribution needs at least three nodes and keeps the outer positions fixed. Alignment uses transformed node regions, not the nontransparent pixel silhouette. Hidden or multiply instanced nodes may need their outer group selected instead.`,
animation:`# Animation and export

## Record keyframes
Finish the static shape first. Select a node, enable Record, seek to a normalized progress value between 0 and 1, then change a parameter. Repeat at other times, turn Record off, and play to inspect the result. Continuous slider movement creates one undoable edit.
Normal mode shows evaluated animation values. Base values temporarily bypass the selected node's parameter tracks for editing; saving and exporting still retain the animation. A keyed field is locked in normal mode to avoid accidentally overwriting its base.

## Timeline and curves
Open Animation editor and timeline below the canvas, or restore Timeline from Layout. Enter a node to edit its local time. Parent intervals, loops and curves can map one local key to several displayed positions; mapped keys may be read-only until you enter that local scope.
Click the ruler to seek. Shift selects multiple keys; drag blank lanes to select a rectangle. Copy and paste keys, delete them, or edit their time and value. Numeric tracks support linear, smooth, hold and cubic interpolation. Colors and switch/option tracks have their own value controls. Discrete options change in steps.
Blue playback intervals can be moved or resized. Hatched intervals are read-only projections; enter their parent to change timing. All saved times use normalized 0–1 values. Duration determines how many seconds that scope takes to play.

## Three different kinds of repetition
Spatial seamless repetition wraps pixels or instances across a texture edge. Keyframe looping repeats time. Built-in motion uses a shader or generator clock. Turning on a loop alone does not guarantee that an effect's first and last frames match.
Built-in motion controls can follow playback, change speed and offset, or hold an explicit time. Check moving generators over the entire export interval before assuming they loop seamlessly.

## Export
Use Export to select content, format, resolution and transparency. Preview mode and preview channel do not automatically select export content. Explicitly choose Color, Height, Normal or custom RGBA as needed.
PNG is a rendered image. Project files keep editable nodes and dependencies. SVG and vector PSD trace monochrome contours and simplify gradients and soft edges; they do not preserve every rendered effect as vector geometry. Layered PSD retains supported node layers and may rasterize parts.
Sequence exports use duration, FPS, frames and atlas columns. Check the displayed dimensions and memory limits. Atlas size equals frame size multiplied by its row/column layout; reducing frame size or count can make an oversized atlas fit.
The transparent-background setting belongs to export. The checkerboard, guides, zoom and material/effect backgrounds are preview aids and are not baked into the output. You can cancel a long export; retain the project if browser graphics limits prevent completion.`,
image:`# Resource creation and image processing

## Create or import a resource
Open Graphics library → Create resource. The Image, Import file, Formula and Generator tabs share resource name, category and description. A successful preview does not save automatically; import/save the resource, then add it to the canvas or graphics list.
Formal exported ZIP packs contain a manifest and dependencies. AI Skill ZIPs are instruction packages, not graphics resources. Authoring JSON is parsed and validated before preview. Imported scripts must use the documented formula/generator interface.
Formula parameters use unique code-style variables and optional language aliases. Aliases change display names; formulas and animation bind to stable variables/slots. Missing aliases fall back in the configured language order, then to the variable name.

## Images
Upload PNG, JPEG or WebP, or a supported static SVG. SVG source keeps its paths; bitmap-only processing is unavailable for SVG. Scripts, external links, text and unsupported SVG features must be removed or converted to paths first.
You can paste actual clipboard image data with Ctrl/Cmd+V in the image editor. Plain text stays text; a URL or an HTML image reference is not downloaded as an image.
Bitmap processing includes removing a selected background color, keeping a selected color, black-background-to-alpha, centering, contour reconstruction, recoloring, scale and rotation. Tolerance changes the matching range; transition softens boundaries. Edge-connected removal can protect enclosed areas of the same color. Compare the original and result over both black and white backgrounds.
Converting to SVG extracts a monochrome silhouette and holes. It simplifies gradients, fine details and semitransparent edges. Large detailed pictures are often better kept as bitmaps. A failed preview keeps the previous successful image; read its status before saving.
Saving a processed bitmap bakes the result to a transparent PNG at the source resolution. Later edits start from that result rather than an editable history of every processing step. SVG retains its vector source. Node color, transforms, arrangement and animation remain editable.

## Generate height and normals from an image
1. Add the image to the canvas and keep Original color and alpha as its image display mode.
2. Choose Height at the top of the canvas to inspect grayscale, or Normal to generate the blue-purple normal map.
3. Adjust strength, Sobel/Scharr sampling, X/Y flips, height inversion and smoothing in the normal settings. Strength zero gives a flat normal.
4. Choose 3D material to inspect lighting, rotate the model or adjust the light. Color mode displays the pattern as surface color; Normal shows simulated bumps under lighting.
5. Select Normal separately in the export panel to export that map.
Image brightness multiplied by alpha is treated as height. Bright areas are high and dark areas low. Shadows in a photograph are interpreted as height too; this does not reconstruct the object's true 3D geometry.`,
recipes:`# Recipes and troubleshooting

## Scatter several designs
Put the desired designs under one group. Select Scatter, choose random child content, and start with a small instance size. Enable overlap avoidance, initially with zero extra gap. Increase spacing only after checking the actual count. Change the seed for a different repeatable placement. For a repeating texture, choose seamless boundaries and inspect the edges.
For a fixed A–B–C sequence, choose sequential child content and order the direct children accordingly. In scatter layouts the sequence follows generated-point order, not screen-left-to-right order.

## A breathing halo
Start with a ring, set an independent solid color, and key opacity to 0.35 at progress 0, 1 at 0.5, and 0.35 at 1. Use smooth interpolation. Turn Record off and play. A duplicate with lower opacity and more feathering can provide a softer outer glow. Matching endpoint opacity is not enough to guarantee other animated properties loop.

## Circular marks
Arrange one small shape radially. Start with 12 copies, radius 0.35 and instance size 0.12, then compare fixed, outward and tangent orientation. Multiple rings can use different radii and offsets. Animate the parent group's rotation when the entire design should rotate together.

## Transparent cutout
Place the base artwork first and a filled circle after it inside one group. Set the circle's blend to inverted mask. Inspect the checkerboard to confirm the hole is transparent. If everything disappears, check mask size, order and group scope.

## A path of beads or a trail
Arrange a dot or small shape along a path. Edit the Bézier control points, choose an evenly spaced count and reduce size to avoid overlap. End-size scaling makes the last instances smaller; it does not itself change opacity. Use separate opacity animation or node structure for fading.

## UI backgrounds
Try diamond grids, staggered tiles, stripes, dots, weaving or herringbone. Keep a restrained palette and use Tile preview to check all edges and corners. Export one tile. Enable export transparency when the pattern should be layered over a background in your project.

## Debug in this order
1. Confirm the selected node, current editing scope and whether solo preview is enabled.
2. Check visibility, opacity, color source, mask order and parent clipping.
3. Check whether the field is animated, recording, or currently inactive because another setting disables it.
4. Check source size, instance size, layout region, fit and boundary mode separately.
5. Compare 2D color/height/normal with the appropriate 3D or effect preview. Those viewing controls do not set export settings.
6. Read the error/status message before saving. If a preview or export exceeds graphics limits, reduce size/count/complexity and keep an editable project backup.
Recipes are starting points; inspect the rendered result and tune them for your own canvas.`
};
