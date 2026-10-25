# 11 · Custom panel layouts

<!-- doc-language -->
[简体中文](11-workspace-layout.md) · [English](11-workspace-layout.en.md)
<!-- /doc-language -->

[Manual contents](README.en.md) · [Quick start](01-quick-start.en.md)

The node tree, graphics list, canvas preview, inspector and timeline can be positioned independently. Enlarge the canvas, move parameters closer to the preview, or reserve more room for animation editing.

The default places **Graphics, Node tree, Canvas preview, and Inspector** from left to right in four full-height columns, using approximately 15%, 13%, 50%, and 22% of the width. The canvas keeps the largest area, with more room for node names and parameters. Existing current and named layouts are retained; choose **Layout → Restore default layout** to adopt the new arrangement.

## 1. Drag, split and merge tabs

![Drag tabs and separators](images/en/workspace-docking.png)

> Callouts: 1 Drag a panel title tab; 2 Drag a separator to resize; 3 Layout menu.

1. Drag a panel's title tab, such as Graphics.
2. Move it to a target panel's left, right, top or bottom edge. Release when the blue docking region and docking hint appear to create a split.
3. Move to the target's center and release on the merge-tabs hint to share its space. Click tab names to switch panels.
4. Drag a separator to resize only the panels immediately beside it; other separators stay in place. This also applies to panels stacked vertically. Resizing stops at the adjacent panels' minimum size without pushing other panels. Focus a separator and use arrow keys for small adjustments, or Home/End for the available limits. Press Esc during a drag to cancel. Resizing the browser window still scales the overall layout proportionally.

Press **Esc** to cancel dragging. Panel content, selection, parameters and canvas undo history remain intact. Dragging a panel tab differs from dragging a node in the tree.

## 2. Float, close and reopen panels

![Floating inspector inside the webpage](images/en/workspace-floating.png)

> Callouts: 1 Move with the handle; 2 Resize with the corner handle; 3 Drag the tab to dock again.

- Click **↗** to float the active tab inside the webpage, or Alt-drag its tab.
- Move a floating window with the handle on the left of its title bar, and resize it with the handle on the right of its bottom edge. Both handles have space separate from tabs and scrolling content.
- Drag its title tab onto another panel to dock or merge it again.
- **×** closes the active tab. Reopen it by checking its name in **Layout**; canvas content is retained.

Floating windows stay within the page; they do not open separate browser windows. **Animation editor & timeline** toggles the timeline. Recording or adding a track also opens it automatically.

## 3. Save a workspace

![Layout menu and named saving](images/en/workspace-layout-menu.png)

> Callouts: 1 Enter a layout name; 2 Save the current layout; 3 Reopen closed panels; 4 Restore the default layout.

1. Arrange panels, then open **Layout**.
2. Enter a name and choose **Save current layout**. Saving the same name replaces it; up to 12 named layouts are supported.
3. Select a saved name and **Apply layout**, or delete an unneeded saved layout.
4. **Restore default layout** starts over; **Resource browsing layout** enlarges the graphics list, **Animation layout** opens a separate timeline, and **Focus canvas** displays only the preview.

The current layout is remembered automatically and restored after reload. Named layouts let you switch between working arrangements.

Layouts store panel positions, proportions, tabs and visibility. Nodes, graphics, parameters, animations and project files keep their own persistence. Layouts belong to the current browser and origin: they are not stored in project ZIPs, shared with canvases or synchronized across devices. Switching layouts does not replace **File → Save project**.

## 4. Panel contents and parameter order

- Expand **Categories** to filter the graphics list; the collapsed summary retains the active selection. **View** switches between grid/list and collapses or expands graphic groups. Bottom-docked lists keep a separate scrolling thumbnail area.
- The Shape tab starts with graphic parameters and node colors. Existing custom orders are retained. **Parameter layout → Reset module order for this tab** resets only that tab, preserving panel positions, section expansion and pinned controls.
- Wide inspectors align labels, sliders, values and action buttons on one row. Narrower inspectors wrap the controls; very narrow inspectors place sliders on their own row, with values, reset and keyframe buttons below.
- **Save as resource** groups graphics-list and graphics-library actions and identifies the current selection. Project saving remains in **File**. Trial editing explains how updates affect existing instances.
- Play and scrubbing stay beneath the canvas; cycle duration, restart and node time are under **Playback settings**.

## 5. Themes, controls and density

Toolbar **Appearance** offers seven complete themes: Carbon & Gold, Ink & Cinnabar, Moon White, Celadon & Gold, Porcelain Moon, Dunhuang Minerals and Lotus & Lavender. The default Carbon & Gold uses neutral black/gray surfaces and warm gold. Themes define their own brightness without separate light/dark or system-following modes.

Control style, tab shape and Compact/Comfortable density are independent. Four custom interaction colors cover actions, selection, navigation and parameter controls. Selecting a theme restores its recommended colors; changing control style retains the theme. Preview changes, then **Save appearance** to retain them; Cancel or Esc restores all opening settings. Appearance does not change artwork colors, project data or exports and is separate for each device/origin.

Long dialogs scroll their middle content while titles, close controls and bottom actions remain reachable. Floating-panel titles and resize handles also stay separate from scrolling content. See [Interface design rules](ui-design-guidelines.en.md).
