# Workspace and resource management

<!-- doc-language -->
[简体中文](workspace.md) · [English](workspace.en.md)
<!-- /doc-language -->

## Main interface

- The toolbar has the editable canvas name; File (new/open/save/share), undo/redo icons, Canvas settings and Export; Graphics library and Examples; then Layout, Appearance, language, Support and Help. Hover history icons for shortcuts. Narrow windows move Canvas settings into File and Examples into the menu beside Graphics library. Help includes quick/detailed guides, two Skill ZIP downloads, and GitHub/Gitee source links. Extract Skills for a compatible AI application.
- The default has four full-height columns: Graphics, Node tree, Canvas preview, and Inspector, using approximately 13%, 10%, 59%, and 18% of the width. The canvas column holds tools and playback. The inspector offers Shape (including coloring), Transform / Layout, Animation and Composite for single or batch editing; no selection means no node settings. Existing layouts are retained; Layout → Restore default layout adopts the four-column arrangement.
- Preview actions save selection/canvas to the library, save/update list copies, and toggle solo. Similar names have different scopes.

Errors remain in the upper-right notification area until dismissed; later success messages do not replace them. Older lists with retired graphics or missing dependencies are backed up, with unreadable entries set aside and other resources restored. The notification downloads original records and currently available dependencies. This backup is not a formal resource ZIP. Do not advise clearing browser storage or replacing unavailable graphics with unrelated ones. Only newly discovered unreadable entries trigger recovery notifications; retained historical backups do not repeat old warnings after reload.

The graphics list combines All / Favorites / Recent / Animated with search and multiselect category chips, without image/formula/group filters. Categories match any selected option; All or deselecting the last option clears category filtering. Categories come from built-in and personal list entries. Star buttons toggle favorites; play icons mark animated graphics. Language changes retain filters without modifying projects or resources.

Built-ins are categorized by appearance and use, with formulas and generators together. Add Animated when only moving resources are needed. Read categories from the current catalog; do not treat old Radial, Shapes, Sigils or VFX categories as separate permanent entries. Old built-in copies, including early copies without a builtin marker, follow current categories without clearing storage, deleting copies or adding them again. Custom/imported resources retain their own categories. The search × clears the query while retaining filters; favoriting, parameter edits and filtering reuse loaded previews.

Toolbar Appearance independently controls color scheme, control style, theme, tabs and Compact/Comfortable density. Schemes include Xuanqing, Tianqing, Dunhuang, Zhusha, Zhuyue and Ouhe, or Follow control style; themes are dark, graphite, light or system. One card grid offers Standard, Refined, Minimal, Soft, Aurora, Pulse, Cinema and Candy. Tabs can follow the style or use Classic, Segmented, Pill or Underline. Style changes retain the scheme, accent, tabs and density; selecting a scheme uses its recommended accent, which can then be customized. New browsers default to Refined while existing preferences are retained. Save stores browser preferences; Cancel or Esc restores all opening settings without changing artwork or exports. Animation is green, time intervals blue, keys/favorites gold and recording red, independently of the accent. Interface transitions honor system reduced motion.

With one node selected, module header pins place controls beneath that node in the tree. The scope menu applies to all nodes, including new ones, with individual exceptions. Inapplicable modules hide; Node and graphic selection have no pin. Shortcuts share edits, keyframes and undo with the inspector. Bindings carry through preview insertion, duplication and saving/reinserting within the same browser, outside project/resource files. Full channel curves and expanded Bezier windows move by dragging their headers; arrow keys also move them, with Shift for larger steps.

## Custom panel layouts

Dock the node tree, graphics list, canvas, inspector and timeline independently. Drag a title tab to an edge for a split or center for merged tabs. Drag separators to resize.

Use ↗ or Alt-drag to float inside the page. Move with the upper-left handle, resize with the lower-right, or drag the tab back to dock. Floating does not create browser windows. Esc cancels.

× closes a tab without deleting content. Reopen through Layout. Check hidden/merged tabs when parameters/timeline seem missing. Default, animation and canvas-focused presets are provided. Timeline toggles below the preview and opens automatically for recording/new tracks.

Current layouts autosave per browser/origin. Save up to 12 named layouts, replacing matching names, then apply/delete them. They contain positions/proportions/tabs/visibility, not nodes/parameters/animation, and do not travel in projects/shares or across origins. Layout changes preserve canvas/list/undo.

Examples open editable independent canvases, with construction descriptions. Initial VFX cards show slashes, flashes, shock rings, vortices and dissolve masks. Thumbnails are static; play the opened canvas. One-shots omit loop export, vortices loop, dissolve defaults to opaque Height. Links retain duration/frames/channel/alpha. Four UI backgrounds use repeated grids and default opaque color PNGs. Edit rows/columns/colors/widths and inspect seams; enable alpha to deliver just the pattern.

## Resource scopes and versions

| Scope | Purpose | Editing/deletion |
| --- | --- | --- |
| Library | Reusable formulas/images/compositions from built-in/local/remote sources | Remote is read-only static subscription; local-original deletion affects its stored entry |
| Graphics list | Browser-persistent reusable copies across canvases | Added from library or saved manually; project changes do not clear/replace the list |
| Canvas node | Actual drawn instance | Edits do not automatically change other instances/library; list updates are explicit |

Add directly to canvas uses the card's selected version, creates an independent selected node and closes the library. Undo/redo and project dependencies are retained. It does not modify list copies. Add to graphics list separately for reuse. Remote packs download on demand.

Search/filter library names/aliases/categories/tags and sources/types. Select current results, batch-add or export selected resources. Higher-version updates are scoped, never global instance replacements. Identity has resource ID, formal version and personal revision. Explicit list updates increment personal revision; publication increments formal version and resets the publishing copy. Do not hand-edit IDs to bypass content conflicts.

Batch add shows progress and the current resource name, then saves once. Cancel keeps completed resources; unprocessed or failed items remain selected for retry. The whole addition can be undone. Batch add never confirms version updates automatically.

Create resource offers Image/Import files/Formula/Generator. Export resources includes dependencies, not just screenshots. Generator supports custom GLSL/multipass JSON. Built-in edits save copies; custom editors can update their originals. Explain deletion scopes and let the user act.

List + Add creates an instance. Thumbnail opens trial editing; Add to canvas inserts it and Return to canvas restores the old work. Updating replaces only that list copy and offers Undo update; Save as makes another entry.

Unlinked nodes offer Save to graphics; linked nodes offer update/save-as. Saving prompts for name, defaulting to canvas name for the whole canvas. Deleting a linked list entry hides update actions but retains the canvas. Undo can restore it. More → Rename changes the entry/future initial instance names, not existing nodes/library. Names are 1–80 characters; cancel changes nothing. List edits/renames persist separately with undo; unrelated canvas undo does not reset them.

## Nodes and canvas

- + Group creates a container; Wrap all in group wraps top-level content. An arranged group normally repeats its subtree, or uses one enabled direct child randomly/sequentially per point. Random repeats are allowed, seed-stable across playback/reload/export, and use the shared arrangement seed. Animated-hidden candidates retain their slots; masks are excluded. Expand retains the current selection.
- Tree ordering controls composition. Middle drops reparent; edge drops reorder. Masks affect earlier content in their group only.
- Click, Ctrl/Cmd multi-select, Shift ranges or box selection. Batch mode preserves Shape (including coloring), Transform / Layout, Animation and Composite tabs for visibility, color/opacity/stops, transform/pivot/mirror, layouts/variation, blend/contour/filters, parent timing/loops/fixed progress/animation switches. Mixed values are indicated; only changed fields overwrite. Primary-edit mode handles individual work. Matching shapes share exclusive controls; UV/polar require shapes, motion requires time-aware graphics. Parent-child selections edit only outermost nodes.
- Color edits retain untouched modes/stops; use Custom coloring before unifying fills. Presets replace stops. Equal counts allow per-stop batch changes; otherwise apply a preset or restore endpoints. Locks preserve aspect, and invalid results cancel the batch. Animation-controlled fields lock ordinary editing; Record uses each local time and Base values retains tracks. Edit keys/curves/remapping individually through the primary node. Multicolor stops do not record keys. One continuous slider gesture is one undo.
- Group coloring/contour/rule tiling require all groups; mixed selections explain disabled controls. Unify arrangement/density types first. Existing children remain; sources/candidates are not auto-created.
- Alignment uses rotated logical region bounds and selection/canvas targets. Three nodes enable equal edge gaps, fixed endpoints and overlap if space is insufficient. Cross-parent visible single-instance nodes work; hidden/replicated nodes require selecting their outer group.
- Canvas tools move/resize/rotate. Double-click groups to enter and use breadcrumbs to return. Alt-click cycles overlap, context menus list candidates. Shift locks movement/15° rotation; Alt temporarily disables snapping. Pivot/UV tools are separate.
- Ctrl/Cmd+D duplicates, Ctrl/Cmd+G groups siblings, Delete removes, Ctrl+Z undoes and Ctrl+Shift+Z redoes. Esc cancels; Space temporarily pans.
- View → Canvas background sets Transparent (checkerboard) or Solid color, with a picker and black/white presets. It persists with projects and is shared by color preview/export. Opening a complete project restores it; inserting components retains the current target background, including empty canvases. Zoom, bounds, pivots, solo and tiling remain view-only.
- Tile preview supports 2×2/3×3/4×4, enables on preset choice and remembers the count across toggles. It reveals seams without changing projects/export or repairing continuity.

Change canvas ratio with Ratio above the preview or Canvas settings, using a preset or Custom…. Width/height are proportions from 1:8 to 8:1, not export pixels. For an existing custom ratio, use the adjacent edit button or choose Custom… again; only Apply ratio commits it. Switching/resetting trial graphics, returning to the canvas and adding graphics retain the current ratio.

Below the preview are Select, Pivot, UV, Pan and Snap; the viewing group contains zoom, Reset view, View and Tile. Pan view works at Fit window and reduced zoom, including blank areas; Space temporarily pans. Reset view fits and centers, and each trial session retains its viewing offset. View contains background, node bounds and pivots; the tile arrow selects a count. Panning and viewing zoom leave nodes, UVs and keys intact; exports use the complete canvas.

Double-click a tree name or press F2 to rename; Enter saves, Esc cancels. Row trash deletes that node (including group children), with undo. A center drop on a graphic previews a virtual group and explains why ordinary nodes need a group parent. Release to confirm; move away or Esc cancels with no data/history edits. Preview overlays neither receive pointer events nor shift rows. Group centers accept direct drops, row edges reorder, and cycles are rejected.

## Shape parameters

Shape and coloring share Shape. Graphic selection/parameters, UV, opacity, node colors, levels, inversion and channel curves are collapsible modules with independent help. Drag title handles to reorder modules, or focus a handle and press the keyboard arrow keys. Expansion and order stay in this browser across nodes, languages and reloads, separately from projects, processing order and undo.

Color source is a dropdown; Color fill is a solid/value-gradient segmented control. Click the strip to add a sampled stop; drag to reposition and select to edit color, HEX or position. Keep 2–8 stops; delete, choose built-in presets, reverse the gradient or restore endpoints. HEX accepts 3/6 digits with optional #. Reverse gradient mirrors positions; node Invert changes value/height and may affect derived alpha.

The Opacity module uses 0–1 for the whole node/group and multiplies through parents. It supports Record/Base/undo/save; animated fields lock ordinary editing. There is no separate quick-color area above the tabs.

Inherited palettes name their source and can visit it or copy the currently evaluated palette locally without changing initial appearance. Child-preserving groups offer child coloring while retaining already independent children. Parent-wide recoloring remaps the composite, including independently colored children; the UI identifies that source. Original images/generators show their state; custom tint remaps luminance and need not preserve source colors.

Solid and low/high endpoint colors can be keyed. Multicolor stops cannot. Restoring two colors takes outermost stops as endpoints. Presets and stop counts edit base gradients, not color animation.

Groups offer whole/random/sequential instance content. See [Arrangement](layout-compositing.en.md) for overlap, gap, fill, aspect and expansion. Instance fit affects each item; region fit affects the whole node.

Shape selects the current/basic graphic, name/visibility and exclusive parameters. Its dropdown normally includes loaded/current graphics, not the entire catalog. Use the library when missing. Consult exported catalog metadata for current names/ranges/motion and conditional Gear/Star controls. Reset restores defaults; randomize is exploratory, not a deterministic reproduction step. Zero feather still antialiases; added feather softens explicitly. New nodes start crisp while existing resource defaults remain.

## Saving and sharing

Save project writes a canvas ZIP with dependencies; Open project restores it. Autosave is not backup. Custom/offline configurations share as project files; simple built-in configurations can use links.

The list persists independently across new/open/share/reload. Opening projects restores only canvas/dependencies, not the entire list, and project ZIPs do not back up that list. Legacy draft lists migrate only when no independent list exists; an explicitly empty independent list wins. Transfer list items by saving/exporting resources. Nothing syncs across devices/origins automatically.

Save canvas to library produces one reusable composition; selection save uses that subtree. PNG/SVG exports are delivery files, not fully editable project backups.

## Multiple remote libraries

Read [Remote libraries](remote-libraries.en.md) for subscription, downloads, offline use, merged identities, update/delete boundaries, static manager and publication. Distinguish remote index/cache, browser originals/list and the computer's managed folder.

## Filters and material preview

Composite postprocessing includes blur, Bloom, sharpening, chromatic aberration and toon levels with keys. Radii normalize to 512 pixels. Groups composite before filtering. Normal preview exposes strength, algorithm, flips, inverted height and smoothing shared with exports/packed channels. Color-image luminance supplies height even inside opaque regions. Strength/smoothing normalize to a short side of 512; sampling size affects detail, not strength scale.

Texture channels include Color/Height/Normal/Custom RGBA; preview modes include 2D canvas/3D material. 2D normals show exportable pixels; 3D normals light a neutral material, Color prints flat and Height shows grayscale. Sphere/plane/cube update with parameters, time and playback. Drag, light, roughness, metalness and repeat affect viewing only. Return to 2D for canvas tools. Preview switches do not change export content; choose Normal explicitly in Export.

## Parameter status guidance

Animation-controlled fields/reset follow tracks. Record changes edits keys now; Edit base value edits the underlying state. Leaving those modes restores evaluation. Pausing tracks/disabling node animation removes the lock.

Inactive settings retain values while dependencies are unmet: zero smoke amount, zero UV speed or disabled contours. Guidance reflects evaluated time. Contour/rule layouts indicate group requirements and explain sources/candidates.

## Effect blending preview

Effect mode displays the current sampled channel over backgrounds, usually Color. Dark/light/combined/custom backgrounds and alpha/additive/both support up to four tiles from one frame. Alpha preserves occlusion; additive adds RGB × alpha.

Playback/scrubbing/keys and inspector edits remain live; canvas/UV dragging pauses until 2D returns. Size 20–100% and brightness 0–3 are viewing controls. Reset restores dark, alpha/additive, 80% size and brightness 1. They do not persist in projects or affect node/export alpha, PNG or sequences. Confirm target-engine HDR/color space/material behavior separately.

## Parameter display language

Select Chinese/English directly in the toolbar. Codes/types/order cannot be edited by users. Selected-language aliases win, then configured order, then variables. Third-party resources can supply one language; inactive imported aliases remain preserved. Hover reveals variables. Guidance should include display names and identifiers without treating aliases as formula/key bindings. Alias editors use fixed nonduplicate selectors.

The preference also covers library, previews/export, timeline, layouts, examples and help. User project/node names/code remain untouched. Default graphic names remain data; displayed names resolve resource aliases rather than UI catalogs. Use real names, not UI IDs such as `menu.file`, when entering aliases.

Multilingual graphic names are edited beside default names with fixed choices, shared by built-ins/custom resources. Library/list/remote indexes display selected-language-first, then default, and search all aliases/IDs. JSON/ZIP preserve metadata; composition publishing/list rename support it. New nodes use the then-current display name, then persist independently.

The graphics list automatically receives all built-in graphics on first initialization. Existing browsers receive missing built-ins once on upgrade, preserving existing resources, versions and personal edits. Built-ins are deduplicated by resource identity. Later intentional removals, including an empty list, stay removed after refresh. New/open canvases continue sharing this list; initialization does not draw every built-in on the canvas.

Thumbnail grids automatically add or remove columns based on available panel width, with a minimum card width of about 120px. Widen the panel for three, four or more columns; narrow panels fall back to one. View → List remains a single column.

Node effect order is saved with the node and changes rendering, unlike inspector-module order. Use an outer group for whole-composition processing; see [layout and compositing](layout-compositing.en.md).
