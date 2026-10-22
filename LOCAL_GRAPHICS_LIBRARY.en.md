# Local graphics library, graphics list and resource editor

<!-- doc-language -->
[简体中文](LOCAL_GRAPHICS_LIBRARY.md) · [English](LOCAL_GRAPHICS_LIBRARY.en.md)
<!-- /doc-language -->

## Three independent levels

- **Library:** browse built-in/user resources; create, edit, categorize, delete and import/export. User resources live in IndexedDB `momo-graphics-library-v1`, with metadata separate from ZIP bytes. Updating/deleting an entry does not alter canvas copies.
- **Graphics list:** reusable resource copies and dependencies, with independent local IDs. Stored separately in this browser, not included wholesale in saved canvas projects.
- **Canvas instances:** deep copies with their own node IDs. Save an instance as a list entry or explicitly update its linked entry; other instances retain their content. Removing the list entry does not break existing instances.

## Identity and versions

`resourceId` is a stable UUID; formal `versionId` starts at 1 and `personalRevision` at 0. Library entries keep personal revision zero. An explicitly updated list copy increments its personal revision; ordinary parameter dragging does not. Publishing increments the formal version and resets the publishing list copy to the published snapshot, leaving other copies unchanged. Save as new creates a UUID at version/revision 1/0. Built-ins use namespace-derived stable UUIDs and are copied rather than overwritten.

`asset_*` content hashes identify immutable formula/image dependencies, separately from authored-resource identity. Dependencies can be shared. Different bytes with the same resource ID/version are rejected. Stale publishers must reload or save a new resource rather than silently overwrite updates. Organization permissions, accounts, remote publishing and historical-version browsing are not provided.

## Workflow

1. Open Graphics library, search names/aliases/categories and filter formula/image/composition resources. Add to graphics list for reuse or add directly to canvas for an independent instance.
2. A list card's Add creates an instance; its thumbnail enters trial editing. The preview offers list updates, save-as and library publication.
3. Create resource → Formula provides GLSL expression/body, up to 16 parameter bindings, ranges, steps, defaults and live preview. `time` is in seconds; detected use enables built-in motion. Compilation errors retain the previous successful image and block saving.
4. Create resource → Image supports PNG/JPG/WebP/SVG, with original-color/luminance/alpha modes. Bitmaps allow 16 MB and a 4096-pixel longest side; bytes are self-contained in packs.
5. Save a selected node or the whole canvas to the library with its composition/dependencies. Load and edit compositions in the main editor.
6. Custom resources can publish new versions or save independent copies. Deletion requires confirmation and removes that entry's pack; dependencies held in other packs remain.

## Assets and backups

Browsing reads metadata and pre-generated PNG thumbnails rather than registering/decoding every resource. Built-in thumbnails are maintained in `web/builtin-thumbnails.js`; update visuals with `node tests/builtin-release-browser-check.mjs --pattern <ID>`. Custom thumbnails are generated on save. Full packs/images are prepared only when loading or editing.

Project autosave snapshots canvas dependencies. Density maps serialize stable IDs and reconstruct numeric indexes on reload. The current session retains immutable CPU dependencies for undo, while renderers release unused image textures. Browsing does not allocate permanent GPU resources per library entry.

Single-resource ZIPs use `momo.texture-pack/v1`; `content.json.graphicResource` carries identity, version, name/aliases, kind, category, description and thumbnail. Nodes carry required formula/image dependencies. Library ZIPs use `library.json` (`momo.graphics-library/v1`) and `resources/<UUID>.zip`. The combined pack limit is 64 MB; export separately if needed. Identical versions are reused; conflicts can explicitly be saved as new resources. Project ZIPs and library backups are independent.

Storage is browser/origin-specific. Export backups for another computer/browser. Obsolete image-hidden metadata is unused, but old resource snapshots are not proactively deleted. Legacy global component lists are not automatically restored as the current list.

## Batch adding and added status

Select multiple items, all current results or none, then batch-add. Added status uses global `resourceId + versionId`, not personal revision. Duplicate same-version additions are disabled by default. A higher version offers confirmed replacement of the corresponding list entry and resets personal changes while keeping existing canvas instances. Batch-add does not auto-upgrade versions. Partial failures report reasons and keep failed items selected.

## Formula parameter bindings

Formula variables bind parameters; aliases are display metadata. Renaming a variable does not rewrite source automatically. Slots are assigned up to 16 and existing bindings do not move when another parameter is deleted. Matching uses complete identifiers, ignoring comments/member fields. Unused parameters produce guidance but do not block saving. Duplicate/invalid variables and compile errors block save and retain the previous successful preview. Right-side sliders are trial values; saved defaults come from the left. Packs retain authoring source/variables and ABI-compiled code for editing and execution.

The old 256-item count limits for reusable lists, pack dependencies and imported library assets are removed. Format, byte and node budgets still apply.

Bindings use scoped GLSL declarations without replacing source locals. Usage detection recognizes native vector-slot reads, parameter groups passed to helpers and preserved vector-output parameters. Unexposed defaults remain intact. Source and expression/body type are saved independently for reopening.

Export selected resources includes built-in/custom items. Select all current results after search/filtering, or clear filters to select everything. Already-added entries can still be exported; adding skips duplicates. Empty selections produce guidance, not empty packs. Each resource has a complete inner ZIP; outer `library.json` indexes `resources/`. Built-in exports retain stable IDs/content.

## Image background removal

Modes include keep original, remove a specified color and black-background effects to transparency. Pick a color with the picker/eyedropper. By default only edge-connected background is removed; disable this restriction to remove matching interiors too. Tolerance controls matching and transition controls soft edges. Color removal also reduces background-color contamination. Black-background extraction uses maximum RGB for alpha and reconstructs color, multiplying existing alpha by the result.

View original affects only comparison; saving uses the processed result. Checkerboard/black/white backgrounds are available. Editing uses `imageProcessing` version 1 with mode/color/tolerance/softness/connected; configurations participate in hashes. Saving processed bitmaps bakes a transparent PNG, so final resources do not preserve the full source-processing history. Keep original files separately. Processing runs locally without uploads.

### Contour reconstruction

Off by default. Threshold defaults to 0.5 (lower expands, higher tightens) and softness to 0.06. After background processing, GPU alpha samples are smoothly thresholded while retaining RGB and derivative antialiasing. Color and mask paths share sampling. This can help small icons but cannot restore lost detail. Leave it off for translucent smoke/glow. Editing uses `imageProcessing.contour` with enabled/threshold/softness. Original comparison bypasses processing; saved bitmaps bake the result.

### Automatic centering

Off by default. It finds the bounds of all positive-alpha pixels after background processing and shifts them by whole pixels to the center. Canvas size, subject size and RGBA remain unchanged. Empty images do not move; odd/even dimensions can leave a one-pixel margin difference. Draft configuration uses `imageProcessing.autoCenter`; disabling restores position before baking. Contour reconstruction follows during rendering. Eyedroppers switch to the original to avoid shifted-coordinate sampling.

## External AI authoring

The app does not invoke an AI service. Download Authoring Skill from Help and provide it to an external AI with your goal/reference. It guides route selection among formula, generator, SVG and bitmap, optional image cleanup, creation, validation and import. Without suitable tools or when formulas are unsuitable, it gives image-specific editor/Photoshop steps. Follow-up screenshots/errors support iteration.

Import JSON/official ZIPs via Create resource → Import files; use Image for bitmaps/SVG. Select batch entries before importing. Import first opens a draft: structural errors retain current content, GLSL failures retain the last preview and block saving. Save explicitly after checking. Copy repair information passes diagnostics/source to the AI.

Repair information contains current formula, parameter definitions, helpers, latest compilation/unvalidated status, unused notices, preview time and trial values; it can be copied even on failure. Export authoring file produces editable `.graphic.json`, not an identity/dependency resource ZIP. Helpers have their own editing area. A manual-copy fallback handles blocked clipboard access.

The schema is `momo.graphic-authoring/v1`; see [authoring specification](skills/texture-forge-author/references/authoring-guide.en.md) and [example](skills/texture-forge-author/references/example.graphic.json). It carries scalar formulas, not native vector/special seamless implementations. Images use their own importer. Built-in scalar exports use local adapters to preserve slots/hidden defaults; authors do not manage IDs or slots.

The portable kit includes a Skill entry, specifications, examples and CLI. Sources are under `skills/texture-forge-author`. In a source checkout, `node authoring-tool.mjs validate path/to/graphic.graphic.json` distinguishes structural checks from unexecuted GPU/visual checks. `node authoring-tool.mjs build-kit` regenerates shared text from `web/ai-authoring.js`; tests check consistency.

See [AI authoring CLI](AI_AUTHORING_CLI.en.md) for actual render/check operations without AI browser automation.

## SVG resources

Create resource → Image accepts `.svg`. Assets use `kind:image`, MIME `image/svg+xml`, and retain UTF-8 source in `images/*.svg`, not a preview PNG substitute. Download SVG source preserves it. Original-color/luminance/alpha modes remain available. SVG does not use bitmap background removal, contour reconstruction or pixel centering, and has no path editor.

Static paths, shapes, groups, fills/strokes, gradients, clipping/masks and local gradient inheritance are supported. SVG namespace plus valid viewBox or positive dimensions are required. Limits: 2 MB, 10,000 elements and depth 128. DTD, scripts/events, external links, embedded images, animation, foreignObject, use, CSS, text/fonts and cycles are rejected explicitly. Convert text to paths and styles to presentation attributes.

The source rasterizes into a growing cache as actual node resolution increases, preserving aspect/alpha up to 4096 or the GPU limit. WebGL still composites and exports raster formats. Offline builds decode data URIs without a backend/external fonts.

## Resource creation and SVG contours

The library offers Create resource and Export resources for selected items. Image, Import files, Formula and Generator tabs share name/category/description while keeping drafts. Import into library saves only the active tab. Existing resource editors keep their type.

After background removal/centering, Convert to SVG paths exposes alpha threshold 0–99%, smoothing and 128/256/512/1024 sampling sizes. Preview and save SVG; disabling returns to bitmap processing. Existing SVG keeps its paths and source download rather than retracing them.

Whole-canvas contours use Export… → SVG vector contours at current time, ignoring solo mode. Sampling, threshold and smoothing are export settings. SVG and PSD contours share `buildContourDocument`: closed cubic Bézier paths, even-odd holes and group opacity.

Each export part takes a single color from its most opaque sample. Gradients, texture and soft edges are lost; complex composites cannot always be separated into original nodes. No animation is retained. Remove opaque screenshot backgrounds first. Output is limited to 2 MB; reduce sampling or smooth if needed. There is no path editor or automatic multicolor layer separation.

Image-to-SVG threshold has synchronized numeric/slider controls. Denoising is 0–3, default 1, using three separable box-filter rounds before extraction to approximate Gaussian smoothing. Zero keeps original sampling; stronger settings can round corners, weaken lines or shrink holes. Source pixels are unchanged; ordinary PSD/canvas export does not enable this preprocessing by default.

Temporary extraction budgets are 200,000 anchors/600,000 edges per part. Over 50,000 final anchors produces guidance without blocking preview/save/export. Detail High/Balanced/Reduced uses 0.25/0.75/1 output-pixel simplification tolerance and is disabled when smoothing is off. The UI shows raw → final anchor counts. Invalid simplified geometry retains the original contour; complexity does not silently remove thin lines/holes.

The image editor is for lightweight processing; complex artwork can be prepared in Photoshop. Bitmap/SVG scale supports 10–400% and clockwise rotation −180–180°, with synchronized sliders/numbers, preview and reset. Canvas dimensions stay fixed and outside content clips. Draft `imageTransform` affects color/masks consistently. Original comparison bypasses it; saving uses the processed result. SVG conversion bakes transforms into paths; source download keeps untransformed source.

Color processing offers unchanged, tint and replace color, with original-image eyedropping, maximum-channel RGB distance tolerance and smooth transition. Semitransparency is preserved by default. Disabling it drives matching visible pixels toward opaque without filling zero-alpha backgrounds. Draft `imageColor` works for bitmaps/SVG and is bypassed by original comparison. Background processing occurs first; recoloring affects color/luminance masks and converted contours. SVG source download retains original code.

### Effects guidance Skill

Download Effects Skill provides `texture-forge-effects`, Markdown-only with no install dependencies. It explains operations rather than controlling the user's editor. It covers resource scopes/saving, canvas, regions/UV/arrangement, repetition, color/blending/masks/contours, timing, images, export, recipes and troubleshooting. Arrangement ranges are generated from current definitions; actual graphics capabilities come from an exported dynamic catalog, not a bundled fixed list.

Maintain sources under `skills/texture-forge-effects`; `node build-effects-kit.mjs` regenerates ranges, embedded files and ZIP. Authoring/offline builds regenerate both kits too. Update guidance when controls/behavior change; generated ranges use current definitions. Both kits include Chinese and English Markdown editions.
