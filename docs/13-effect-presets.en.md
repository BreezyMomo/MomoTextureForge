# Ability, ring and curtain presets

<!-- doc-language -->
[简体中文](13-effect-presets.md) · [English](13-effect-presets.en.md)
<!-- /doc-language -->

[Manual index](README.en.md) · [Animation and timeline](06-animation.en.md) · [Export](08-export.en.md)

Open **Examples**, filter by category and choose **Edit on canvas**. Each card opens an independent project made of ordinary graphics, groups, masks and keyframes. One-shot abilities default to 512×512 and loop examples to 256×256, all at 30 FPS with transparency and eight atlas columns. Complete sequences and atlases fit the export budgets. Recheck total pixels after increasing resolution; the preview checkerboard is not exported.

## Complete ability effects

The **VFX** category contains four one-shots that appear from transparency and fade completely:

- **Lightning strike**: 1.2 seconds; main bolt and branches, contact glow, flash and residual sparks. An opacity track controls flickering; sparks have their own graphic-time track.
- **Frost nova**: 1.6 seconds; spreading cold mist, two icy rings, radial crystals, debris and core. Select a crystal/debris group under Transform/layout to change count, instance size and radius. Replace its child graphic to change every fragment.
- **Fire explosion**: 1.8 seconds; trailing smoke, shock ring, volumetric fire, embers and white-hot core. Smoke and fire have separate size, opacity and graphic-time tracks, and all layers fade out.
- **Holographic shield impact**: 1.4 seconds; honeycomb and scan lines share a circular mask, with separate rim, off-center highlight and ripple. Move the highlight and ripple together to relocate the impact. Check the surface mask when changing the shield silhouette.

Examples open paused at 30% so the effect is visible. This preview position does not modify project data or tracks. Play to inspect timing or restart from the transparent first frame, then select a child and open **Animation**. Use recording to change existing keyframes or base-value mode to edit the underlying state. Absolute tracks can overwrite changes made only to base values.

One-shot sequences include transparent start/end frames and disable loop export. Saving a project retains the structure. Save the outer effect group to the graphics list to insert it as a component elsewhere; its animation uses the containing node's local progress. Change the outer time range, cycles or phase to schedule the effect without canvas-level processing.

## Replaceable-unit dot array

Under **New arrangements → Replaceable-unit dot array**, select the outer group and open **Transform/layout**. Rows/columns set independent counts. Instance size sets cell content size; position jitter and size variation loosen the pattern, while the seed keeps random choices repeatable. Pin the arrangement module to the node tree for quick access.

Circles, stars and crosses initially use **Sequential modulo**. Disable/delete extra candidates to use one unit. To use an image or custom component, add the resource to the canvas and move it into the arrangement group as a direct child. A child group can supply one complete unit. **One random child** mixes candidates; **Entire group** layers all children into one repeated unit.

Layout belongs to the parent, so replacing units preserves rows, columns, spacing and randomness. Edit each unit's local size, position and color separately. Keep design aspect on wide/tall canvases. Save the project before expanding instances to edit individual copies.

## Ring shape, radius and flow

**Composition exercises** includes **Clean shock rings, Liquid ripples and Energy pulses**, showing flat, sine and noise modes of Radial Streak. Select the ring child and open **Shape**:

- **Frequency** sets cycles per radial unit; higher values pack rings more densely.
- **Distortion** sets angular displacement; flat mode ignores it.
- **Sharpness** retains its edge-transition meaning.
- **Falloff** controls the outer fade range.
- **Waveform** selects noise, flat or sine. Integer **Angular waves** closes the sine around the circle; noise also samples a closed circle.
- **Base radius** clears the center and offsets the radial pattern independently of outer falloff.
- **Flow (cycles/sec)** moves outward for positive values, inward for negative values and stops at zero. Reversing the time track also reverses motion.
- **Phase** offsets the cycle for staggered layers.
- **Ring width (cycle fraction)** creates separate soft rings when positive; zero preserves the original rising stripe profile.

Projects without the new values keep the original static noise rings. The new samples map four seconds of local time to two radial cycles. Recheck the seam after changing speed or time tracks.

**Core and halo** uses two independent glow nodes in a three-second breathing loop. Adjust their sizes, ranges, colors and opacity separately. The group does not require a canvas background and can be saved as a reusable light component.

## Aurora and energy curtains

**Aurora curtain, Holy light curtain and Energy barrier** live in **Composition exercises**. Three bands use different scales, densities, colors and motion ranges, layered with a refraction membrane, particle strands and dust. Holy light adds a soft core; the barrier adds a faint hex grid.

The bands use Aurora Veil's new **Vertical light curtain** appearance, with band foot position, curtain height and vertical ray density controls. The original **Flowing texture** mode and existing parameters remain available. Each layer has an independent graphic-time track. A six-second smooth back-and-forth motion stops gently at the seam, avoiding abrupt repetition of nonperiodic noise. Change band colors and opacity for depth, membrane edge brightness/interior opacity, strand count/width and dust density/size. Check rotation, graphic time and opacity at both endpoints together.

These compositions reuse existing graphics. Noise distortion and glitch processing of arbitrary input images, text or groups remain a later feature.
