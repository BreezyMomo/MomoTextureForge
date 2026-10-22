# 08 · Export and delivery

<!-- doc-language -->
[简体中文](08-export.md) · [English](08-export.en.md)
<!-- /doc-language -->

[Manual contents](README.en.md) · Previous: [Normals and 3D](07-normal-and-material.en.md) · Next: [Remote libraries](09-remote-libraries.en.md)

## 1. Export one PNG

![Full-canvas PNG export settings](images/en/export-png.png)

> Callouts: 1 Choose current-frame PNG; 2 Choose color or normals; 3 Start export.

1. Open **Export…** and select **PNG · Current frame**.
2. Set pixel dimensions, which follow canvas aspect ratio. Change the ratio in **Canvas settings**.
3. Choose Color, Height, Normal or Custom RGBA under **Output content**.
4. Set transparent background and PNG 8/16-bit as needed.
5. Check the dimension summary, choose **Start export**, and wait for the download.

Copy PNG8 always uses 8-bit output; download instead if the browser rejects clipboard access. 16-bit and EXR output require floating-point rendering support.

Export uses the entire canvas and ignores solo preview, viewing zoom, guides and the preview channel. Checkerboards, 3D models and lights are not included.

## 2. Export animated sequences

![Flame atlas dimensions, FPS, duration and columns](images/en/export-atlas.png)

> Callouts: 1 Choose sprite atlas; 2 Set FPS; 3 Set duration; 4 Set atlas layout.

Open the [flame-sequence example](examples/fire-sequence.json):

1. Play to inspect motion, then open Export.
2. Choose **Frame PNG ZIP** for separate files or **Sprite atlas PNG** for frames arranged on one image.
3. Use `128 × 128` per frame, `16 FPS`, `1 second`, and `4 columns` for this exercise.
4. Enabling **Loop export: omit duplicate endpoint** gives 16 frames: 4 columns × 4 rows in a `512 × 512` atlas.
5. Check the arrangement with **Preview sprite atlas**, then select the actual atlas format and download.

![Generated flame atlas](images/en/atlas-preview.png)

> Callouts: 1 First frame; 2 Last frame.

Omitting the endpoint avoids duplicate sampling; it does not repair a discontinuous animation. Use the same FPS and grid dimensions in your engine. The tool does not directly export GIF or video.

## 3. Choose PSD, SVG or EXR

| Format | Use | Distinction |
| --- | --- | --- |
| PSD · Current-frame layers | Continue editing in an image application | Preserves hierarchy where possible; complex compositing is rasterized |
| SVG / PSD vector contours | Paths, holes and single-color shapes | Extracted from sampled alpha; gradients, feathering and semitransparency are simplified |
| EXR / Atlas EXR | High-precision data | Half data with optional lossless ZIP compression; requires float support |
| Three-size / Three-atlas ZIP | Deliver several standard sizes together | Uses the panel's predefined size tiers, not arbitrary batch processing |

![Vector contour threshold and smoothing](images/en/export-vector.png)

> Callouts: 1 Choose a vector-contour format; 2 Check contour settings before exporting.

The default threshold is 50%; smoothing reduces stepped edges. A 0% threshold includes faint transparent edges. This is alpha-contour extraction, not semantic vector reconstruction of arbitrary textures. Inspect complex noise or soft glows carefully. Height and normal output do not determine vector contours.

## 4. When a budget limit appears

- A single image is limited to 4096 pixels per side. Check the actual aspect-linked dimensions.
- Atlases allow up to 8192 per side and 16,777,216 total pixels. Sequences allow up to 10,000 frames and 33,554,432 sampled pixels overall.
- These limits cannot all be reached simultaneously. Maximum frame dimensions usually cannot accompany maximum frame count; devices may have lower limits.
- Single PNG export composes on demand to reduce intermediate-texture memory. Complex canvases can be slower; arbitrary workloads are not guaranteed to complete.
- Use Cancel in the progress UI when needed. Read the specific error before reducing dimensions, frames or complexity.

## 5. Check before delivery

Open downloads in the target application and confirm dimensions, alpha, frame count, direction and color/normal channels. Save a project ZIP separately for later editing.

## 6. Pack nodes into RGBA

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
