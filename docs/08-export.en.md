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
