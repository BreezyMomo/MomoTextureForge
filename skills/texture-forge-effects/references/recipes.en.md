# Recipes and troubleshooting

<!-- doc-language -->
[简体中文](recipes.md) · [English](recipes.en.md)
<!-- /doc-language -->

These are suggested starting points, not renders verified against the user's canvas. Check current resources/controls and adjust from observations; do not claim exact reproduction.

## Mixed flower scatter without crowding

1. Put desired flowers as direct children of one group. Child groups can be candidates. First set each silhouette, color and relative size.
2. Arrange the parent with Random scatter, Entire region, One random child. Try target 50 and size 0.12, then inspect; this does not guarantee 50 fit.
3. Fill region sets radius 0.5 and center zero, retaining size/count/seed. Use radius to tighten/loosen distribution and seed to change candidate choices.
4. Enable Avoid overlap with extra gap/minimum center distance initially zero. Check actual count, then add spacing. Hollow rings still use enclosing circles and cannot pack flowers inside their holes. Reduce instance size when count is low.
5. Keep design aspect on wide/tall canvases. Enable parent repeat and Tile preview for seams; avoidance includes across-edge neighbors.
6. Save a project. Expand the parent into nodes for individual flower movement; this fixes current layout/selection and supports undo.

## Fixed order and wide/tall canvases

For A,B,C,A,B,C, select Sequential/modulo on the parent and order direct candidates A,B,C. Grids show this clearly. Scatter uses generation order, not left-to-right screen coordinates. Seeds move points while candidate choice for a point index remains fixed; adding/removing/disabling/reordering candidates changes it.

Change canvas aspect while retaining instance design aspect. The region expands but each design keeps its proportions. Do not shrink the whole group to a square to fix one flower. Explicit stretch is for intended distortion. Aspect can rearrange scatter; changing export pixel size does not.

## Breathing halo

1. Add a suitable ring graphic. For compatible controls, radius 0.62 and inner diameter 0.5 form a ring, with zero feather for crisp edges.
2. Use Custom coloring and Solid fill in Color, or quick-color controls.
3. Set alpha 0.35 at progress 0, record 1 at 0.5 and 0.35 at 1, with smooth interpolation. Stop recording and play.
4. Duplicate for softer outside light with reduced alpha/extra feather, keeping the hole open. Choose additive only for the intended brightness.
5. Export 3 seconds at 24 FPS. These alpha endpoints match; added time-based motion still needs checking.

## Circular markers and multiple rings

1. Start with a small marker shape, then choose Radial arrangement.
2. Try one ring, 12 instances, radius 0.35, size 0.12. Count controls density, size controls markers and radius controls the ring.
3. Compare fixed/radial/tangent orientation. Add rings, inner-radius ratio and staggering while keeping children legible.
4. Group layers and key the parent rotation for whole-ring motion, not just individual markers.

## Transparent cutouts

1. Put base content first and a circular cutting node after it in one group.
2. Set the circle to Inverse mask in Composite; it affects earlier siblings only.
3. Verify a genuinely transparent checkerboard hole. If everything disappears, check mask size/order/scope.

## Beads or trails along a curve

Use a dot/small shape with Path arrangement. Edit Bézier controls, begin with equal-count placement and reduce instance size to avoid overlap. An end multiplier below one tapers size; tangent orientation suits elongated items. Size taper is not opacity fade; design content/animation/layers separately for fading.

## Tileable textures

Enable Seamless repeat and Tile preview. Start with Automatic, then try generic edge blending where appropriate. Inspect all edges/corners, especially after rotation or parent clipping. Export one texture, not the tiled inspection grid. Seamless spatial output does not establish temporal continuity.

## Troubleshooting order

| Symptom | Check first |
| --- | --- |
| Missing graphic | Search/load the library; the shape dropdown is not the whole catalog. Use current names/catalog |
| Parameter does nothing | Correct node/scope, trial versus default, actual formula usage, or old retained error preview |
| Animation value jumps back | Ordinary mode is track-controlled; Record edits keys and Base values edits underlying state |
| Motion without keys | Built-in time or UV scrolling |
| Still moving after disabling one clock | Built-in autoplay, keys, parent animation and UV |
| Clipped silhouette | Node/parent bounds, image scale, UV and final canvas; reset UV/reduce size to isolate |
| Wrong colors | Image mode, inherited/parent coloring, blend and postprocessing |
| All flowers at each point | Parent selected, arrangement enabled, instance content changed from whole group, direct-child candidates |
| Modulo looks random | Generation order differs from screen order; try grid and check candidate enabled/tree order |
| Avoidance generates few/no items | Actual versus target, size, gap, center distance, density/radius and conservative circles |
| More count still stays centered | Fill region, radius/offset, parent region/fit/density; count does not enlarge the sample area |
| Squashed rings in a banner | Image fit, instance design aspect, node/ancestor region fit and ellipse parameters |
| Editing one changes all | Shared arrangement content; save and expand first |
| Interior white remains | Edge-connected removal; disabling may also remove same-color subject regions |
| Keep only red artwork | Extract specified color and adjust tolerance/transition, not just background color |
| Missing ZIP manifest | Extract ordinary JSON collections; Skill ZIP is not a resource; use official export, not empty manifests |
| Jagged SVG | Source resolution, threshold, denoise/smoothing; oversampling cannot restore missing detail |
| Huge/slow SVG | Reduce detail/sampling/nodes/instances or keep an adequate bitmap |
| Export differs | Full canvas, actual channel/time, view-only guides/solo/zoom ignored; try a small single-frame export |
| Loop jumps | Endpoint omission does not close time/UV/keys; compare endpoints and revise motion |
