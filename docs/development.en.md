# Development, offline builds and static deployment

<!-- doc-language -->
[简体中文](development.md) · [English](development.en.md)
<!-- /doc-language -->

[Manual contents](README.en.md) · [Project home](../README.en.md)

## Run locally

Use Node.js 22+ and a desktop WebGL2 browser. At the repository root:

```sh
npm ci
npm start
```

Open `http://127.0.0.1:8787/`. Windows can run `start.bat`. Choose another port with:

```sh
npm start -- --port 8799
```

Browser storage is not automatically shared between online/offline origins, ports or browsers. Use project/resource ZIPs for backup and transfer.

Startup markup/styles in `web/index.html` display before scripts finish downloading. `web/startup.js` drives real loading stages, transition and retry for source and standalone builds. There are no invented percentages or artificial minimum waits. Failures retain details and reload controls without clearing drafts/resources.

## Interface themes

`web/appearance.js` manages versioned browser preferences at `momo-texture-appearance:v1`, accepting only built-in theme IDs and six-digit hex accent colors. System mode follows OS appearance changes. Accents generate readable button text, panel accent text, and selection surfaces. `web/appearance-settings.js` provides live preview, cancellation, and explicit saving; unavailable storage keeps the preview usable and displays a message.

`web/theme-tokens.css` defines shared interface colors by background, panel, control, text, border, and status roles. Component styles reference these tokens. Canvas guides, thumbnail backgrounds, user palettes, and artwork retain independent colors. Startup applies preferences before mounting the editor; offline and static builds embed the same styles and logic. Appearance never enters the project model, undo history, resource hashes, or artwork exports.

Preferences include independent `style` (`standard`, `refined`, `airy`, `minimal`, `soft`, `aurora`, `pulse`, `cinema`, `candy`) and `density` (`compact`, `comfortable`) values. The stable value `standard` always means Standard and retains the earlier palette and control rules. Color-only preferences migrate to Standard and Compact; fresh browsers default to the independent `refined` preset. Root `data-interface-style` and `data-density` attributes drive shared radius and spacing tokens. Minimal styling quiets module borders while retaining input borders, keyboard focus, and docking separators. Density changes use the existing preview resize observer without writing to the canvas model.

`web/editor-surfaces.css` provides shared surfaces for Refined and the four creative styles; `web/creative-skins.css` defines their distinct tabs, corners and panel structures. All rules are scoped by style ID, leaving Standard, Minimal and Soft unchanged; source and standalone versions load it after the other editor styles. Backgrounds, borders, selection and shadows compose semantic variables from `web/theme-tokens.css`, leaving artwork palettes, transparency checkers and canvas guides independent. Visual references are [Linear's layered surfaces](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md) and [Raycast's floating panels](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/raycast/DESIGN.md), adapted to a compact editor without marketing typography or section spacing.

Run `node --test tests/appearance.test.mjs` and `node tests/appearance-browser-check.mjs` to verify theme behavior; add `--built` after a static build to check the distribution. Browser checks cover preview, cancellation, saved restoration, system changes, localized controls, narrow headers, unchanged canvas pixels and project storage. Screenshots are in `test-results/appearance/`.

All interface styles are registered in `STYLE_IDS` and selected through one card grid. Cards change only `style`, preserving the color scheme, appearance mode, custom accent, density and tabs; selection depends only on the style ID. Each creative style defines light/dark surface variables, with Graphite further neutralizing the backgrounds. `appearancePalette` computes accent-text contrast against the actual panel color. Returning to an existing style with the `auto` color scheme removes every creative palette override. Visual references: [Framer](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/framer/DESIGN.md), [Spotify](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/spotify/DESIGN.md), [Runway](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/runwayml/DESIGN.md), [Lovable](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/lovable/DESIGN.md) and [MiniMax](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/minimax/DESIGN.md).

The `scheme` preference accepts `auto`, `xuanqing`, `tianqing`, `dunhuang`, `zhusha`, `zhuyue` and `ouhe`. Older preferences default to `auto`, preserving their colors. Named schemes work independently of control styles and provide light/dark backgrounds, panels, controls, borders, three text levels and recommended accents; Graphite neutralizes their surfaces. Selecting a scheme resets the accent to its recommendation, with further customization available. Style cards retain their fixed reference colors and thumbnails across changes to the scheme, appearance mode or accent; the right-hand preview and workspace show the actual combination. These are original UI adaptations inspired by traditional colors, not historical standard values or an external color-table dependency.

`GROUPED_SCHEME_IDS` additionally registers `shuimo`, `qingci` and `mineral`. Inspired by [Chinese Color Atlas's role-based palettes](https://chinesecoloratlas.com/en/palettes), their colors are adapted for editor contrast. `appearancePalette` also returns selection, navigation, parameter, header and neutral stage roles; custom accents change primary actions only. `web/palette-roles.css` maps roles only under `data-palette-roles=true`, preserving style geometry, independent tabs and functional state colors. Returning to an older scheme removes all role overrides. The preview shares real primary-button, tab and animation-state rules, with six current color roles shown as swatches. Run `node tests/grouped-palettes-browser-check.mjs` (add `--built` for static) for 117 combinations of three palettes, modes, nine styles and independent tabs, primary-color independence, preview fidelity, contrast, save/cancel/restoration, unchanged artwork pixels and narrow screens.

`airy` reuses Refined surface and control tokens. Its own selectors replace repeated module frames with transparent borders, separators and filled inputs, preserving existing styles and defaults. `web/editor-icons.js` supplies consistent SVGs for canvas tools, node types, reset/keyframe and module actions. Icon buttons retain semantic names and localized hints; `data-key-state` updates keyframe status without replacing the button. `web/tree.css` aligns value/action columns, with `selection-number-field` for multiple selection; `web/parameter-presentation.js` marks X/Y axes and degree/second units by stable paths without inspecting translated labels; compact node shortcuts and global settings retain their own layout. Run `node tests/editor-polish-browser-check.mjs` (add `--built` for the static version) to verify style switching/storage, 240/300/400px alignment, reset/undo/keyframes and multiple-selection controls.

The independent `tabs` preference accepts `auto`, `classic`, `segmented`, `pill` and `underline`. Older settings default to `auto`, preserving their existing look. Following the style uses its default tabs; explicit tab choices survive style changes, and adjusting only tabs does not reset other preferences. Root `data-tab-style` records the effective geometry and `data-tab-override` enables explicit overrides from `web/tab-styles.css`. The preview reuses `.dock-stack-header` / `.dock-tab`; inspector rules are shared through `:is(#inspector-tabs,.appearance-inspector-tabs)`. Browser checks compare real and preview colors, borders, radii, shadows and padding.

Editing states use independent semantic variables: `--ui-motion` / `--ui-motion-bg` for animation, `--ui-time*` for time intervals, `--ui-key*` for keyframes and favorites, and `--ui-playhead` for playback position; recording uses the danger colors. They are not derived from the personal accent. Light themes provide darker text and outlines. Functional-state rules in `web/tree.css` take precedence over generic selection, keeping recording red even with `aria-pressed=true`. The appearance preview shares the real animation-badge, interval, keyframe and recording-button classes and rules.

Run `node tests/functional-colors-browser-check.mjs` and, after the static build, `node tests/functional-colors-browser-check.mjs --built` to check functional colors, contrast and real/preview consistency across all scheme, theme and style combinations, with unchanged artwork pixels and undo history.

## Build offline

```sh
npm run build:standalone
```

- `dist/MomoTextureForge.html`: scripts, styles, built-in definitions and export Worker embedded in one HTML file.
- `dist/MomoTextureForge-offline.zip`: distribution archive.
- Using the generated file needs no Node.js. Local editing/export works offline; remote refresh/download requires a network.

Share saved project files separately. Browser storage is not a portable project backup.

## Build a static website

```sh
npm run build:pages
```

This builds offline HTML, then updates tracked `site/index.html` and retains `.nojekyll`. Deploy `site/` without a Node server. GitHub Pages repository subpaths are supported. `dist/` is ignored; `site/` travels with source changes.

### Official-site analytics

`build:pages` embeds `web/site-analytics.js` and permits `https://hm.baidu.com` for analytics scripts. Offline HTML/ZIP does not contain it. An HTTPS host/path allowlist selects separate Baidu sites for GitHub Pages (23623715) and WorkBuddy (23623719). Local/other domains, other GitHub projects and validation views do not collect traffic.

One manual pageview is sent per page load using fixed editor/example paths. Query strings, `sharecode` and canvas `#tree` are excluded; referrers are reduced to origin. Automatic PV/click capture is disabled and script requests use `referrerPolicy=origin` to send only the site origin, excluding paths, query strings and canvas data. Do not use `no-referrer`: Baidu responds with an empty HTTP 200 script, preventing pageview reporting. Only completed file generation followed by download initiation, or a successful clipboard image write, emits an explicit event. Parameter edits, canvas names, filenames and image/node content are not actively reported. Baidu still processes network/browser data and visitor identifiers needed for analytics; do not describe this as no data collection.

`web/export-events.js` emits a local completion signal; only the official-site analytics entry subscribes and calls `_trackEvent`. In Baidu **Reports → Visit analysis → Event tracking/Event analysis**, select category `export`: action `download` means a download was initiated and `clipboard` means a clipboard write succeeded. Labels are fixed `format/channel` pairs such as `png/normal` and `frames/color`. Reports provide event counts and unique event visitors; repeated exports by one visitor increase the count. Formats are `png`, `exr`, `svg`, `psd`, `psd-vector`, `frames`, `atlas`, `atlas-exr`, `batch` and `batch-atlas`; channels reflect the selected export setting: `color`, `height`, `normal` or `rgba`. Vector contours still use transparency; the channel label does not change their extraction algorithm.

A frame ZIP or three-size ZIP counts once. Cancellation, failure, atlas-only previews and project/library ZIP saves are excluded. When clipboard access fails and falls back to a PNG download, only `download` with `png/channel` is recorded. Browsers cannot confirm that users ultimately save files to disk: the metric means completed generation and download initiation. Blocked analytics or unavailable networks can cause undercounting without affecting exports. Labels accept only these enumerations, never user names or shared URLs. Add new formats to the allowlist and regression checks together.

Analytics failures do not block startup. Visit each official site and inspect its Baidu installation check and reports. New script/report data can lag; inserting a script alone does not prove receipt. After changes run `node --test tests/site-analytics.test.mjs` and `node tests/site-analytics-browser-check.mjs` for allowlists, CSP, request origins, bounded event fields and offline isolation. Add `--real-sdk` to use the actual Baidu SDK with all analytics beacons intercepted locally, without sending test traffic/events. Run `node tests/export-analytics-browser-check.mjs` for all ten actual formats, all four channels, clipboard/fallback and cancellation/failure/preview exclusions.

`.github/workflows/pages.yml` validates, builds and deploys on pushes to `main`, with manual dispatch available. Initially select **Settings → Pages → Build and deployment → Source → GitHub Actions**. Actions results determine actual deployment status.

See [GitHub's Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) for service conditions. Visitors can access code/assets embedded in a deployed page. Personal libraries/drafts remain in each visitor's browser; remote libraries require separate deployment and CORS.

## Checks and Skill generation

```sh
npm test
npm run validate:definitions
node build-authoring-kit.mjs
npm run build:pages
node tests/pages-browser-check.mjs
node tests/startup-browser-check.mjs
```

Startup tests cover loading, successful entry, WebGL errors/details/retry and standalone editor/examples/validation views.

`skills/texture-forge-effects/` contains maintained guidance. Some authoring text and the portable CLI are generated; edit their sources and rebuild. Do not edit only embedded output.

Material preset regression: `node tests/vfx-presets-browser-check.mjs` covers transparency, serialization, two previews, edit links and transparent PNGs, with `test-results/presets/preview.png` for inspection.

Arrangement regressions: `node tests/tree-arrangement-browser-check.mjs` checks examples, three aspect ratios, expand/export consistency, persistence and filters. Also run `node tests/examples-browser-check.mjs`, adding `--standalone` after building. Normal-strength interaction: `node tests/normal-strength-browser-check.mjs`.

Node arrangements extend in `web/tree-arrangement.js`: `arrange[0]` values 13/14/15/16 mean border, alpha contour, herringbone/weave and rule tiling. `arrangeExtra` stores extension settings. Candidate `tileEdges` bitmasks use right 1, top 2, left 4, bottom 8. The scalar 59-value arrangement ABI and modes 0–12 remain compatible. Instance `opacity` and selected `childIndex` must be shared by GPU, selection and expansion.

Run browser checks appropriate to changes; Node tests do not establish WebGL visual correctness.

Puzzle checks: `node tests/puzzle-browser-check.mjs`, with `--standalone` after building. Covers 324 style/edge combinations, 36 connector pairings, independent corners, tabs, spacing, three radii, preview/export, masks/filters and slider persistence. `renderPadding` (0–0.5) hints scalar content bounds. Nodes use `boundary:clip|visible|repeat`; `web/render-bounds.js` computes logical rectangles, physical transforms and filter margins. Intermediate texture `bounds` do not alter spacing. Repeat output keeps unit periods; `periodicCopies` enumerates intersecting copies and whole layouts wrap together. Blur/Bloom/contours sample periodic textures. Natural child bounds influence copies, constrained by texture tables and a 4096-copy budget. Known formulas use conservative extents; unknown ones sample ancestor-required bounds. Image/vector/generator bodies retain resource bounds. Final canvas clips. Capture with `node tools/capture-docs.mjs puzzle`.

Tile inspection: `node tests/tile-preview-browser-check.mjs`, optionally `--standalone`, verifies 2×2/3×3/4×4 pattern counts/reference bounds, remembered presets, unchanged projects and original export dimensions.

General overflow: `node tests/overflow-browser-check.mjs`, optionally `--standalone`, covers shapes, asymmetric/multilevel children, rotated/mirrored/pivoted non-square regions, masks/inversion, blur/dilation, three instance paths, expansion/streamed export, texture-pool reuse, persistence, undo and multi-selection. Capture with `node tools/capture-docs.mjs overflow`.

Docking: `node tests/dock-workspace-browser-check.mjs`, optionally `--standalone`, covers dragging, merged tabs, floating move/resize, saved/reloaded layouts, 3D contexts and PNG export. Model/controller/styles are `web/dock-layout.js`, `web/dock-workspace.js`, `web/dock-workspace.css`. They move existing controls; layout storage stays separate from projects.

`web/dock-resize.js` keeps other separators at their drag-start coordinates so only adjacent panels absorb size changes. Minimum pane width is 96px and minimum height is 72px; existing smaller panes do not jump when a drag begins. Pointer, arrow-key and Home/End resizing share these limits, and cancellation restores every compensated ratio. Run `node tests/dock-resize-browser-check.mjs` (add `--standalone` for the static build) for four columns, four rows, mixed axes, minimums, cancellation, reload and window adaptation.

Inspector/color regression: `node tests/inspector-color-browser-check.mjs --no-screenshots`; add `--standalone` after building. It covers the merged Shape tab, inheritance and visually identical independent copies, opacity, HEX, undo, keys, multicolor stops and graphic/group controls.

Module and Bezier checks: `node tests/inspector-sections-browser-check.mjs --no-screenshots` and `node tests/bezier-editor-browser-check.mjs --no-screenshots`; add `--built` for the static site. These cover independent collapse/help, drag/arrow ordering and restored preferences, multisegment zoom/pan, point hit areas/cursors/locks, undo and export. Expansion uses `momo-texture-tree:inspector-sections:v1`; ordering uses `momo-texture-tree:inspector-module-order:v1`. Neither belongs to the project.

Node-tree regression: `node tests/node-tree-actions-browser-check.mjs`, optionally `--built`. It checks double-click/F2 renaming, Esc, row-specific deletion, native drag previews, unchanged project/undo state during preview and cancellation, release-to-confirm, one-step undo, edge reordering and cycle rejection. `web/node-drop-prompt.js` renders a pointer-transparent preview; `web/tree-selection.js` changes the model only on drop.

Use `--no-screenshots` during iteration. Regenerate manual screenshots with the tool below when documentation or screenshot updates are explicitly requested.

Built-in cards use `web/builtin-thumbnails.js`. After changing a visual formula, regenerate its thumbnail before static builds:

```sh
node tests/builtin-release-browser-check.mjs --pattern FlowingWater --parameters
npm run build:pages
```

Omit `--pattern` to regenerate all. `--parameters` also renders range endpoints. Inspect `test-results/builtin-release/gallery.png` and actual cards.

## Refresh tutorial screenshots

[tools/capture-docs.mjs](../tools/capture-docs.mjs) starts an isolated local server and Playwright context against the real UI. It builds demonstration canvases without reading the user's open browser/drafts.

```sh
node tools/capture-docs.mjs
```

Default browser is installed Edge. `DOCS_BROWSER` selects `chrome` or installed `chromium`; `DOCS_PORT` selects the isolated port. Install a browser beforehand; Playwright Chromium uses `npx playwright install chromium`.

Capture selected groups:

```sh
node tools/capture-docs.mjs workspace library combinations
node tools/capture-docs.mjs resources animation normal export remote-ai manager
node tools/capture-docs.mjs docking
node tools/capture-docs.mjs colors
node tools/capture-docs.mjs shortcuts ribbons appearance
```

| Group | Content |
| --- | --- |
| examples | Four projects through the actual Open project UI |
| combinations | 32 compositions/presets and new-arrangement category/entry |
| overflow | Three boundary modes, logical bounds and seamless halo |
| puzzle | Connector styles, body corners, tabs and grid counts |
| workspace | Overview, arrangements, composites and File |
| workspace-overview | Editor overview only |
| project-files | File menu only, framed from actual control positions |
| docking | Panel tabs, floating and saved layouts |
| colors | Opacity, color sources, gradient stops, levels/inversion and HEX in Shape |
| node-tree | Inline rename, trash icons and release-to-confirm virtual groups |
| inspector-modules | Module collapse, independent help and ordering |
| bezier-editor | Multisegment paths, expanded editing and point interaction |
| shortcuts | Node shortcuts, all-node scope menu and movable channel curves |
| ribbons | Wide-canvas folded ribbon, style presets and parameters |
| appearance | Traditional-inspired colors, appearance mode, control style, tabs, density and accent |
| library | Library, generator parameters and list |
| library-filters | All/Favorites/Recent/Animated, category multiselect and animation badge |
| parameter-states | Animation-controlled fields and Record/Base values |
| selection-editing | Multiselection, batch colors/matching parameters and alignment |
| resources | Original/processed images, formula, generator JSON and import |
| animation | Recorded keys and curves |
| normal | Height, normals and 3D lighting |
| effect | Effect backgrounds and alpha/additive comparisons |
| export | PNG, sequence/atlas settings, generated atlas and contours |
| remote-ai | Subscriptions and AI catalog |
| help | Help menu and support entry |
| presets | Material-preset category and editing entry |
| manager | Isolated demonstration directory and real manager dialogs |

[tools/docs-annotations.mjs](../tools/docs-annotations.mjs) locates actual controls for numbered boxes and synchronizes captions in the captured language. English callout copy lives in `tools/docs-callouts.en.json`. Pass `--language en` to capture the real English interface and English demonstration names, or `--language zh-CN` for Chinese (the default). For example: `node tools/capture-docs.mjs --language en workspace library`. `DOCS_LANGUAGE` is also supported. Each run updates captions only in its own edition. Annotations are injected only for capture. Hidden targets fail capture: scroll or split images instead of inventing coordinates. Recheck locations after UI changes.

Chinese screenshots live in `docs/images/`, English screenshots in `docs/images/en/`, shared examples in `docs/examples/`, temporary libraries/diagnostics in ignored `test-results/`. The manager demo uses isolated filesystem handles without opening the user's native directory picker.

Inspect rendering, parameters, captions and links after capture. Update both documentation and capture scripts when controls move; do not explain new operations using obsolete screenshots.

Capture honors reduced motion and waits for real controls and previews before annotating them. It leaves the user's browser drafts, appearance and layout untouched. Run `node tests/shortcut-appearance-browser-check.mjs`, then add `--built` after building, to check pinned controls with themes: artwork isolation, menu colors, window movement, parameter editing and undo.

## GitHub and Gitee synchronization

[GitHub](https://github.com/BreezyMomo/MomoTextureForge) is primary; [Gitee](https://gitee.com/BreezyMomo/MomoTextureForge) is the mainland mirror. Commit/merge on GitHub. Gitee mirror management uses Pull plus a GitHub push Webhook.

- Git sync includes code, docs, screenshots, `site/`, branches and tags, not issues, PRs or release attachments.
- Avoid independent commits to Gitee's main branch; mirror updates overwrite destination data.
- Inspect Gitee mirror management request/completion times and retry updates as needed. Compare full `main` SHAs.
- The dedicated fine-grained GitHub token selects only this repository, with read-only Contents/Metadata and read/write Webhooks. Keep credentials out of code/logs/docs.
- The current token expires **2027-01-19**. Renew before then and inspect Webhook delivery/mirror status. Revocation/expiry stops synchronization.

Git synchronization does not publish an editor deployment. GitHub Pages and WorkBuddy have their own deployment/update processes. You can also download `site/index.html` from Gitee and open it offline in Chrome/Edge.

## Repository structure and references

- `web/`: editor, resources and rendering; entry `tree-app.js`.
- `web/definitions/`: index, definitions, formulas and libraries.
- `library-manager/`: static local manager.
- `skills/`: authoring/effects Skills.
- `docs/`: illustrated tutorials, images and example projects.
- `tests/`: unit and browser checks.
- `site/`: deployable site; `dist/`, `test-results/` and `node_modules/` are ignored.

[Pattern definitions](../PATTERN_DEFINITIONS.en.md) · [Local library](../LOCAL_GRAPHICS_LIBRARY.en.md) · [Pack format](../RESOURCE-PACK.en.md) · [Remote libraries](../REMOTE_LIBRARIES.en.md) · [AI CLI](../AI_AUTHORING_CLI.en.md)

See [PSD-LICENSES.txt](../web/vendor/PSD-LICENSES.txt); rebuild the vendor bundle with `npm run build:psd-vendor` when required.

## Parameter variables and language

`web/parameter-metadata.js` validates identifiers/aliases. `web/language-config.json` fixes languages/native names/default at build time; `web/language.js` stores a separate preference and fallback order. `web/ui-language.js` translates explicitly declared UI messages, not arbitrary user content. Definitions use variables/aliases with unchanged ABI slots/keys/animation paths. Use roles for feather/image behavior, not labels. Legacy label-only resources are interpreted at validation/display boundaries without rewriting descriptors/hashes.

Use `parameterLabel` once; do not feed resolved aliases into UI catalogs. Alias edits affect resource hashes, language switches do not. UI catalogs live in `web/locales/zh-CN.json` and `en.json`, registered in `catalogs.js`. Use stable `uiText` IDs, `uiFormat` for interpolation and explicit HTML bindings. `messageError` retains identity/values through Worker serialization; show with `uiError`. Edit wording in language files without renaming IDs. The audit checks matching IDs/placeholders/references. `graphicLabel` resolves resource-owned names. Translate option labels, never values or selectors/conditions. User-visible language choices are build-fixed; inactive imported aliases remain preserved. English in-app help lives in `web/locales/help-en.js`. Repository documentation has separate Chinese and English Markdown editions.

Validate parameters with `node --test tests/parameter-language.test.mjs` and `node tests/parameter-language-browser-check.mjs`; add `--built` after building. Checks cover choices, invalid selection, persistence/fallback, unchanged project/undo/pixels and editor metadata.

UI coverage: audit plus `tests/ui-language.test.mjs` and source/built `tests/ui-language-browser-check.mjs`, including panels, editors, language switches, examples and 1600/1100/768 widths. Never auto-replace the entire user DOM. Register static bindings before user content mounts; translate dynamic controls at display boundaries.

### Graphic resource names

`web/graphic-name.js` validates aliases and resolves/searches pure data. `graphic-label.js` uses current language order; `graphic-name-editor.js` reuses fixed language selectors. Top-level aliases name the graphic; parameter aliases name individual controls. Default names remain required. UI catalogs do not contain `graphics.<id>.name`.

Metadata travels through authoring JSON, definitions, `graphicResource`, list entries and remote indexes. Derived image/new-formula templates must not inherit Circle's name aliases. Missing fields remain omitted; switching language never rewrites imports. Versions retain aliases; name edits are content changes. New nodes start with the resolved name, then retain their own names.

Run `tests/graphic-name.test.mjs` and source/built `tests/graphic-name-browser-check.mjs` for editing, JSON/ZIP, cross-language search, persistence, independent names and remote subscriptions.

## Chinese and English documentation

Keep Chinese `.md` files and adjacent `.en.md` editions, not a translation dictionary. Each pair has a language switch. Body links remain within the current edition; screenshots use the matching interface language, while code and example files are shared. Preserve API names, keys and formats. Update both editions together. `web/documentation-links.js` routes the detailed guide to Chinese for `zh-CN`, English for every other language, and updates immediately on selection changes. GitHub/Gitee entries open their English README in non-Chinese interfaces, retaining repository homepages for Chinese.

Skill builders include both editions and generate both parameter tables. Chinese authoring entry/guide text comes from `web/ai-authoring.js`; edit that source rather than generated copies. Run `node tools/check-docs.mjs`, `npm test`, rebuild, and check the source/static guide links in a browser. See [documentation plan](plans/bilingual-documentation.en.md).
