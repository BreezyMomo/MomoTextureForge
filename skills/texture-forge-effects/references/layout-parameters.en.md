# Arrangement parameter ranges

<!-- doc-language -->
[简体中文](layout-parameters.md) · [English](layout-parameters.en.md)
<!-- /doc-language -->

These are shared definitions, not controls visible in every mode. Some advanced modes allow 512 instances. Select density graphics by name, not internal index; density parameters use that graphic’s range. Mode-dependent labels may mean outer-ring count, count per ring, symmetry copies, path scale, end scale or orientation.

| Parameter | Default | Minimum | Maximum | Step |
| --- | --- | --- | --- | --- |
| Grid columns | 4 | 1 | 16 | 1 |
| Grid rows | 4 | 1 | 16 | 1 |
| Instance count | 12 | 1 | 128 | 1 |
| Instance size | 0.22 | 0.01 | 2 | 0.01 |
| Layout radius | 0.38 | 0.02 | 2 | 0.01 |
| Layout rotation ° | 0 | -360 | 360 | 1 |
| Position randomness | 0 | 0 | 1 | 0.01 |
| Size randomness | 0 | 0 | 0.9 | 0.01 |
| Rotation randomness ° | 0 | 0 | 180 | 1 |
| Arrangement seed | 1 | 1 | 99999 | 1 |
| Grid row offset | 0 | 0 | 1 | 0.01 |
| Layout center X | 0 | -1.5 | 1.5 | 0.01 |
| Layout center Y | 0 | -1.5 | 1.5 | 0.01 |
| Ring coverage | 1 | 0.05 | 1 | 0.01 |
| Spread angle ° | 137.507764 | 0 | 360 | 0.001 |
| Open center | 0 | 0 | 0.95 | 0.01 |
| Outer-ring size factor | 1 | 0.1 | 4 | 0.01 |
| Spiral orientation | 0 | 0 | 2 | 1 |
| Path start X | -0.8 | -8 | 8 | 0.01 |
| Path start Y | -0.5 | -8 | 8 | 0.01 |
| Path control 1 X | -0.5 | -8 | 8 | 0.01 |
| Path control 1 Y | 0.9 | -8 | 8 | 0.01 |
| Path control 2 X | 0.5 | -8 | 8 | 0.01 |
| Path control 2 Y | -0.9 | -8 | 8 | 0.01 |
| Path end X | 0.8 | -8 | 8 | 0.01 |
| Path end Y | 0.5 | -8 | 8 | 0.01 |
| Path start progress | 0 | 0 | 1 | 0.01 |
| Path end progress | 1 | 0 | 1 | 0.01 |
| Path sampling | 0 | 0 | 1 | 1 |
| Path spacing | 0.06 | 0.005 | 1 | 0.005 |
| Minimum center distance | 0.06 | 0 | 1 | 0.005 |
| Turns | 3 | 1 | 32 | 1 |
| Ring offset / Symmetry offset ° | 15 | -180 | 180 | 1 |
| Spiral turns | 3 | 0.1 | 24 | 0.1 |
| Inner radius ratio | 0.15 | 0 | 1 | 0.01 |
| Mirrored pairs | 1 | 0 | 1 | 1 |
| Hex orientation | 0 | 0 | 1 | 1 |
| Density threshold | 0.1 | 0 | 1 | 0.01 |
| Density contrast | 1 | 0.1 | 8 | 0.1 |
| Radial count distribution | 1 | 0 | 1 | 1 |

## Node-level arrangement options

These settings are separate from the numeric array and depend on node/mode. See [Arrangement and compositing](layout-compositing.en.md).

| Option | Default | Values / range |
| --- | --- | --- |
| Group instance content | Entire group | Entire group / one random child / sequential modulo |
| Mixed-content seed | Shared arrangement seed | 1–99999, step 1 |
| Instance fit | Keep design aspect | Keep design aspect / stretch; missing legacy setting keeps aspect |
| Avoid overlap in scatter | Off | On/off for whole-region or density-pattern scatter |
| Extra gap | 0 | 0–0.5, step 0.005, normalized to the region short side |

Fill region sets the existing radius to 0.5 and center offsets to zero, retaining other settings. Count is a target; overlap/density constraints may reduce it.

## Extended node arrangements

Border/contour layouts allow 512 instances. Herringbone/weave uses 1–8 repeat-block rows/columns, each 4×4 cells, up to 512 bricks. Rule tiling supports 1–16 rows/columns. Border/contour share count/spacing, size and orientation controls.

| Extended parameter | Default | Minimum | Maximum | Step |
| --- | --- | --- | --- | --- |
| Border width | 0.84 | 0.05 | 1 | 0.01 |
| Border height | 0.68 | 0.05 | 1 | 0.01 |
| Corner radius | 0.08 | 0 | 0.5 | 0.005 |
| Path offset | 0 | -1 | 1 | 0.01 |
| Contour alpha threshold | 0.5 | 0.01 | 0.99 | 0.01 |
| Contour normal offset | 0 | -0.2 | 0.2 | 0.005 |
| Start size factor | 1 | 0.01 | 4 | 0.01 |
| End size factor | 1 | 0.01 | 4 | 0.01 |
| Start opacity | 1 | 0 | 1 | 0.01 |
| End opacity | 1 | 0 | 1 | 0.01 |
| Start rotation ° | 0 | -360 | 360 | 1 |
| End rotation ° | 0 | -360 | 360 | 1 |
| Flow amplitude | 0.05 | -0.5 | 0.5 | 0.005 |
| Wave count | 2 | 1 | 24 | 1 |
| Flow phase ° | 0 | -3600 | 3600 | 1 |

Gradients: off/horizontal/vertical/radial/instance order, reversible. Flow: off/wave/vortex, optionally following orientation. Pattern: herringbone/basket. The first child supplies contours and may be displayed once; remaining children decorate it. Rule candidates declare any four-edge combination. Overlap avoidance and rule tiling bypass gradient/flow changes.
