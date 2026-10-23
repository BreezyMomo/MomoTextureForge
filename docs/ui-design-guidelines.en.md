# Interface design rules

<!-- doc-language -->
[简体中文](ui-design-guidelines.md) · [English](ui-design-guidelines.en.md)
<!-- /doc-language -->

[Development and deployment](development.en.md) · [Quick start](01-quick-start.en.md)

These rules apply to the Momo Texture Forge editor and appearance preview. Artwork, the current object and frequently edited parameters should be easy to identify. Keep panel movement, merging, floating, resizing and saved layouts available.

## 1. Hierarchy and color

Large surfaces use low-saturation, palette-specific brightness layers for the workspace, panels, controls and overlays. Peer panels share their header treatment. Do not assign separate header colors to the graphics list, node tree and inspector. Moving a panel preserves these rules.

| Role | Use | Constraint |
| --- | --- | --- |
| Action | Clear primary actions such as Export | Do not style every clickable element as primary |
| Selection | Current nodes and selected objects | Retain a border, marker or state attribute as well |
| Navigation | Active tabs, filters and keyboard focus | Focus uses an outline, distinct from selection |
| Control | Sliders, checkboxes and value controls | Do not fill the inspector or section headings |
| Functional state | Playing, recording, keyframes and animation intervals | Keep meaning consistent across palettes, with text or icons |

Color quantity is not a quality metric. A resting interface can be restrained; emphasis belongs where users need to act, locate something or understand feedback. Artwork, thumbnails, artwork palettes and transparency checkers remain independent of interface appearance.

Themes assign colors to visible areas: workspace, peer headers, content cards, text and actions. Do not tint every layer with the same hue, and do not assign different colors to peer panels by identity or position. The palette is a starting combination, not a universal rule that primary means background. Choose readable text/background pairs and supplement states with outlines, indicators or text.

| Theme | Workspace | Peer headers | Content | Primary actions |
| --- | --- | --- | --- | --- |
| Ink & Cinnabar | Charcoal | Blue gray | Dark gray | Vermilion |
| Carbon & Gold | Neutral carbon black | Dark gray | Graphite | Warm gold |
| Moon White | Moon white | Mist green | Ivory | Ink blue |
| Celadon & Gold | Pale celadon | Jade | Warm white | Gold |
| Porcelain Moon | Moon white | Sky blue | Ivory | Porcelain blue |
| Dunhuang Minerals | Sandstone | Mineral green | Cream | Ochre |
| Lotus & Lavender | Lotus pink | Lavender | Ivory | Warm orange |

Light themes keep large backgrounds low in chroma, retain themed headers and separate cards from inputs by lightness. Panels and cards have visible outlines; input boundaries reach at least 3:1. Do not reuse dark-surface white bevels on light themes.

Each theme is one designed composition, without forced light/dark variants. Themes are selected explicitly and do not follow OS appearance. The artwork viewport keeps its independent background; surrounding tools use the theme workspace color. Preview swatches use the actual workspace/header/content tokens; judge color distribution in the real editor, not only in isolated swatches.

## 2. Component structure

- Node rows sit on the workspace surface with clear spacing. The top-level drop zone stays quiet at rest and reveals its dashed boundary and target highlight while dragging.
- Panel headers share a background; active tabs use navigation feedback. Close, float and other management actions use secondary text color.
- Parameter sections use subtle surfaces, spacing and separators. Avoid repeating frames, shadows and colored headings at every panel, section and subsection level.
- Show current graphic parameters first. Place whole-group reset and randomize actions after the parameters as secondary buttons. Keep individual reset and keyframe controls beside their values.
- Library cards emphasize the thumbnail, name and Add to canvas. Put graphics-list insertion, version and editing actions in details. Show Added as a small status instead of a large disabled button.
- Empty, error and unavailable states explain the reason or next step; color alone is insufficient.

Button weight follows responsibility: Add shape uses a filled action color, Add group uses an outline, and organization, copy, delete and visibility commands use persistent quiet text buttons. Canvas tools and timeline views share a group surface; active modes use navigation color and an underline. Snapping retains its separate toggle state. Playback uses an icon, text and a clear outline, with the time-state color while playing. Keyframe copy/delete are disabled without a selection; paste is disabled without copied content. Delete uses danger color on hover. Every action retains visible text or an accessible name and keyboard focus feedback.

## 3. Interaction states

| State | Treatment |
| --- | --- |
| Default | Neutral surface and readable text |
| Hover | Local brightness or border change without recoloring a large region |
| Keyboard focus | A visible continuous outline; never remove focus indication |
| Selected / active tab | Subtle fill, edge or underline with `aria-selected` / `aria-pressed` |
| Playback | Neutral while stopped; highlighted while playing, with Pause text and `aria-pressed` |
| Disabled | Readable and distinguishable from actionable controls |

Keyframe buttons do not inherit accents from numeric, color or checkbox rows. An unanimated property uses a neutral gray outline diamond; an animated property without a key at the current time uses a gold diamond with a center dot; a key at the current time uses a solid gold diamond. Appearance previews follow the same rules.

Information and actions must not depend solely on mouse hover. Details, keyboard operation, focus order and Escape dismissal remain available.

## 4. Layout, density and language

Adapt to the panel's available width, not only the browser viewport. Narrow inspectors put labels and sliders on separate rows; wide inspectors can align labels, sliders and values in one row. Parameter tabs stay on one row and scroll horizontally when needed. A keyboard-focused tab should move into view.

Keep the floating-window move handle separate from tabs and its resize handle below the content area. Preserve saved layouts, parameter section order, appearance and density. Visual updates must not reset these preferences.

Check both languages in the actual interface. Long English labels, narrow headers, dialog footer actions and graphic names must remain usable without overlap.

## 5. Appearance and implementation

Offer seven complete themes, nine control styles and four tab shapes. Theme changes preview first and persist only on Save; Cancel restores the previous configuration.

Use three layers: palette values → semantic roles → component variables. `web/appearance.js` derives surfaces and readable interaction colors, `web/theme-tokens.css` supplies shared semantics, and `web/palette-roles.css` maps roles to components. Headers, sections, active tabs and focus use `--ui-panel-header-bg`, `--ui-section-header-bg`, `--ui-tab-active-bg` / `--ui-tab-active-fg`, and `--ui-focus-ring`. Do not assign new color meanings through panel identity or position selectors.

Maintain structure, spacing and responsive behavior in the relevant component styles. Inspect existing rules before changing them instead of accumulating conflicting overrides. New copy uses stable localization keys in both languages.

## 6. Acceptance

Measure text contrast against the actual rendered background; normal text should reach at least 4.5:1. Passing contrast establishes readability only. Also inspect hierarchy, frame density and whether states are understandable.

- Check the default workspace, merged tabs, bottom docking and narrow/wide floating inspectors; preserve layouts and artwork data.
- Check mouse and keyboard use, selection and focus, playback states, detail actions, and appearance preview/cancel/save.
- Check all complete themes and control styles, plus all four tab shapes; previews must match real controls.
- Run `npm test`, `node tests/workspace-workflow-browser-check.mjs`, `node tests/appearance-browser-check.mjs`, `node tests/grouped-palettes-browser-check.mjs` and `node tests/ui-language-browser-check.mjs`. Add `--built` to relevant browser checks after building.
- Refresh both languages' screenshots through `tools/capture-docs.mjs`; run `node tools/check-docs.mjs`.
