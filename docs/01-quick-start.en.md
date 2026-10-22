# 01 · Quick start

<!-- doc-language -->
[简体中文](01-quick-start.md) · [English](01-quick-start.en.md)
<!-- /doc-language -->

[Manual contents](README.en.md) · Next: [Graphics library and graphics list](02-graphics-library.en.md)

## 1. Open the editor

Visit the [online editor](https://breezymomo.github.io/MomoTextureForge/). See [Development and deployment](development.en.md) for local/offline use. A first visit starts with an empty canvas. To explore a prepared scene, download the [summoning-circle example](examples/summoning-circle.json) and use **File → Open project**.

![Nodes, canvas and inspector](images/en/workspace.png)

> Callouts: 1 Open the graphics library; 2 Select a node; 3 Switch texture channel; 4 Edit the selected node.

- **Toolbar:** canvas name, File, undo/redo, canvas settings, export, graphics and help. Narrow windows move Canvas settings into File and Examples into the menu beside Graphics library.
- **Far left:** full-height graphics list with reusable copies.
- **Second column:** node tree. Select an instance or group to decide what the inspector edits.
- **Center:** composite preview, texture channels, 2D/3D modes, canvas tools and playback.
- **Right:** selected node's shape, color, transform/layout, animation and compositing. No node means no node parameters.

Open **Appearance** in the toolbar to choose Momo classic dark, neutral graphite, soft light, or follow the system, and set a custom accent color. Changes preview across the workspace. **Save appearance** remembers your choice; Cancel or Esc restores the appearance from before the dialog opened. Preferences stay in this browser and site without changing artwork colors, exports, or project files.

**Creative presets** offer Aurora, Pulse, Cinema and Candy. Click a card to preview its style, palette, accent and recommended tabs together while keeping the current density. Aurora uses violet atmosphere and pill tabs; Pulse pairs fresh green with rounded controls; Cinema frames artwork with a monochrome interface; Candy creates a pastel studio. You can still change the light/dark palette or customize the accent. Only Save remembers the changes; Cancel or Esc restores every setting.

**Interface style** retains Refined, Original, Minimal and Soft alongside the four new styles. Original retains the earlier module frames, selection treatment and controls; saved preferences keep that style, while fresh browsers default to Refined. Refined uses fine borders, layered surfaces and subtle shadows; nested settings use separators to avoid repeated frames. Minimal quiets module frames, while Soft rounds controls and panels further. Menus, dialogs and floating panels share one elevation treatment. **Density** offers Compact and Comfortable, adjusting control height and spacing in parameter modules, node rows, and library cards. Combine either setting with any palette; saving or cancelling applies to all appearance choices together.

**Tab style** independently offers Classic, Segmented, Pills and Underlined, or Follow interface style to retain a skin’s original tabs. Changing only tabs leaves colors, skin and density unchanged; switching skins also preserves an explicit tab choice. The preview includes both dock-panel and inspector tabs, using the editor’s actual style rules.

While dragging a parameter module, adjacent modules smoothly make room. The new order is saved only on drop; Esc cancels. Same-level node sorting shows an insertion gap, while cross-group moves retain insertion lines and target highlights. Panel placement, section disclosures, menus, thumbnails and notifications use brief transitions; sliders, canvas manipulation and dragged objects remain immediate. Interface motion respects the system's reduced-motion preference without changing artwork animation or exports.

![Interface colors, style and density](images/en/appearance-settings.png)

> Callouts: 1 Choose interface colors; 2 Choose an interface style; 3 Set interface density; 4 Customize the accent color; 5 Save appearance preferences in this browser; 6 Choose a tab style independently; 7 Choose a creative preset.

## 2. Add your first graphic

1. Open **Graphics library**.
2. Search for “Star” or browse categories.
3. Choose **Add directly to canvas**. The library closes and selects the new node.
4. Change inspector parameters and watch the preview. Adding again creates an independent instance; undo is available.

For reusable favorites, also **Add to graphics list** and use **+ Add** from the left panel later. Direct insertion does not overwrite personal edits in that list.

![Library resource cards](images/en/graphics-library.png)

> Callouts: 1 Search resources; 2 Add directly to canvas; 3 Add to the reusable list; 4 Edit a resource.

The library is the source, the graphics list holds reusable copies, and nodes are canvas instances. See the [library chapter](02-graphics-library.en.md).

## 3. Adjust position and size

1. Select a node and open **Transform / Layout**.
2. Start with region width, height, position and rotation under the node's occupied region.
3. For repetition, choose an arrangement, then adjust instance size and distribution.
4. Set canvas aspect ratio in **Canvas settings**; pixel dimensions are chosen at export.

Node region, shape radius and arranged-instance size are three different levels. If a pattern looks too small, check which level you are editing.

## 4. Save a project, then export an image

![File menu](images/en/project-files.png)

> Callouts: 1 Open a project; 2 Save an editable project; 3 Export an image.

- **File → Save project** writes the canvas and dependencies as a ZIP for later editing.
- **File → Share configuration** can create a link for simple built-in canvases. Custom dependencies or offline use fall back to a project file.
- **Export…** produces full-canvas images and atlases. See [Export](08-export.en.md) for format differences.

Drafts are autosaved in browser storage, but other browsers, ports and origins do not share them automatically. Save important canvases as project files.

## 5. Practice with composition examples

Open **Examples** to generate 30 compositions and material presets: five VFX studies, four UI backgrounds, thirteen new-arrangement demonstrations, two material presets and six composition exercises. Filter by category. Each card explains its construction; **Edit on canvas** opens an independent canvas whose tree can be explored layer by layer.

Puzzle examples show cell spacing, overflow tabs, flat outside borders and per-piece colors. Content-boundary and cross-cell examples demonstrate overflow handling.

![VFX, UI patterns and geometric examples](images/en/composition-examples.png)

> Callouts: 1 Open an editable composition.

| Example | What to learn |
| --- | --- |
| Slash trail | Core, noise mask, fine tails and rotational fade; 0.7-second one-shot |
| Hit flash | Layered glow, radial sparks and flash timing; 0.6-second one-shot |
| Fractured shock ring | Ring expansion, noise clipping and fade; 1-second one-shot |
| Energy vortex | Three flow arms, inverted center mask and edge fade; 3-second loop |
| Dissolve mask | Coarse/fine noise and threshold erosion; 1.5-second opaque grayscale sequence |
| Diamond grid | Outlined and small diamonds on a regular grid for panels and cards |
| Staggered diamond tiles | Light/dark diamond layers offset half a cell for shop/inventory backgrounds |
| Diagonal stripe pattern | Continuous diagonal lines and staggered dashes for tabs and technology UI |
| Dot background | Regular dots and sparse crosses for information panels |
| Rounded border lights | Evenly spaced decorations around rectangular/rounded borders |
| Star-contour dots | First child supplies a contour; other children repeat along it |
| Herringbone tiles | Alternating 2:1 bricks with repetition across the canvas edge |
| Basket weave | Alternating pairs of horizontal and vertical bricks |
| Fading decorative dots | Size, opacity and rotation gradients by position or instance index |
| Wave flow-field lines | Grid plus wave offsets, orientation and phase animation |
| Connected pipes | Candidate tile interfaces and a seed, matching neighbors and wrapped edges |
| Summoning effect | Nested groups, pulsing rings, rotation and fading shockwave |
| Radar halo | Concentric rings, radial arrangement and whole-group rotation |
| Petal badge | Ellipse orientation, radial arrangement and layered colors |
| Star spiral | Golden-angle spiral, alternating children and size randomization |
| Honeycomb shield | Hex grid, polygon outlines and a circular mask |
| Flame circle | Animated generator composited with geometry |

VFX thumbnails show roughly 30% progress; play the canvas to inspect the full motion. Slashes, flashes and shock rings use transparent one-shot exports. The vortex loops. The dissolve mask exports Height with an opaque background for material sampling; scrub to select an erosion state. Sequence duration and FPS determine its frames.

UI backgrounds are static, tileable patterns with dark-background color PNG defaults. Select an arrangement group to change rows and columns, or its inner diamonds/lines/dots to edit colors and sizes. Disable transparency to retain the background, or enable it to export only the pattern for overlay. Check seams with **Tile preview** and use texture repetition in your project instead of stretching the whole image.

The material-presets category contains acid splatter and curled celebration ribbons, both static and transparent by default. Edit droplets, bubbles, highlights, ribbon control points, widths and colors. Select the outer group and **Save selection to library** to reuse it.

![Acid splatter and curled ribbon presets](images/en/vfx-presets.png)

> Callouts: 1 Choose the material presets category; 2 Edit a preset on the canvas.

See [Canvas and compositing](05-canvas-and-compositing.en.md) for arrangement instructions and limits.

After editing, **Save canvas to library** preserves a reusable composition; **File → Save project** preserves the source canvas.

## Check your first result

Confirm that the canvas contains a visible pattern, the intended node is selected, transparency is correct, and the saved project reopens successfully before producing final delivery files.
