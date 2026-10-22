# Animation and export

<!-- doc-language -->
[简体中文](animation-export.md) · [English](animation-export.en.md)
<!-- /doc-language -->

## Two time systems

- Playback/restart, duration 0.05–600 seconds and scope progress remain outside the collapsed timeline. Switching graphics is not a playback-stop instruction.
- Parameter keys use node-local 0–1 progress. Parent intervals determine start/end and speed.
- Time-aware graphics expose built-in autoplay, speed −10–10 and offset −600–600 seconds. Motion uses accumulated seconds × speed + offset, without resetting each timeline cycle. Disable autoplay to set/freeze/key shape time from −36000 to 36000 seconds.
- Disabling built-in motion does not necessarily stop transform keys, and disabling keys does not necessarily stop time/UV motion. Identify the intended mechanism.

## Keyframes and timeline

1. Select a node and open the timeline. Check whether the scope is the canvas or an entered node; return to canvas time if necessary.
2. Enable Record at the start and adjust a parameter; move progress and adjust it again. Initial recording retains the starting base state. Parameter-side buttons also add keys.
3. Disable Record before playback. Base-value mode temporarily bypasses node parameter animation, then restores it; exports retain tracks.
4. Filter all/selected-subtree/animated nodes. Snapping supports 0.01, keys, export FPS or off. Zoom ranges from 1–20.
5. Select diamonds to drag/edit, Shift/box-select, copy/paste/delete. Curve segments use linear/smooth/hold/custom tangents. Enums/switches remain discrete.
6. Track modes replace/add/multiply base values; start with replace. Clear node keys or disable its parameter animation as needed. Templates include breathing scale, fade, full rotation, pop, horizontal entrance and UV scrolling. Applying replaces matching parameter tracks only.

Blue intervals can move/resize. Loops/nonlinear mappings display read-only projections; enter local time to edit instead of treating repeated diamonds as independent keys.

Animation controls include parent interval 0–1, one-shot/loop/ping-pong, repetitions 0.01–64 and hold/hide outside. A ping-pong cycle has two one-way trips. Advanced controls include source progress range, parent phase offset, fixed progress and time-remapping curves. Remapping maps local time horizontally to source progress vertically for the subtree; it is not a value curve. Instance phases are arrangement settings.

## Export choices

Export uses the entire canvas, ignoring solo, preview channel, zoom and guides. Canvas settings define aspect; export dimensions are 1–4096 and aspect-linked.

| Format | Purpose and limits |
| --- | --- |
| Current-frame PNG / Copy PNG8 | Static/transparent images; PNG 8/16-bit, clipboard fixed 8-bit; download if denied |
| Layered current-frame PSD | Editable hierarchy where possible; complex effects may rasterize |
| PSD/SVG vector contours | Alpha threshold (default 50%) and smoothing; monochrome parts/holes, simplified gradients/soft edges; SVG 2 MB |
| Current-frame EXR | High-precision data, optional lossless ZIP, float-support dependent |
| Frame PNG ZIP | Separate animation frames |
| PNG/EXR sprite atlas | Grid frames played at matching FPS; no direct GIF/video |
| Atlas preview | Inspect packing |
| Three-size/three-atlas ZIP | Current tiers: static 256/512/1024 and frame 64/128/256 |

Choose Color/Height/Normal/Custom RGBA separately from preview. Normal strength 0–20, Sobel/Scharr, X/Y flips, inverted height and smoothing 0–8 persist with projects and exports. Models/lights/material/view/repeat are preview-only. RGBA can pack height/inverse, normal XYZ, constants 0/1/0.5, alpha and normal slope. Contours do not use height/normal channels. Choose alpha/background explicitly; checkerboards are not output.

Animation supports FPS 1–120, duration and atlas columns 1–32. Check the resulting frame summary. Omitting loop endpoints avoids redundant frames, not mismatched motion. For seamless loops, close controlled keys and built-in time/UV behavior together.

Budgets: up to 10,000 frames and 33,554,432 sampled pixels per sequence; atlas sides 8192 and 16,777,216 pixels overall. Hardware can limit further. Maximum dimensions cannot necessarily accompany maximum frames. Above 50,000 contour anchors is guidance; SVG size still limits output. A preview budget failure does not alone prove 4096 PNG export is impossible.

Export displays stages/progress and cancellation. Background encoding/vector work can still accompany short GPU pauses. Read failures and reduce workload rather than repeatedly clicking.

## Single-PNG memory handling

Single PNG composes at requested size/depth on demand, releases temporaries and caches at most two arrangement sources. It does not reuse preview's 384 MiB/evaluation-count thresholds. Complex output may be slower; supported hardware renders covered regions only. Browser/GPU allocation or context loss can still fail. Other formats retain their own paths/limits.

## Pack nodes into RGBA

Preview with **Texture channel → Custom RGBA** above the canvas. For delivery, choose **Export… → Output channel → Custom RGBA channels**. Preview and export modes remain independent; both use the same four source settings saved in the project.

For each channel choose:

1. **Source**: a canvas channel, the whole canvas, or any ordinary graphic/group in the current node tree.
2. **Sample**: node luminance, red, green, blue, alpha or height. Canvas channels retain height, inverse height, normal components, opacity, slope and constants 0/0.5/1.

For example, put dissolve-noise luminance in R, a main shape's Alpha in G, an edge-glow group's luminance in B, and constant 1 in A. A single PNG/EXR then carries three masks for separate material inputs.

Sources render independently in full canvas coordinates, retaining ancestor transforms, arrangements, clocks, opacity, palettes, masks and filters. Siblings do not occlude the source. The source/ancestor path blends normally; the selected group's internal blend modes remain intact. Random-child, contour and rule layouts still compute placements using all original candidates. Ancestor effects apply to the isolated composite, rather than recovering a source's contribution from the final image.

Samples labeled “× Alpha” include alpha over transparent black. Color R/G/B preserve straight color without alpha multiplication. Choose Alpha for coverage only. Hidden or deleted sources output 0; missing sources are labeled, and undoing deletion restores the reference. Animation samples each frame's current state, shared by atlas and frame-sequence exports. References bind to node IDs, so renaming is safe; new projects need new source selections.

Different sources require additional compositing. Check complex, large outputs at a smaller size first. PNG16/EXR retain rendering precision; PNG8 quantizes. Packed A is data too: an ordinary image viewer may display packed pixels as transparent, which is expected.

- **Preserve color RGBA**: ordinary Color export already retains RGBA. Custom packing also offers **Use canvas RGBA**, setting R←Color R, G←Color G, B←Color B and A←Alpha. Each source remains editable. Canvas channels and isolated nodes both offer Color R/G/B without alpha multiplication, avoiding a second Alpha multiplication that would darken translucent edges.
- **Luminance / RGB × Alpha**: treat transparency as black, useful for masks. These are distinct from straight color components. Color luminance without alpha multiplication is also available. Preserved color means the current rendered color; hidden RGB in fully transparent original-file pixels cannot necessarily be recovered.
- Constants are explicitly labeled **Constant 0 (black), Constant 1 (white), and Constant 0.5 (middle gray)**. Each fills its entire destination channel with that value. For example, A=1 makes the packed image fully opaque.

RGBA packing does not bake the background. For an ordinary color image flattened onto the background, use Color output and disable transparent background.
